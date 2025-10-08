import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { decryptToken, encryptToken } from '../_shared/encryption.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!

Deno.serve(async (req) => {
  console.log('google-calendar-book function called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { 
      userId, 
      startTime,
      appointmentDateTime,
      customerName,
      customerEmail,
      customerPhone,
      serviceType, 
      serviceAddress,
      notes,
      additionalNotes
    } = await req.json()

    // Use appointmentDateTime if provided, fallback to startTime for backward compatibility
    const dateTimeToUse = appointmentDateTime || startTime

    console.log('Booking calendar event for user:', userId)

    // Get user's calendar settings
    const { data: calendarSettings, error: settingsError } = await supabase
      .from('google_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true)
      .single()

    if (settingsError || !calendarSettings) {
      throw new Error('Google Calendar not connected for this user')
    }

    // Calculate end time based on appointment duration from calendar settings
    const appointmentDuration = calendarSettings.appointment_duration || 60
    
    console.log('Date input received:', dateTimeToUse)
    
    // Validate the date input
    if (!dateTimeToUse) {
      throw new Error('No appointment date/time provided')
    }
    
    const startDateTime = new Date(dateTimeToUse)
    
    // Check if the date is valid
    if (isNaN(startDateTime.getTime())) {
      console.error('Invalid date provided:', dateTimeToUse)
      throw new Error(`Invalid date format: ${dateTimeToUse}`)
    }
    
    const endDateTime = new Date(startDateTime)
    endDateTime.setMinutes(endDateTime.getMinutes() + appointmentDuration)
    const endTimeISO = endDateTime.toISOString()
    
    console.log('Calculated appointment times:', {
      start: startDateTime.toISOString(),
      end: endTimeISO,
      duration: appointmentDuration
    })

    // Check if we have encrypted tokens
    if (!calendarSettings.encrypted_access_token) {
      console.error('No encrypted tokens found in database. User needs to reconnect.')
      throw new Error('Google Calendar tokens not found. Please reconnect your Google Calendar.')
    }

    // Decrypt the tokens using shared encryption utility
    console.log('Decrypting calendar tokens...')
    let accessToken = await decryptToken(calendarSettings.encrypted_access_token)
    let refreshToken = calendarSettings.encrypted_refresh_token 
      ? await decryptToken(calendarSettings.encrypted_refresh_token) 
      : null

    console.log('Retrieved tokens:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresAt: calendarSettings.expires_at
    })

    // If we don't have any tokens, user needs to reconnect
    if (!accessToken && !refreshToken) {
      console.error('No valid tokens available. User needs to reconnect.')
      throw new Error('Google Calendar tokens are invalid. Please reconnect your Google Calendar.')
    }

    // If access token is missing but we have refresh token, try to refresh
    if (!accessToken && refreshToken) {
      console.log('Access token missing, attempting refresh with refresh token...')
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      const tokenResponseData = await tokenResponse.json()
      
      if (tokenResponse.ok) {
        accessToken = tokenResponseData.access_token
        const newExpiresAt = new Date(Date.now() + (tokenResponseData.expires_in * 1000)).toISOString()
        
        console.log('Successfully refreshed access token')
        
        // Encrypt and update the stored token
        const encryptedAccessToken = await encryptToken(accessToken)
        const newRefreshToken = tokenResponseData.refresh_token || refreshToken
        const encryptedRefreshToken = await encryptToken(newRefreshToken)
        
        await supabase
          .from('google_calendar_settings')
          .update({
            encrypted_access_token: encryptedAccessToken,
            encrypted_refresh_token: encryptedRefreshToken,
            expires_at: newExpiresAt
          })
          .eq('user_id', userId)
      } else {
        console.error('Failed to refresh token:', tokenResponseData)
        throw new Error('Google Calendar tokens are invalid. Please reconnect your Google Calendar.')
      }
    }
    
    if (!accessToken) {
      console.error('No valid access token available after refresh attempt.')
      throw new Error('Google Calendar access token is invalid. Please reconnect your Google Calendar.')
    }
    
    // Check if token needs refresh based on expiration
    const expiresAt = new Date(calendarSettings.expires_at)
    const now = new Date()

    if (now >= expiresAt && refreshToken) {
      console.log('Access token expired, refreshing...')
      
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      })

      const tokenResponseData = await tokenResponse.json()
      
      if (tokenResponse.ok) {
        accessToken = tokenResponseData.access_token
        const newExpiresAt = new Date(Date.now() + (tokenResponseData.expires_in * 1000)).toISOString()
        
        console.log('Successfully refreshed expired access token, expires at:', newExpiresAt)
        
        // Encrypt and update the stored token
        const encryptedAccessToken = await encryptToken(accessToken)
        const newRefreshToken = tokenResponseData.refresh_token || refreshToken
        const encryptedRefreshToken = await encryptToken(newRefreshToken)
        
        await supabase
          .from('google_calendar_settings')
          .update({
            encrypted_access_token: encryptedAccessToken,
            encrypted_refresh_token: encryptedRefreshToken,
            expires_at: newExpiresAt
          })
          .eq('user_id', userId)
      } else {
        console.error('Token refresh failed:', tokenResponseData)
        throw new Error('Failed to refresh access token')
      }
    }

    // Get business settings for the user (including timezone)
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('business_name, business_phone, business_address, business_timezone, business_timezone_offset')
      .eq('user_id', userId)
      .single()

    const businessName = businessSettings?.business_name || 'Business'

    // Extract a concise service type from the service description
    let conciseServiceType = serviceType;
    
    if (serviceType && serviceType.length > 0) {
      const lowerServiceType = serviceType.toLowerCase();
      
      // First try to extract specific service types from common patterns
      if (lowerServiceType.includes('a/c') || lowerServiceType.includes('air condition') || lowerServiceType.includes('hvac') || lowerServiceType.includes('ac ')) {
        if (lowerServiceType.includes('repair') || lowerServiceType.includes('fix') || lowerServiceType.includes('not working') || lowerServiceType.includes('broken')) {
          conciseServiceType = 'A/C Repair';
        } else if (lowerServiceType.includes('install') || lowerServiceType.includes('replacement')) {
          conciseServiceType = 'A/C Installation';
        } else if (lowerServiceType.includes('maintenance') || lowerServiceType.includes('service') || lowerServiceType.includes('check') || lowerServiceType.includes('inspect')) {
          conciseServiceType = 'A/C Service';
        } else if (lowerServiceType.includes('clean')) {
          conciseServiceType = 'A/C Cleaning';
        } else {
          conciseServiceType = 'A/C Service';
        }
      } else if (lowerServiceType.includes('plumb') || lowerServiceType.includes('pipe') || lowerServiceType.includes('drain') || lowerServiceType.includes('leak') || lowerServiceType.includes('toilet') || lowerServiceType.includes('faucet')) {
        if (lowerServiceType.includes('repair') || lowerServiceType.includes('fix')) {
          conciseServiceType = 'Plumbing Repair';
        } else if (lowerServiceType.includes('install')) {
          conciseServiceType = 'Plumbing Installation';
        } else if (lowerServiceType.includes('clean') || lowerServiceType.includes('unclog')) {
          conciseServiceType = 'Drain Cleaning';
        } else {
          conciseServiceType = 'Plumbing Service';
        }
      } else if (lowerServiceType.includes('electric') || lowerServiceType.includes('electrical') || lowerServiceType.includes('outlet') || lowerServiceType.includes('wire') || lowerServiceType.includes('breaker')) {
        if (lowerServiceType.includes('repair')) {
          conciseServiceType = 'Electrical Repair';
        } else if (lowerServiceType.includes('install')) {
          conciseServiceType = 'Electrical Installation';
        } else {
          conciseServiceType = 'Electrical Service';
        }
      } else if (lowerServiceType.includes('roof') || lowerServiceType.includes('shingle') || lowerServiceType.includes('gutter')) {
        if (lowerServiceType.includes('repair') || lowerServiceType.includes('leak')) {
          conciseServiceType = 'Roof Repair';
        } else if (lowerServiceType.includes('clean')) {
          conciseServiceType = 'Gutter Cleaning';
        } else if (lowerServiceType.includes('install')) {
          conciseServiceType = 'Roof Installation';
        } else {
          conciseServiceType = 'Roofing Service';
        }
      } else if (lowerServiceType.includes('clean') || lowerServiceType.includes('maid') || lowerServiceType.includes('janitorial') || lowerServiceType.includes('carpet')) {
        if (lowerServiceType.includes('carpet')) {
          conciseServiceType = 'Carpet Cleaning';
        } else if (lowerServiceType.includes('house') || lowerServiceType.includes('home')) {
          conciseServiceType = 'House Cleaning';
        } else {
          conciseServiceType = 'Cleaning Service';
        }
      } else if (lowerServiceType.includes('pest') || lowerServiceType.includes('bug') || lowerServiceType.includes('termite') || lowerServiceType.includes('exterminator')) {
        conciseServiceType = 'Pest Control';
      } else if (lowerServiceType.includes('lawn') || lowerServiceType.includes('landscap') || lowerServiceType.includes('garden') || lowerServiceType.includes('yard') || lowerServiceType.includes('tree')) {
        if (lowerServiceType.includes('mow') || lowerServiceType.includes('cut')) {
          conciseServiceType = 'Lawn Mowing';
        } else if (lowerServiceType.includes('tree')) {
          conciseServiceType = 'Tree Service';
        } else {
          conciseServiceType = 'Landscaping';
        }
      } else if (lowerServiceType.includes('pool') || lowerServiceType.includes('spa') || lowerServiceType.includes('hot tub')) {
        if (lowerServiceType.includes('clean')) {
          conciseServiceType = 'Pool Cleaning';
        } else if (lowerServiceType.includes('repair')) {
          conciseServiceType = 'Pool Repair';
        } else {
          conciseServiceType = 'Pool Service';
        }
      } else if (lowerServiceType.includes('handyman') || lowerServiceType.includes('general repair')) {
        conciseServiceType = 'Handyman Service';
      } else if (lowerServiceType.includes('garage door')) {
        if (lowerServiceType.includes('repair')) {
          conciseServiceType = 'Garage Door Repair';
        } else if (lowerServiceType.includes('install')) {
          conciseServiceType = 'Garage Door Installation';
        } else {
          conciseServiceType = 'Garage Door Service';
        }
      } else {
        // Generic patterns for any service
        if (lowerServiceType.includes('repair') || lowerServiceType.includes('fix')) {
          conciseServiceType = 'Repair Service';
        } else if (lowerServiceType.includes('install') || lowerServiceType.includes('installation')) {
          conciseServiceType = 'Installation Service';
        } else if (lowerServiceType.includes('maintenance') || lowerServiceType.includes('service')) {
          conciseServiceType = 'Maintenance Service';
        } else if (lowerServiceType.includes('clean')) {
          conciseServiceType = 'Cleaning Service';
        } else if (lowerServiceType.includes('inspect') || lowerServiceType.includes('check')) {
          conciseServiceType = 'Inspection Service';
        } else if (lowerServiceType.includes('estimate') || lowerServiceType.includes('quote')) {
          conciseServiceType = 'Service Estimate';
        } else {
          // Fallback: take first meaningful words or use generic term
          const words = serviceType.split(' ').slice(0, 3);
          conciseServiceType = words.length > 0 ? words.join(' ') : 'Service Appointment';
        }
      }
    }

    // Create the calendar event with a concise, professional title
    const event = {
      summary: `${customerName} - ${conciseServiceType}`,
      location: serviceAddress || '',
      description: `
Appointment Details:
- Service: ${serviceType}
- Customer: ${customerName}
- Phone: ${customerPhone}
- Email: ${customerEmail || 'Not provided'}
- Service Location: ${serviceAddress || 'Not provided'}
- Notes: ${additionalNotes || notes || 'None'}

Business Contact: ${businessSettings?.business_phone || 'Not provided'}
      `.trim(),
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: businessSettings?.business_timezone || calendarSettings.timezone,
      },
      end: {
        dateTime: endTimeISO,
        timeZone: businessSettings?.business_timezone || calendarSettings.timezone,
      },
      attendees: [], // Don't include customer email in calendar event
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    }

    console.log('Creating calendar event:', event)
    console.log('Using access token (first 20 chars):', accessToken?.substring(0, 20) + '...')
    console.log('Calendar ID:', calendarSettings.calendar_id)

    // First, test the token with a simple API call to make sure it's valid
    console.log('Testing token validity with calendar list API...')
    const testResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
    
    const testData = await testResponse.json()
    console.log('Token test response status:', testResponse.status)
    console.log('Token test response:', testData)
    
    if (!testResponse.ok) {
      console.error('Token validation failed:', testData)
      throw new Error(`Invalid access token: ${testData.error?.message || 'Token test failed'}`)
    }

    const createEventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarSettings.calendar_id}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const eventData = await createEventResponse.json()
    console.log('Calendar event creation response:', eventData)

    if (!createEventResponse.ok) {
      throw new Error(`Failed to create calendar event: ${eventData.error?.message}`)
    }

    // Create appointment record in database
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        caller_name: customerName,
        phone_number: customerPhone,
        email: customerEmail,
        service_type: serviceType,
        notes: notes,
        additional_notes: additionalNotes || null,
        preferred_date: new Date(dateTimeToUse).toISOString().split('T')[0],
        preferred_time: new Date(dateTimeToUse).toTimeString().split(' ')[0],
        calendar_event_id: eventData.id,
        status: 'scheduled',
      })
      .select()
      .single()

    if (appointmentError) {
      console.error('Error creating appointment record:', appointmentError)
      // Try to delete the calendar event if appointment creation failed
      try {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarSettings.calendar_id}/events/${eventData.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )
      } catch (deleteError) {
        console.error('Failed to clean up calendar event:', deleteError)
      }
      throw new Error('Failed to create appointment record')
    }

    return new Response(JSON.stringify({
      success: true,
      appointment: appointment,
      calendarEvent: {
        id: eventData.id,
        htmlLink: eventData.htmlLink,
        summary: eventData.summary,
        start: eventData.start,
        end: eventData.end,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in google-calendar-book function:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})