import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

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
      endTime, 
      callerName, 
      phoneNumber, 
      email, 
      serviceType, 
      serviceAddress,
      notes 
    } = await req.json()

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

    // Decrypt tokens
    let accessToken = null
    let refreshToken = null
    
    console.log('Attempting to decrypt access token...')
    if (calendarSettings.encrypted_access_token) {
      const { data: decryptedAccess, error: decryptError } = await supabase.rpc('decrypt_token', { 
        encrypted_token: calendarSettings.encrypted_access_token 
      })
      
      if (decryptError) {
        console.error('Error decrypting access token:', decryptError)
      } else {
        console.log('Access token decryption result:', decryptedAccess ? 'Success' : 'Failed (null)')
        accessToken = decryptedAccess
      }
    }
    
    console.log('Attempting to decrypt refresh token...')
    if (calendarSettings.encrypted_refresh_token) {
      // Handle both JSON format and plain string format
      let tokenToDecrypt = calendarSettings.encrypted_refresh_token
      if (typeof tokenToDecrypt === 'object' && tokenToDecrypt.data) {
        tokenToDecrypt = tokenToDecrypt.data
      }
      
      const { data: decryptedRefresh, error: refreshDecryptError } = await supabase.rpc('decrypt_token', { 
        encrypted_token: tokenToDecrypt 
      })
      
      if (refreshDecryptError) {
        console.error('Error decrypting refresh token:', refreshDecryptError)
      } else {
        console.log('Refresh token decryption result:', decryptedRefresh ? 'Success' : 'Failed (null)')
        refreshToken = decryptedRefresh
      }
    }

    // If access token is invalid/corrupted but we have a refresh token, try to refresh
    if (!accessToken && refreshToken) {
      console.log('Access token invalid/corrupted, attempting refresh with refresh token...')
      
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

      const tokenData = await tokenResponse.json()
      
      if (tokenResponse.ok) {
        accessToken = tokenData.access_token
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        
        console.log('Successfully refreshed access token')
        
        // Update the stored token using secure function
        await supabase.rpc('update_google_calendar_tokens', {
          p_user_id: userId,
          p_access_token: accessToken,
          p_refresh_token: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
          p_expires_at: newExpiresAt
        })
      } else {
        console.error('Failed to refresh token:', tokenData)
        throw new Error('Google Calendar tokens are invalid. Please reconnect your Google Calendar.')
      }
    }
    
    if (!accessToken) {
      console.error('No valid access token available after refresh attempt.')
      throw new Error('Google Calendar access token is invalid. Please reconnect your Google Calendar.')
    }

    // Check if token needs refresh
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

      const tokenData = await tokenResponse.json()
      
      if (tokenResponse.ok) {
        accessToken = tokenData.access_token
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        
        // Update the stored token using secure function
        await supabase.rpc('update_google_calendar_tokens', {
          p_user_id: userId,
          p_access_token: accessToken,
          p_expires_at: newExpiresAt,
        })
      } else {
        console.error('Token refresh failed:', tokenData)
        throw new Error('Failed to refresh access token')
      }
    }

    // Get business settings for the user
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('business_name, business_phone, business_address')
      .eq('user_id', userId)
      .single()

    const businessName = businessSettings?.business_name || 'Business'

    // Create the calendar event
    const event = {
      summary: `${serviceType} - ${callerName}`,
      location: serviceAddress || '',
      description: `
Appointment Details:
- Service: ${serviceType}
- Customer: ${callerName}
- Phone: ${phoneNumber}
- Email: ${email || 'Not provided'}
- Service Location: ${serviceAddress || 'Not provided'}
- Notes: ${notes || 'None'}

Business Contact: ${businessSettings?.business_phone || 'Not provided'}
      `.trim(),
      start: {
        dateTime: startTime,
        timeZone: calendarSettings.timezone,
      },
      end: {
        dateTime: endTime,
        timeZone: calendarSettings.timezone,
      },
      attendees: [
        {
          email: email,
          displayName: callerName,
        }
      ].filter(attendee => attendee.email), // Only include if email is provided
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
    }

    console.log('Creating calendar event:', event)

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
        caller_name: callerName,
        phone_number: phoneNumber,
        email: email,
        service_type: serviceType,
        notes: notes,
        preferred_date: new Date(startTime).toISOString().split('T')[0],
        preferred_time: new Date(startTime).toTimeString().split(' ')[0],
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
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})