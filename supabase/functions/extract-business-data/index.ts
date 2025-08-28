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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting business data extraction...')
    
    const { url } = await req.json()
    console.log('Extracting data from URL:', url)

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Fetching webpage content...')
    
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
    console.log('Webpage fetched successfully, content length:', html.length)

    // Extract business data using regex patterns and DOM parsing
    const businessData: BusinessData = {}

    // Extract business name from title and h1 tags
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    
    if (titleMatch) {
      businessData.business_name = titleMatch[1].replace(/\s*-\s*(Home|About|Contact).*$/i, '').trim()
    } else if (h1Match) {
      businessData.business_name = h1Match[1].trim()
    }

    // Extract phone numbers
    const phonePatterns = [
      /(?:phone|tel|call)[:\s]*([+]?[\d\s\-\(\)\.]{10,})/gi,
      /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g,
      /href="tel:([^"]+)"/gi
    ]
    
    for (const pattern of phonePatterns) {
      const matches = html.matchAll(pattern)
      for (const match of matches) {
        const phone = match[1].replace(/[^\d+\-\(\)\s]/g, '').trim()
        if (phone.length >= 10) {
          businessData.business_phone = phone
          break
        }
      }
      if (businessData.business_phone) break
    }

    // Extract email addresses
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    const emailMatches = html.match(emailPattern)
    if (emailMatches) {
      // Filter out common non-business emails
      const businessEmail = emailMatches.find(email => 
        !email.includes('example.com') && 
        !email.includes('test.com') &&
        !email.includes('noreply') &&
        !email.includes('no-reply')
      )
      if (businessEmail) {
        businessData.business_email = businessEmail
      }
    }

    // Extract address using structured data or common patterns
    const addressPatterns = [
      /<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi,
      /(?:address|location)[:\s]*([^<\n]{20,100})/gi,
      /(\d+\s+[A-Za-z0-9\s,]+,\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})/gi
    ]

    for (const pattern of addressPatterns) {
      const matches = html.matchAll(pattern)
      for (const match of matches) {
        if (pattern.source.includes('application/ld+json')) {
          try {
            const jsonData = JSON.parse(match[1])
            if (jsonData.address) {
              if (typeof jsonData.address === 'string') {
                businessData.business_address = jsonData.address
              } else if (jsonData.address.streetAddress) {
                businessData.business_address = `${jsonData.address.streetAddress}, ${jsonData.address.addressLocality}, ${jsonData.address.addressRegion} ${jsonData.address.postalCode}`
              }
              break
            }
          } catch (e) {
            // Continue to next pattern
          }
        } else {
          businessData.business_address = match[1].trim()
          break
        }
      }
      if (businessData.business_address) break
    }

    // Extract business hours
    const hoursPatterns = [
      /(?:hours?|open)[:\s]*([^<\n]{10,200})/gi,
      /(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^<\n]{5,100}/gi
    ]

    for (const pattern of hoursPatterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        businessData.business_hours = matches[0].replace(/<[^>]*>/g, '').trim()
        break
      }
    }

    // Extract services using common service-related keywords
    const servicePatterns = [
      /(?:services?|what we do)[^<]{20,300}/gi,
      /(?:specializ|offer)[^<]{20,200}/gi
    ]

    for (const pattern of servicePatterns) {
      const matches = html.match(pattern)
      if (matches && matches.length > 0) {
        businessData.services_offered = matches[0].replace(/<[^>]*>/g, '').trim()
        break
      }
    }

    // Extract description from meta description or about section
    const descriptionPatterns = [
      /<meta\s+name="description"\s+content="([^"]+)"/i,
      /(?:about|description)[^<]{20,300}/gi
    ]

    for (const pattern of descriptionPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        businessData.business_description = match[1].trim()
        break
      }
    }

    console.log('Extracted business data:', businessData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: businessData,
        url: url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error extracting business data:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract business data',
        details: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})