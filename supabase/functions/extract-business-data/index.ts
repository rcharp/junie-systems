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

    // First try to extract structured data (JSON-LD)
    const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi)
    let structuredData: any = null
    
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1])
        if (data['@type'] === 'LocalBusiness' || data['@type'] === 'Organization' || data.name) {
          structuredData = data
          break
        }
      } catch (e) {
        // Continue to next JSON-LD block
      }
    }

    // Extract business name with priority order
    if (structuredData?.name) {
      businessData.business_name = structuredData.name
    } else {
      // Try meta property first
      const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      
      if (ogTitleMatch) {
        businessData.business_name = ogTitleMatch[1].replace(/\s*[-|–]\s*(Home|About|Contact|Services).*$/i, '').trim()
      } else if (titleMatch) {
        businessData.business_name = titleMatch[1].replace(/\s*[-|–]\s*(Home|About|Contact|Services).*$/i, '').trim()
      } else if (h1Match) {
        businessData.business_name = h1Match[1].trim()
      }
    }

    // Extract phone numbers with structured data priority
    if (structuredData?.telephone) {
      businessData.business_phone = structuredData.telephone
    } else {
      const phonePatterns = [
        /href="tel:([^"]+)"/gi,
        /(?:phone|tel|call)[:\s]*([+]?[\d\s\-\(\)\.]{10,})/gi,
        /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g,
        /(\(\d{3}\)\s?\d{3}-\d{4})/g,
        /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g
      ]
      
      for (const pattern of phonePatterns) {
        const matches = html.matchAll(pattern)
        for (const match of matches) {
          let phone = match[1].replace(/[^\d+\-\(\)\s]/g, '').trim()
          // Clean up phone format
          phone = phone.replace(/\D/g, '')
          if (phone.length === 11 && phone.startsWith('1')) {
            phone = phone.substring(1)
          }
          if (phone.length === 10) {
            businessData.business_phone = `(${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6)}`
            break
          }
        }
        if (businessData.business_phone) break
      }
    }

    // Extract email addresses with structured data priority
    if (structuredData?.email) {
      businessData.business_email = structuredData.email
    } else {
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
      const emailMatches = html.match(emailPattern)
      if (emailMatches) {
        // Filter out common non-business emails and prioritize contact/info emails
        const prioritizedEmails = emailMatches.filter(email => 
          !email.includes('example.com') && 
          !email.includes('test.com') &&
          !email.includes('noreply') &&
          !email.includes('no-reply') &&
          !email.includes('wordpress') &&
          !email.includes('admin@')
        ).sort((a, b) => {
          // Prioritize contact, info, hello emails
          const priority = ['contact', 'info', 'hello', 'support']
          const aScore = priority.findIndex(p => a.toLowerCase().includes(p))
          const bScore = priority.findIndex(p => b.toLowerCase().includes(p))
          return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore)
        })
        
        if (prioritizedEmails.length > 0) {
          businessData.business_email = prioritizedEmails[0]
        }
      }
    }

    // Extract address with structured data priority
    if (structuredData?.address) {
      if (typeof structuredData.address === 'string') {
        businessData.business_address = structuredData.address
      } else if (structuredData.address.streetAddress) {
        const addr = structuredData.address
        businessData.business_address = [
          addr.streetAddress,
          addr.addressLocality,
          addr.addressRegion,
          addr.postalCode
        ].filter(Boolean).join(', ')
      }
    } else {
      // Try to find address in various formats
      const addressPatterns = [
        /(?:address|location)[:\s]*([^<\n]{20,150})/gi,
        /(\d+\s+[A-Za-z0-9\s,.-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Circle|Cir|Court|Ct|Place|Pl)[^<\n]{0,50})/gi,
        /(\d+\s+[A-Za-z0-9\s,.-]+,\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5})/gi
      ]

      for (const pattern of addressPatterns) {
        const matches = html.matchAll(pattern)
        for (const match of matches) {
          let address = match[1].trim()
          // Clean up common HTML artifacts
          address = address.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          if (address.length > 15 && address.length < 200) {
            businessData.business_address = address
            break
          }
        }
        if (businessData.business_address) break
      }
    }

    // Extract business hours with structured data priority
    if (structuredData?.openingHours || structuredData?.openingHoursSpecification) {
      const hours = structuredData.openingHours || structuredData.openingHoursSpecification
      if (Array.isArray(hours)) {
        businessData.business_hours = hours.join(', ')
      } else if (typeof hours === 'string') {
        businessData.business_hours = hours
      }
    } else {
      const hoursPatterns = [
        /(?:hours?|open)[:\s]*([^<\n]{10,300})/gi,
        /(?:monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun)[^<\n]{5,150}/gi,
        /(open\s+(?:24\/7|24\s+hours))/gi
      ]

      for (const pattern of hoursPatterns) {
        const matches = html.match(pattern)
        if (matches && matches.length > 0) {
          let hours = matches[0].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          if (hours.length > 5 && hours.length < 500) {
            businessData.business_hours = hours
            break
          }
        }
      }
    }

    // Extract services with structured data priority
    if (structuredData?.hasOfferCatalog || structuredData?.makesOffer) {
      const services = structuredData.hasOfferCatalog || structuredData.makesOffer
      if (Array.isArray(services)) {
        businessData.services_offered = services.map(s => s.name || s).join(', ')
      } else if (typeof services === 'string') {
        businessData.services_offered = services
      }
    } else {
      const servicePatterns = [
        /(?:services?|what we do|we offer|we provide)[^<]{20,400}/gi,
        /(?:specializ|expert|professional)[^<]{20,300}/gi,
        /<h[1-6][^>]*>([^<]*(?:service|repair|install|maintenance|consultation)[^<]*)<\/h[1-6]>/gi
      ]

      let bestMatch = ''
      for (const pattern of servicePatterns) {
        const matches = html.match(pattern)
        if (matches && matches.length > 0) {
          let services = matches[0].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          if (services.length > bestMatch.length && services.length < 800) {
            bestMatch = services
          }
        }
      }
      if (bestMatch) {
        businessData.services_offered = bestMatch
      }
    }

    // Extract description with structured data priority
    if (structuredData?.description) {
      businessData.business_description = structuredData.description
    } else {
      const descriptionPatterns = [
        /<meta\s+name="description"\s+content="([^"]+)"/i,
        /<meta\s+property="og:description"\s+content="([^"]+)"/i,
        /(?:about\s+(?:us|our\s+company|our\s+business))[^<]{20,400}/gi,
        /(?:we\s+are|we\s+specialize|established)[^<]{20,300}/gi
      ]

      for (const pattern of descriptionPatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          let desc = match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
          if (desc.length > 10 && desc.length < 1000) {
            businessData.business_description = desc
            break
          }
        }
      }
    }

    // Clean up all extracted data
    Object.keys(businessData).forEach(key => {
      if (businessData[key as keyof BusinessData]) {
        let value = businessData[key as keyof BusinessData] as string
        // Remove HTML entities and clean whitespace
        value = value.replace(/&[#\w]+;/g, '').replace(/\s+/g, ' ').trim()
        businessData[key as keyof BusinessData] = value
      }
    })

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