import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BusinessData {
  business_name?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_hours?: string;
  services_offered?: string;
  pricing_structure?: string;
  business_description?: string;
  business_type?: string;
}

// Extract business name from URL patterns (for social media pages)
function extractBusinessNameFromUrl(url: string): string | null {
  try {
    // Facebook business page patterns
    const fbMatch = url.match(/facebook\.com\/(?:p\/)?([^\/\?]+)/i);
    if (fbMatch && fbMatch[1]) {
      let name = fbMatch[1]
        .replace(/-LLC-\d+/i, ' LLC')
        .replace(/-Inc-\d+/i, ' Inc')
        .replace(/-\d+$/, '')
        .replace(/[-_]/g, ' ')
        .trim();
      
      // Capitalize each word
      name = name.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
      
      return name;
    }
    
    // Instagram patterns
    const igMatch = url.match(/instagram\.com\/([^\/\?]+)/i);
    if (igMatch && igMatch[1]) {
      return igMatch[1].replace(/[._]/g, ' ').trim();
    }
    
    // LinkedIn patterns
    const liMatch = url.match(/linkedin\.com\/company\/([^\/\?]+)/i);
    if (liMatch && liMatch[1]) {
      return liMatch[1].replace(/-/g, ' ').trim();
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting business name from URL:', error);
    return null;
  }
}

// Validate address format
function validateAddress(address: string): boolean {
  if (!address || address.length < 10) return false;
  
  // Check for basic address components
  const hasNumber = /\d/.test(address);
  const hasStreetType = /\b(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|way|ct|court|pl|place|cir|circle)\b/i.test(address);
  const hasStateZip = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(address);
  
  return hasNumber && (hasStreetType || hasStateZip);
}

// Search for business data using web search
async function searchBusinessData(businessName: string, domain: string): Promise<{ address?: string; services?: string; phone?: string }> {
  const results = { address: undefined as string | undefined, services: undefined as string | undefined, phone: undefined as string | undefined };
  
  try {
    console.log('Searching for business data: ' + businessName);
    
    // Search for business information
    const searchQuery = '"' + businessName + '" address phone hours services -site:' + domain;
    const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(searchQuery);
    
    const response = await Promise.race([
      fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }),
      new Promise<Response>((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 8000)
      )
    ]);
    
    if (!response.ok) return results;
    
    const html = await response.text();
    
    // Look for addresses
    const addressPatterns = [
      /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Way|Court|Ct\.?|Place|Pl\.?)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/ig,
      /(\d+[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/ig,
      /([A-Za-z0-9\s,.-]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Way)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2})/ig
    ];
    
    for (const pattern of addressPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanAddress = match.replace(/<[^>]*>/g, '').trim();
          if (validateAddress(cleanAddress) && cleanAddress.length < 200) {
            results.address = cleanAddress;
            console.log('Found valid address:', cleanAddress);
            break;
          }
        }
        if (results.address) break;
      }
    }
    
    // Look for phone numbers
    const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phoneMatches = html.match(phonePattern);
    if (phoneMatches && phoneMatches.length > 0) {
      results.phone = phoneMatches[0];
    }
    
    return results;
  } catch (error) {
    console.error('Error searching business data:', error);
    return results;
  }
}

// Parse services from HTML content
function parseServices(html: string): string[] {
  const services: string[] = [];
  
  // Service-related keywords by category
  const servicePatterns = [
    // HVAC & Home Services (more comprehensive)
    /(?:air conditioning|hvac|heating|cooling|ac repair|furnace|ductwork|heat pump|central air|mini split|thermostat|air handler|refrigeration)/gi,
    // Construction & Trades
    /(?:plumbing|electrical|roofing|flooring|painting|carpentry|renovation|contracting|installation)/gi,
    // Professional Services
    /(?:consulting|accounting|legal|marketing|design|development|tax preparation|business services)/gi,
    // Automotive
    /(?:auto repair|mechanic|tire|brake|transmission|oil change|car service|vehicle maintenance)/gi,
    // Healthcare
    /(?:dental|medical|physical therapy|massage|chiropractic|health services|wellness)/gi,
    // Cleaning Services
    /(?:cleaning|janitorial|housekeeping|carpet cleaning|pressure washing|maintenance)/gi
  ];
  
  // Look for services in specific HTML sections
  const sectionPatterns = [
    /<(?:section|div)[^>]*(?:service|offer|what-we-do)[^>]*>(.*?)<\/(?:section|div)>/gis,
    /<ul[^>]*(?:service|menu)[^>]*>(.*?)<\/ul>/gis,
    /<li[^>]*>(.*?)(?:service|repair|install|maintain)(.*?)<\/li>/gis
  ];
  
  sectionPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
      matches.forEach(match => {
        servicePatterns.forEach(servicePattern => {
          const serviceMatches = match.match(servicePattern);
          if (serviceMatches) {
            services.push(...serviceMatches.map(s => s.toLowerCase()));
          }
        });
      });
    }
  });
  
  // Direct pattern matching in full HTML
  servicePatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
      services.push(...matches.map(s => s.toLowerCase()));
    }
  });
  
  // Remove duplicates and clean up
  const uniqueServices = [...new Set(services)]
    .map(service => service.trim())
    .filter(service => service.length > 2)
    .slice(0, 10); // Limit to 10 services
  
  return uniqueServices;
}

