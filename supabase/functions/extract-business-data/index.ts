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
}

// Simplified Google search for address
async function findBusinessAddress(businessName: string, domain: string): Promise<string | null> {
  try {
    console.log(`Searching Google for address: ${businessName}`);
    
    const searchQuery = `"${businessName}" address phone -site:${domain}`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    
    // Look for address patterns
    const addressRegex = /(\d+[^,\n]*(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Drive|Dr\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Way)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/i;
    const match = html.match(addressRegex);
    
    if (match && match[1]) {
      const address = match[1].trim();
      console.log('Found address from Google:', address);
      return address;
    }
    
    return null;
  } catch (error) {
    console.error('Error searching for address:', error);
    return null;
  }
}

// Generate AI description
async function generateDescription(businessData: BusinessData): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    console.log('No OpenAI key, using basic description');
    return businessData.business_description || '';
  }

  try {
    console.log('Generating AI description...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Write compelling 2-3 sentence business descriptions that highlight strengths and appeal to customers.' 
          },
          { 
            role: 'user', 
            content: `Create a professional business description for:
Business: ${businessData.business_name}
Services: ${businessData.services_offered || 'General services'}
Location: ${businessData.business_address || 'Local area'}
Current description: ${businessData.business_description || 'None'}` 
          }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const description = data.choices[0]?.message?.content?.trim();
      if (description && description.length > 20) {
        console.log('Generated description:', description);
        return description;
      }
    }
    
    return businessData.business_description || '';
  } catch (error) {
    console.error('AI description error:', error);
    return businessData.business_description || '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Starting business data extraction ===')
    
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
    
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch webpage:', response.status)
      return new Response(
        JSON.stringify({ error: `Failed to fetch webpage: ${response.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const html = await response.text()
    console.log('Webpage fetched, length:', html.length)

    // Initialize business data
    const businessData: BusinessData = {}

    // Extract business name
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
    
    if (ogTitleMatch) {
      businessData.business_name = ogTitleMatch[1].replace(/\s*[-|–]\s*(Home|About|Contact|Services).*$/i, '').trim()
    } else if (titleMatch) {
      businessData.business_name = titleMatch[1].replace(/\s*[-|–]\s*(Home|About|Contact|Services).*$/i, '').trim()
    } else if (h1Match) {
      businessData.business_name = h1Match[1].trim()
    }

    console.log('Business name:', businessData.business_name)

    // Extract phone number
    const phonePatterns = [
      /href="tel:([^"]+)"/i,
      /(\(\d{3}\)\s?\d{3}-\d{4})/,
      /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/
    ]
    
    for (const pattern of phonePatterns) {
      const match = html.match(pattern)
      if (match) {
        let phone = match[1].replace(/\D/g, '')
        if (phone.length === 11 && phone.startsWith('1')) {
          phone = phone.substring(1)
        }
        if (phone.length === 10) {
          businessData.business_phone = `(${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6)}`
          break
        }
      }
    }

    console.log('Phone:', businessData.business_phone)

    // Extract email
    const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)
    if (emailMatch) {
      const filtered = emailMatch.filter(email => 
        !email.includes('example.com') && 
        !email.includes('noreply') &&
        !email.includes('wordpress')
      )
      if (filtered.length > 0) {
        businessData.business_email = filtered[0]
      }
    }

    // Extract address from website first
    const addressPatterns = [
      /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way)[^<\n]{0,50})/i,
      /(\d+[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/i
    ]

    for (const pattern of addressPatterns) {
      const match = html.match(pattern)
      if (match) {
        const address = match[1].replace(/<[^>]*>/g, '').trim()
        if (address.length > 15 && address.length < 150) {
          businessData.business_address = address
          break
        }
      }
    }

    console.log('Address from website:', businessData.business_address)

    // If no address found, search Google
    if (!businessData.business_address && businessData.business_name) {
      console.log('No address on website, searching Google...')
      try {
        const foundAddress = await Promise.race([
          findBusinessAddress(businessData.business_name, parsedUrl.hostname),
          new Promise<string | null>((_, reject) => 
            setTimeout(() => reject(new Error('Address search timeout')), 6000)
          )
        ]);
        
        if (foundAddress) {
          businessData.business_address = foundAddress;
        }
      } catch (error) {
        console.error('Address search failed:', error.message);
      }
    }

    // Extract services
    const servicePatterns = [
      /(?:services|what we do|we offer)[^<]{20,300}/gi,
      /(?:hvac|plumbing|electrical|roofing|cleaning)[^<]{10,200}/gi,
      /(?:repair|install|maintain|service)[^<]{10,150}/gi
    ]

    let services = []
    for (const pattern of servicePatterns) {
      const matches = html.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const clean = match.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          if (clean.length > 10 && clean.length < 200) {
            services.push(clean)
          }
        })
      }
    }

    if (services.length > 0) {
      businessData.services_offered = services.slice(0, 3).join('; ')
    }

    console.log('Services:', businessData.services_offered)

    // Extract pricing
    const pricingPatterns = [
      /(?:\$\d+[^<\n]{5,100})/gi,
      /(?:starting at|from \$)[^<\n]{5,50}/gi,
      /(?:free estimate|free quote)/gi
    ]

    let pricing = []
    for (const pattern of pricingPatterns) {
      const matches = html.match(pattern)
      if (matches) {
        matches.forEach(match => {
          const clean = match.replace(/<[^>]*>/g, '').trim()
          if (clean.length > 5 && clean.length < 100) {
            pricing.push(clean)
          }
        })
      }
    }

    if (pricing.length > 0) {
      businessData.pricing_structure = pricing.slice(0, 3).join('; ')
    }

    // Extract basic description
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
    if (descMatch) {
      businessData.business_description = descMatch[1].trim()
    }

    console.log('Basic description:', businessData.business_description)

    // Generate AI description
    try {
      const aiDescription = await Promise.race([
        generateDescription(businessData),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('AI timeout')), 4000)
        )
      ]);
      
      if (aiDescription && aiDescription.length > 20) {
        businessData.business_description = aiDescription;
      }
    } catch (error) {
      console.error('AI description failed:', error.message);
    }

    console.log('=== Final business data ===')
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
    console.error('=== ERROR ===')
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