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

// Use Claude AI to intelligently extract business data from webpage content
async function extractBusinessDataWithClaude(websiteContent: string, url: string): Promise<BusinessData> {
  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.log('No Anthropic API key found, falling back to basic extraction');
      return {};
    }
    
    console.log('Using Claude AI to extract business data from webpage...');
    
    // Clean and prepare content for Claude
    const cleanContent = websiteContent
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000); // Limit content to prevent token overflow

    const prompt = `You are an expert business data extraction specialist. Analyze the following webpage content from MULTIPLE pages of the same business website and extract structured business information.

${websiteContent.length > 8000 ? 'Website Content (truncated to fit):' : 'Website Content:'}
${cleanContent}

Please extract the following information and return it as a JSON object. If any field cannot be determined from the content, use null for that field:

{
  "business_name": "exact business name",
  "business_phone": "primary phone number in standard format",
  "business_email": "primary email address", 
  "business_address": "complete physical address including street, city, state, zip",
  "business_hours": "operating hours (e.g., Mon-Fri: 9AM-5PM, Sat: 10AM-3PM)",
  "services_offered": "list of main services/products offered",
  "pricing_structure": "pricing information, rates, or cost details if available",
  "business_description": "compelling 2-3 sentence description highlighting unique value proposition",
  "business_type": "industry category (e.g., hvac, plumbing, restaurant, retail, etc.)"
}

Guidelines:
- The content includes information from the main page, about page, services page, pricing page, and contact page
- Extract exact information from the webpages - don't make assumptions
- For business_name: use the official business name, not domain name
- For business_phone: format as (XXX) XXX-XXXX if US number
- For business_address: include full address with street, city, state, ZIP
- For business_hours: standardize format (Mon-Fri: 9AM-5PM)
- For services_offered: list 3-5 main services/products based on all pages
- For business_description: write a compelling, professional description based on the content
- For business_type: categorize into specific industry type

Return only the JSON object, no additional text.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anthropicApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      console.error('Claude API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Claude error details:', errorText);
      return {};
    }

    const result = await response.json();
    
    if (result.content && result.content[0] && result.content[0].text) {
      const extractedText = result.content[0].text.trim();
      console.log('Claude extracted text:', extractedText);
      
      try {
        // Parse the JSON response from Claude
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const businessData = JSON.parse(jsonMatch[0]);
          console.log('Successfully extracted business data with Claude:', businessData);
          return businessData;
        } else {
          console.error('No valid JSON found in Claude response');
          return {};
        }
      } catch (parseError) {
        console.error('Error parsing Claude JSON response:', parseError);
        console.error('Raw response:', extractedText);
        return {};
      }
    }
    
    return {};
  } catch (error) {
    console.error('Claude business data extraction error:', error);
    return {};
  }
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Starting Claude-powered business data extraction ===');
    
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

    // Scrape main page and important subpages
    const subpagesToScrape = [
      '', // Main page
      '/about',
      '/about-us',
      '/services',
      '/pricing',
      '/contact',
      '/our-services',
      '/what-we-do',
      '/products'
    ];

    const scrapedPages: { url: string; content: string }[] = [];
    let mainPageContent = '';

    try {
      console.log('Fetching main page and subpages...');
      
      // Normalize URL
      let baseUrl = url;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
      }
      baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash

      // Fetch each page
      for (const subpage of subpagesToScrape) {
        try {
          const pageUrl = baseUrl + subpage;
          console.log('Fetching:', pageUrl);

          const fetchResponse = await Promise.race([
            fetch(pageUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
              }
            }),
            new Promise<Response>((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 10000)
            )
          ]);

          if (fetchResponse.ok) {
            const content = await fetchResponse.text();
            
            // Extract text content and clean it
            const textContent = content
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            // Only include if we got meaningful content
            if (textContent.length > 100) {
              scrapedPages.push({
                url: pageUrl,
                content: textContent.substring(0, 5000) // Limit per page
              });
              
              // Store main page separately
              if (subpage === '') {
                mainPageContent = textContent;
              }
              
              console.log(`Successfully scraped ${pageUrl}: ${textContent.length} characters`);
            }
          } else {
            console.log(`Failed to fetch ${pageUrl}: ${fetchResponse.status}`);
          }
        } catch (pageError) {
          console.log(`Error fetching ${baseUrl + subpage}:`, pageError instanceof Error ? pageError.message : 'Unknown error');
          // Continue to next page
        }
      }

      // If we didn't get any pages
      if (scrapedPages.length === 0) {
        console.error('Failed to fetch any pages from the website');
        
        // For social media, try to provide fallback data based on URL
        if (isSocialMedia && urlBusinessName) {
          console.log('Providing fallback data for social media page');
          
          return new Response(
            JSON.stringify({ 
              success: true,
              data: {
                business_name: urlBusinessName,
                business_description: urlBusinessName + ' - Professional service provider. Contact us for more information about our services.',
                business_type: 'other',
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
            data: {}
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log(`Successfully scraped ${scrapedPages.length} pages from the website`);

      // Combine all page content for Claude analysis
      websiteContent = scrapedPages
        .map(page => `--- Page: ${page.url} ---\n${page.content}`)
        .join('\n\n');

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
              business_type: 'other', 
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
          details: fetchError instanceof Error ? fetchError.message : 'Unknown fetch error',
          data: {}
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Extract business information using Claude AI
    console.log('=== EXTRACTING BUSINESS DATA WITH CLAUDE AI ===');

    // Use Claude AI extraction for accurate structured data
    const claudeData = await extractBusinessDataWithClaude(websiteContent, url);
    
    // Merge Claude data with any existing data (e.g., from URL analysis)
    businessData = { ...businessData, ...claudeData };

    // Fallback extraction if Claude didn't capture everything
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
            console.log('Found business name (fallback):', name);
            break;
          }
        }
      }
    }

    // Fallback phone extraction if Claude missed it
    if (!businessData.business_phone) {
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
    }

    console.log('=== FINAL BUSINESS DATA ===');
    console.log(JSON.stringify(businessData, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Business data extracted successfully using Claude AI',
        data: {
          ...businessData,
          business_website: url
        },
        url: url,
        extractionMethod: 'claude-ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('=== EXTRACTION ERROR ===');
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to extract business data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});