// Generate AI description using Perplexity
async function generateAIDescription(businessData: BusinessData, websiteContent: string, url: string): Promise<string> {
  try {
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      console.log('No Perplexity API key found, skipping AI description generation');
      return businessData.business_description || '';
    }
    
    console.log('Generating AI description using Perplexity...');
    
    // Create a comprehensive prompt for the AI
    const businessName = businessData.business_name || 'Business';
    const services = businessData.services_offered || 'various services';
    const location = businessData.business_address || 'local area';
    
    const prompt = 'Based on the following business information, write a professional 2-3 sentence business description for ' + businessName + 
      '. Services: ' + services + 
      '. Location: ' + location + 
      '. Website content snippet: ' + websiteContent.substring(0, 500) + 
      '. Make it sound professional and engaging for potential customers. Focus on what makes this business unique and trustworthy.';
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + perplexityApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a professional business description writer. Write concise, compelling descriptions that highlight key services and build trust.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        top_p: 0.9,
        return_images: false,
        return_related_questions: false,
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });
    
    if (!response.ok) {
      console.error('Perplexity API error:', response.status, response.statusText);
      return businessData.business_description || '';
    }
    
    const result = await response.json();
    
    if (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
      const aiDescription = result.choices[0].message.content.trim();
      console.log('Generated AI description:', aiDescription);
      return aiDescription;
    }
    
    return businessData.business_description || '';
  } catch (error) {
    console.error('Perplexity AI description generation error:', error);
    return businessData.business_description || '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting enhanced business data extraction ===');
    
    const { url } = await req.json();
    console.log('URL:', url);

    if (!url) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'URL is required',
          data: {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let websiteContent = '';
    let businessData: BusinessData = {};
    let isSocialMedia = false;
    
    // Check if it's a social media URL
    const socialMediaDomains = ['facebook.com', 'instagram.com', 'linkedin.com', 'twitter.com', 'tiktok.com'];
    isSocialMedia = socialMediaDomains.some(domain => url.toLowerCase().includes(domain));
    
    console.log('Is social media:', isSocialMedia);
    
    // Extract business name from URL if it's social media
    let urlBusinessName = null;
    if (isSocialMedia) {
      urlBusinessName = extractBusinessNameFromUrl(url);
      console.log('Extracted business name from URL:', urlBusinessName);
      if (urlBusinessName) {
        businessData.business_name = urlBusinessName;
      }
    }

    // Attempt to fetch webpage content
    try {
      console.log('Fetching webpage content...');
      
      const fetchResponse = await Promise.race([
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          }
        }),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 15000)
        )
      ]);

      if (!fetchResponse.ok) {
        console.error('Failed to fetch webpage:', fetchResponse.status, fetchResponse.statusText);
        
        // Provide specific error messages for different status codes
        let errorMessage = 'Failed to fetch webpage (' + fetchResponse.status + ')';
        if (fetchResponse.status === 403) {
          errorMessage = isSocialMedia 
            ? 'Access denied. Social media pages often restrict automated access. Try using the business website instead.'
            : 'Access denied. The website is blocking automated requests.';
        } else if (fetchResponse.status === 404) {
          errorMessage = 'Page not found. Please check the URL is correct.';
        } else if (fetchResponse.status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
        } else if (fetchResponse.status >= 500) {
          errorMessage = 'Server error. The website might be temporarily unavailable.';
        }
        
        // For social media, try to provide fallback data based on URL
        if (isSocialMedia && urlBusinessName) {
          console.log('Providing fallback data for social media page');
          
          return new Response(
            JSON.stringify({ 
              success: true,
              data: {
                business_name: urlBusinessName,
                business_description: urlBusinessName + ' - Professional service provider. Contact us for more information about our services.',
                business_type: 'Local Business',
                services_offered: 'Professional Services',
                source: 'URL Analysis (Limited Access)',
                note: 'Limited information available due to social media access restrictions. Please provide the business website for complete details.'
              },
              source: 'social_media_fallback',
              url: url
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Unable to access webpage. ' + (isSocialMedia ? 'Social media pages often restrict automated access. Try using the business website instead.' : 'Please check the URL and try again.'),
            details: errorMessage,
            suggestions: isSocialMedia 
              ? ['Try using the business\'s main website instead', 'Check if the social media page is public', 'Verify the URL is correct']
              : ['Verify the URL is correct', 'Check if the website is accessible', 'Try again later if the site is temporarily down'],
            data: {}
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      websiteContent = await fetchResponse.text();
      console.log('Successfully fetched webpage content. Length:', websiteContent.length);

    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      // For social media, provide fallback data
      if (isSocialMedia && urlBusinessName) {
        console.log('Providing fallback data for social media page due to fetch error');
        
        return new Response(
          JSON.stringify({ 
            success: true,
            data: {
              business_name: urlBusinessName,
              business_description: urlBusinessName + ' - Professional service provider. Contact us for more information about our services.',
              business_type: 'Local Business', 
              services_offered: 'Professional Services',
              source: 'URL Analysis (Connection Failed)',
              note: 'Unable to access the social media page. Please provide the business website for complete details.'
            },
            source: 'social_media_fallback',
            url: url
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unable to connect to webpage',
          details: fetchError.message,
          suggestions: ['Check your internet connection', 'Verify the URL is correct', 'Try again later'],
          data: {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract business information from the content
    console.log('=== EXTRACTING BUSINESS DATA ===');

    // Extract business name
    if (!businessData.business_name) {
      const namePatterns = [
        /<title[^>]*>([^<]+)<\/title>/i,
        /<h1[^>]*>([^<]+)<\/h1>/i,
        /<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i,
        /<meta[^>]*name="application-name"[^>]*content="([^"]+)"/i
      ];

      for (const pattern of namePatterns) {
        const match = websiteContent.match(pattern);
        if (match && match[1]) {
          let name = match[1].trim();
          name = name.replace(/\s+/g, ' ');
          name = name.replace(/\s*[-|]\s*.*$/, '');
          
          if (name.length > 3 && name.length < 100 && !name.toLowerCase().includes('home')) {
            businessData.business_name = name;
            console.log('Found business name:', name);
            break;
          }
        }
      }
    }

    // Extract phone numbers with better formatting
    const phonePatterns = [
      /(?:phone|call|tel|contact)[\s:]*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/gi,
      /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g
    ];

    for (const pattern of phonePatterns) {
      const matches = websiteContent.match(pattern);
      if (matches) {
        for (const match of matches) {
          let phone = match.replace(/[^\d]/g, '');
          if (phone.length === 11 && phone.startsWith('1')) {
            phone = phone.substring(1);
          }
          if (phone.length === 10) {
            businessData.business_phone = '(' + phone.substring(0,3) + ') ' + phone.substring(3,6) + '-' + phone.substring(6);
            break;
          }
        }
        if (businessData.business_phone) break;
      }
    }

    // Extract business addresses directly from webpage content
    const addressPatterns = [
      // Complete address with street, city, state, zip
      /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Way|Court|Ct\.?|Place|Pl\.?)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi,
      // Address with just street and state/zip
      /(\d+[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi,
      // Address in structured format (span, div, etc.)
      /<(?:span|div|p)[^>]*(?:address|location)[^>]*>([^<]*\d+[^<]*(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard)[^<]*)<\/(?:span|div|p)>/gi,
      // Schema.org address markup
      /<[^>]*itemprop="(?:address|streetAddress)"[^>]*>([^<]+)<\/[^>]*>/gi
    ];

    for (const pattern of addressPatterns) {
      const matches = websiteContent.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanAddress = match.replace(/<[^>]*>/g, '').trim();
          if (validateAddress(cleanAddress) && cleanAddress.length < 200) {
            businessData.business_address = cleanAddress;
            console.log('Found address from website:', cleanAddress);
            break;
          }
        }
        if (businessData.business_address) break;
      }
    }

    // Extract email addresses
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = websiteContent.match(emailPattern);
    if (emailMatches) {
      const validEmails = emailMatches.filter(email => 
        !email.includes('example.com') && 
        !email.includes('test.com') &&
        !email.includes('placeholder')
      );
      if (validEmails.length > 0) {
        businessData.business_email = validEmails[0];
      }
    }

    // Extract business hours
    const hoursPattern = /(?:hours|open|closed)[\s\S]{0,200}?(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)[\s\S]{0,300}?(?:\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm))/gi;
    const hoursMatch = websiteContent.match(hoursPattern);
    if (hoursMatch) {
      const hours = hoursMatch[0].replace(/<[^>]*>/g, '').trim();
      if (hours.length < 500) {
        businessData.business_hours = hours;
      }
    }

    // Extract services
    const services = parseServices(websiteContent);
    if (services.length > 0) {
      businessData.services_offered = services.join(', ');
    }

    // Extract business description
    const descriptionPatterns = [
      /<meta[^>]*name="description"[^>]*content="([^"]+)"/i,
      /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i,
      /<p[^>]*class="[^"]*(?:description|about|intro)[^"]*"[^>]*>([^<]+)<\/p>/i
    ];

    for (const pattern of descriptionPatterns) {
      const match = websiteContent.match(pattern);
      if (match && match[1]) {
        const description = match[1].trim();
        if (description.length > 20 && description.length < 500) {
          businessData.business_description = description;
          break;
        }
      }
    }

    // Try to search for additional business data if we have a business name but missing key info
    const domain = new URL(url).hostname;
    if (businessData.business_name && (!businessData.business_address || !businessData.business_phone)) {
      console.log('Searching for additional business data...');
      const searchResults = await searchBusinessData(businessData.business_name, domain);
      
      if (!businessData.business_address && searchResults.address) {
        businessData.business_address = searchResults.address;
      }
      if (!businessData.business_phone && searchResults.phone) {
        businessData.business_phone = searchResults.phone;
      }
      if (!businessData.services_offered && searchResults.services) {
        businessData.services_offered = searchResults.services;
      }
    }

    // Generate AI-enhanced description if we have Perplexity API access
    if (businessData.business_name) {
      const aiDescription = await generateAIDescription(businessData, websiteContent, url);
      if (aiDescription && aiDescription.length > (businessData.business_description?.length || 0)) {
        businessData.business_description = aiDescription;
      }
    }

    // Determine business type based on content
    const businessTypeKeywords = {
      'HVAC': /hvac|heating|cooling|air conditioning|ac repair|furnace|ductwork|air handler|heat pump/gi,
      'Construction': /construction|contractor|building|remodeling|renovation/gi,
      'Plumbing': /plumber|plumbing|pipe|drain|water heater|sewer/gi,
      'Electrical': /electrician|electrical|wiring|electric|power/gi,
      'Restaurant': /restaurant|food|dining|menu|eat|cuisine/gi,
      'Retail': /store|shop|buy|sell|retail|merchandise/gi,
      'Automotive': /auto|car|vehicle|mechanic|tire|brake|transmission/gi,
      'Healthcare': /medical|health|doctor|clinic|dental|physician/gi,
      'Professional': /law|legal|accounting|consulting|professional/gi,
      'Real Estate': /real estate|property|homes|realtor|mortgage/gi,
      'Beauty': /salon|spa|beauty|hair|nail|massage/gi,
      'Fitness': /gym|fitness|workout|personal training|yoga/gi,
      'Education': /school|education|training|classes|tutoring/gi,
      'Service': /service|repair|maintenance|cleaning/gi
    };

    for (const [type, pattern] of Object.entries(businessTypeKeywords)) {
      if (pattern.test(websiteContent)) {
        businessData.business_type = type;
        break;
      }
    }

    if (!businessData.business_type) {
      businessData.business_type = 'Local Business';
    }

    console.log('=== FINAL BUSINESS DATA ===');
    console.log(JSON.stringify(businessData, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true,
        data: businessData,
        url: url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== EXTRACTION ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to extract business data',
        details: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});