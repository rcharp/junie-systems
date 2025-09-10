import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BusinessData {
  business_name?: string
  business_phone?: string
  business_email?: string
  business_address?: string
  business_hours?: string
  services_offered?: string
  pricing_structure?: string
  business_description?: string
  business_type?: string
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

// Enhanced address validation
function validateAddress(address: string): boolean {
  if (!address || address.length < 10) return false;
  
  // Check for common address patterns
  const hasNumber = /\d/.test(address);
  const hasStreetType = /\b(?:st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|way|ct|court|pl|place|cir|circle)\b/i.test(address);
  const hasStateZip = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(address);
  
  return hasNumber && (hasStreetType || hasStateZip);
}

// Enhanced Google search for business data
async function searchBusinessData(businessName: string, domain: string): Promise<{ address?: string; services?: string; phone?: string }> {
  const results = { address: undefined as string | undefined, services: undefined as string | undefined, phone: undefined as string | undefined };
  
  try {
    console.log(`Searching for business data: ${businessName}`);
    
    // Search for address and contact info
    const searchQuery = `"${businessName}" address phone hours services -site:${domain}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
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
    
    // Extract address with better patterns
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
    
    // Extract phone if not found
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

// Enhanced services parsing
function parseServices(html: string): string[] {
  const services: string[] = [];
  
  // Common service keywords and patterns
  const servicePatterns = [
    // HVAC specific
    /(?:air conditioning|hvac|heating|cooling|ac repair|furnace|ductwork)/gi,
    // Home services
    /(?:plumbing|electrical|roofing|flooring|painting|carpentry|renovation)/gi,
    // Professional services
    /(?:consulting|accounting|legal|marketing|design|development)/gi,
    // Automotive
    /(?:auto repair|mechanic|tire|brake|transmission|oil change)/gi,
    // Health services
    /(?:dental|medical|physical therapy|massage|chiropractic)/gi
  ];
  
  // Extract from service-related sections
  const sectionPatterns = [
    /<(?:section|div)[^>]*(?:service|offer|what-we-do)[^>]*>(.*?)<\/(?:section|div)>/gis,
    /<ul[^>]*(?:service|menu)[^>]*>(.*?)<\/ul>/gis,
    /<li[^>]*>(.*?)(?:service|repair|install|maintain)(.*?)<\/li>/gis
  ];
  
  sectionPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const text = match.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        servicePatterns.forEach(servicePattern => {
          const serviceMatches = text.match(servicePattern);
          if (serviceMatches) {
            serviceMatches.forEach(service => {
              const cleanService = service.trim().toLowerCase();
              if (cleanService.length > 2 && cleanService.length < 50) {
                services.push(cleanService);
              }
            });
          }
        });
      });
    }
  });
  
  // Remove duplicates and return unique services
  return [...new Set(services)];
}

// Enhanced pricing extraction
function extractPricing(html: string): string[] {
  const pricing: string[] = [];
  
  const pricingPatterns = [
    /\$\d+(?:\.\d{2})?(?:\s*-\s*\$\d+(?:\.\d{2})?)?(?:\s*(?:per|\/)\s*\w+)?/gi,
    /(?:starting\s+(?:at|from)|from|as\s+low\s+as)\s*\$\d+/gi,
    /free\s+(?:estimate|quote|consultation|inspection)/gi,
    /\d+%\s+off/gi,
    /(?:call|contact)\s+for\s+(?:pricing|quote|estimate)/gi
  ];
  
  pricingPatterns.forEach(pattern => {
    const matches = html.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanPrice = match.replace(/<[^>]*>/g, '').trim();
        if (cleanPrice.length > 3 && cleanPrice.length < 100) {
          pricing.push(cleanPrice);
        }
      });
    }
  });
  
  return [...new Set(pricing)];
}

// Generate AI description with business context using Perplexity
async function generateDescription(businessData: BusinessData): Promise<string> {
  const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
  
  if (!perplexityApiKey) {
    console.log('No Perplexity API key available for AI description');
    return businessData.business_description || '';
  }

  try {
    console.log('Calling Perplexity API for description generation...');
    
    const prompt = `Create a compelling, professional business description (2-3 sentences) for:

Business Name: ${businessData.business_name || 'Local Business'}
Services: ${businessData.services_offered || 'Professional services'}
Location: ${businessData.business_address || 'Local area'}
Business Type: ${businessData.business_type || 'Service business'}

Make it customer-focused, highlight unique value, and sound professional. Focus on benefits to customers.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional marketing copywriter who creates compelling business descriptions that attract customers. Write in a clear, engaging style that highlights what makes the business special. Keep responses concise and professional. Focus on unique value propositions and customer benefits.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.3,
        top_p: 0.9,
        frequency_penalty: 1,
        presence_penalty: 0,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month'
      }),
    });

    console.log('Perplexity API response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      const description = data.choices[0]?.message?.content?.trim();
      
      if (description && description.length > 20) {
        console.log('Generated AI description with Perplexity:', description);
        return description;
      } else {
        console.log('Perplexity response too short or empty');
      }
    } else {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
    }
    
    return businessData.business_description || '';
  } catch (error) {
    console.error('Perplexity AI description generation error:', error);
    return businessData.business_description || '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Starting enhanced business data extraction ===')
    
    const { url } = await req.json()
    console.log('URL:', url)

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate URL
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Fetching webpage...')
    
    // Check if it's a social media URL that might need special handling
    const isSocialMedia = /facebook\.com|instagram\.com|twitter\.com|linkedin\.com|yelp\.com/i.test(url);
    
    // Enhanced headers for better compatibility
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    // Add additional headers for Facebook and social media
    if (isSocialMedia) {
      console.log('Detected social media URL, using enhanced headers');
      headers['Referer'] = 'https://www.google.com/';
      headers['Sec-Ch-Ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
      headers['Sec-Ch-Ua-Mobile'] = '?0';
      headers['Sec-Ch-Ua-Platform'] = '"Windows"';
    }
    
    // Fetch the webpage with timeout and better error handling
    let response;
    try {
      response = await Promise.race([
        fetch(url, { headers }),
        new Promise<Response>((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout after 15 seconds')), 15000)
        )
      ]);
    } catch (fetchError) {
      console.error('Initial fetch failed:', fetchError);
      
      // For social media pages, try to extract business name from URL and search for info
      if (isSocialMedia) {
        console.log('Social media page fetch failed, trying to extract info from URL...');
        const urlBusinessName = extractBusinessNameFromUrl(url);
        if (urlBusinessName) {
          console.log('Extracted business name from URL:', urlBusinessName);
          const searchResults = await searchBusinessData(urlBusinessName, parsedUrl.hostname);
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              data: {
                business_name: urlBusinessName,
                business_address: searchResults.address,
                business_phone: searchResults.phone,
                business_description: `${urlBusinessName} - Professional services provider`,
                business_website: url
              },
              url: url,
              note: 'Data extracted from URL pattern and external search due to page access restrictions'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: `Unable to access webpage. ${isSocialMedia ? 'Social media pages often restrict automated access. Try using the business website instead.' : 'Please check the URL and try again.'}`,
          details: fetchError.message 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!response.ok) {
      console.error('Failed to fetch webpage:', response.status, response.statusText)
      
      // Provide specific error messages for different status codes
      let errorMessage = `Failed to fetch webpage (${response.status})`;
      if (response.status === 403) {
        errorMessage = isSocialMedia 
          ? 'Access denied. Social media pages often restrict automated access. Try using the business website instead.'
          : 'Access denied. The website may have restrictions.';
      } else if (response.status === 404) {
        errorMessage = 'Page not found. Please check the URL and try again.';
      } else if (response.status >= 500) {
        errorMessage = 'Website server error. Please try again later.';
      }
      
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const html = await response.text()
    console.log('Webpage fetched successfully, length:', html.length)

    // Initialize business data
    const businessData: BusinessData = {}

    // Extract business name with better cleaning
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
    
    let businessName = '';
    if (ogTitleMatch) {
      businessName = ogTitleMatch[1];
    } else if (titleMatch) {
      businessName = titleMatch[1];
    } else if (h1Match) {
      businessName = h1Match[1];
    }
    
    // Enhanced business name cleaning
    if (businessName) {
      businessData.business_name = businessName
        .replace(/\s*[-|–]\s*(Home|About|Contact|Services|Welcome|HVAC Services).*$/i, '')
        .replace(/\s*\|\s*.*$/, '')
        .replace(/\s*-\s*.*HVAC.*$/i, '')
        .replace(/\s*-\s*.*Services.*$/i, '')
        .replace(/AC Repair\s+([A-Z][a-z]+\s+[A-Z]{2})\s*-.*/, 'AC Repair $1')
        .trim();
    }

    console.log('Business name:', businessData.business_name)

    // Enhanced phone extraction
    const phonePatterns = [
      /href="tel:([^"]+)"/gi,
      /(?:phone|call|tel)[^:]*:?\s*(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/gi,
      /(?:phone|call|tel)[^:]*:?\s*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/gi,
      /(\(\d{3}\)\s?\d{3}[-.\s]?\d{4})/g,
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g
    ]
    
    for (const pattern of phonePatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          let phone = match.replace(/[^\d]/g, '');
          if (phone.length === 11 && phone.startsWith('1')) {
            phone = phone.substring(1);
          }
          if (phone.length === 10) {
            businessData.business_phone = `(${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6)}`;
            break;
          }
        }
        if (businessData.business_phone) break;
      }
    }

    console.log('Phone:', businessData.business_phone)

    // Enhanced email extraction
    const emailMatches = html.match(/(?:mailto:|email)[^"]*"?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi) ||
                        html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    
    if (emailMatches) {
      const filtered = emailMatches
        .map(email => email.replace(/.*?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}).*/, '$1'))
        .filter(email => 
          !email.includes('example.com') && 
          !email.includes('noreply') &&
          !email.includes('wordpress') &&
          !email.includes('wixpress') &&
          !email.includes('google')
        );
      if (filtered.length > 0) {
        businessData.business_email = filtered[0];
      }
    }

    // Enhanced address extraction from website
    const addressPatterns = [
      /(?:address|location)[^:]*:?\s*(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Way)[^<\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi,
      /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Way)[^<\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi,
      /(\d+[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/gi
    ];

    for (const pattern of addressPatterns) {
      const matches = html.match(pattern);
      if (matches) {
        for (const match of matches) {
          let address = match.replace(/<[^>]*>/g, '').replace(/.*?(\d+.*)/, '$1').trim();
          
          // Clean up common prefixes and formatting issues
          address = address
            .replace(/^ADDRESS\s*\n?\s*/i, '')
            .replace(/^address\s*[:\-]?\s*/i, '')
            .replace(/^\s*\n\s*/, '')
            .trim();
          
          if (validateAddress(address) && address.length < 200) {
            businessData.business_address = address;
            console.log('Found address on website:', address);
            break;
          }
        }
        if (businessData.business_address) break;
      }
    }

    // If no address found on website, search Google
    if (!businessData.business_address && businessData.business_name) {
      console.log('Searching external sources for address...');
      try {
        const searchResults = await searchBusinessData(businessData.business_name, parsedUrl.hostname);
        if (searchResults.address) {
          businessData.business_address = searchResults.address;
        }
        if (!businessData.business_phone && searchResults.phone) {
          businessData.business_phone = searchResults.phone;
        }
      } catch (error) {
        console.error('External search failed:', error);
      }
    }

    console.log('Final address:', businessData.business_address)

    // Enhanced service extraction
    const extractedServices = parseServices(html);
    if (extractedServices.length > 0) {
      // Capitalize and format services properly
      const formattedServices = extractedServices
        .slice(0, 5)
        .map(service => service.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' '));
      businessData.services_offered = formattedServices.join(', ');
    }

    console.log('Services:', businessData.services_offered)

    // Enhanced pricing extraction
    const extractedPricing = extractPricing(html);
    if (extractedPricing.length > 0) {
      businessData.pricing_structure = extractedPricing.slice(0, 3).join('; ');
    }

    console.log('Pricing:', businessData.pricing_structure)

    // Extract business type
    const businessTypePatterns = [
      /(?:we are|we're)\s+(a|an)\s+([^<.]{3,30})\s+(?:company|business|service)/gi,
      /(?:hvac|plumbing|electrical|roofing|cleaning|dental|medical|legal|auto)/gi
    ];

    for (const pattern of businessTypePatterns) {
      const match = html.match(pattern);
      if (match) {
        businessData.business_type = match[0].replace(/<[^>]*>/g, '').trim();
        break;
      }
    }

    // Extract basic description from meta
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                     html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
    if (descMatch) {
      businessData.business_description = descMatch[1].trim();
    }

    console.log('Basic description:', businessData.business_description)

    // Generate AI-powered description with better error handling
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (businessData.business_name && perplexityApiKey) {
      try {
        console.log('Generating AI description with Perplexity...');
        const aiDescription = await Promise.race([
          generateDescription(businessData),
          new Promise<string>((_, reject) => 
            setTimeout(() => reject(new Error('AI timeout')), 8000)
          )
        ]);
        
        if (aiDescription && aiDescription.length > 20 && aiDescription !== businessData.business_description) {
          businessData.business_description = aiDescription;
          console.log('AI description generated successfully:', aiDescription);
        } else {
          console.log('AI description not improved, keeping original');
        }
      } catch (error) {
        console.error('AI description failed:', error);
        // Keep the basic description if AI fails
      }
    } else {
      console.log('Skipping AI description - missing business name or Perplexity key');
    }

    console.log('=== Final enhanced business data ===')
    console.log(JSON.stringify(businessData, null, 2))

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: businessData,
        url: url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('=== EXTRACTION ERROR ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to extract business data',
        details: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})