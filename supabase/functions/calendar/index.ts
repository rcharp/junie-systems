import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!
const blandApiKey = Deno.env.get('BLAND_AI_API_KEY')!

Deno.serve(async (req) => {
  console.log('calendar function called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const url = new URL(req.url)
    const userId = url.pathname.split('/').pop()

    if (!userId) {
      throw new Error('User ID is required in the URL path')
    }

    if (req.method === 'GET') {
      // Handle availability request
      return await handleAvailabilityRequest(supabase, userId)
    } else if (req.method === 'POST') {
      // Handle booking request
      const bookingData = await req.json()
      return await handleBookingRequest(supabase, userId, bookingData)
    } else {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('Error in calendar function:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleAvailabilityRequest(supabase: any, userId: string) {
  console.log('Fetching calendar availability for user:', userId)

  // Get user's business settings to check business hours and timezone
  const { data: businessSettings, error: businessError } = await supabase
    .from('business_settings')
    .select('business_hours, business_name, business_timezone, business_timezone_offset')
    .eq('user_id', userId)
    .maybeSingle()

  if (businessError || !businessSettings) {
    console.log('No business settings found for user:', userId)
    return new Response(JSON.stringify({ 
      available: false, 
      message: 'Business settings not found' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get user's calendar settings
  const { data: calendarSettings, error: settingsError } = await supabase
    .from('google_calendar_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .maybeSingle()

  if (settingsError || !calendarSettings) {
    console.log('No calendar settings found for user:', userId)
    return new Response(JSON.stringify({ 
      available: false, 
      message: 'Google Calendar not connected' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Get fresh access token
  const accessToken = await getValidAccessToken(supabase, calendarSettings, userId)
  if (!accessToken) {
    throw new Error('Failed to get valid access token')
  }

  // Use business hours from business_settings as the primary source
  let businessHours = []
  if (businessSettings.business_hours) {
    businessHours = JSON.parse(businessSettings.business_hours)
  }

  // If no business hours found, return unavailable
  if (!businessHours || businessHours.length === 0) {
    console.log('No business hours configured for user:', userId)
    return new Response(JSON.stringify({ 
      available: false, 
      message: 'Business hours not configured' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  
  // Get the next 7 days for availability checking
  const startDate = new Date()
  const endDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000))

  const timeMin = startDate.toISOString()
  const timeMax = endDate.toISOString()

  // Fetch busy times from Google Calendar
  const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarSettings.calendar_id }],
    }),
  })

  const freeBusyData = await freeBusyResponse.json()
  
  if (!freeBusyResponse.ok) {
    throw new Error(`Failed to fetch calendar data: ${freeBusyData.error?.message}`)
  }

  const busyTimes = freeBusyData.calendars[calendarSettings.calendar_id]?.busy || []
  const appointmentDuration = calendarSettings.appointment_duration || 60 // minutes

  console.log('Using appointment duration:', appointmentDuration, 'minutes')
  console.log('Business hours available:', businessHours.length)

  // Generate available time slots based on business hours
  const availableSlots = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    
    console.log('Checking day:', dayName)
    
    // Find business hours for this day
    const dayBusinessHours = businessHours.find((bh: any) => 
      bh.day.toLowerCase() === dayName && bh.isOpen === true)
    
    if (dayBusinessHours) {
      console.log('Found business hours for', dayName, ':', dayBusinessHours)
      
      // Create start and end times in the user's timezone
      const [startHour, startMinute] = dayBusinessHours.openTime.split(':').map(Number)
      const [endHour, endMinute] = dayBusinessHours.closeTime.split(':').map(Number)
      
      // Create a date string in the user's timezone for this day
      const dateStr = current.toLocaleDateString('en-CA') // YYYY-MM-DD format
      const startTimeStr = `${dateStr}T${dayBusinessHours.openTime}:00`
      const endTimeStr = `${dateStr}T${dayBusinessHours.closeTime}:00`
      
      // Parse these as local times in the user's timezone
      const startTime = new Date(startTimeStr)
      const endTime = new Date(endTimeStr)

      console.log('Business hours for', dayName, 'from', startTime.toISOString(), 'to', endTime.toISOString())

      // Generate slots for this day using appointment duration
      const slotStart = new Date(startTime)
      while (slotStart.getTime() + (appointmentDuration * 60 * 1000) <= endTime.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + (appointmentDuration * 60 * 1000))

        // Check if this slot conflicts with any busy times
        const hasConflict = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return (slotStart < busyEnd && slotEnd > busyStart)
        })

        // Only include slots that are in the future and don't conflict
        if (!hasConflict && slotStart > new Date()) {
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            display: slotStart.toLocaleString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
          })
        }

        // Move to next slot (use appointment duration as the interval)
        slotStart.setTime(slotStart.getTime() + (appointmentDuration * 60 * 1000))
      }
    } else {
      console.log('No business hours found for', dayName)
    }

    // Move to next day
    current.setDate(current.getDate() + 1)
  }

  console.log(`Generated ${availableSlots.length} available slots`)

  const availabilityData = {
    business_name: businessSettings.business_name,
    available: availableSlots.length > 0,
    slots: availableSlots.slice(0, 20), // Return first 20 slots
    timezone: businessSettings.business_timezone || calendarSettings.timezone,
    duration: appointmentDuration,
  }

  // Send availability to Bland's API
  if (blandApiKey && availableSlots.length > 0) {
    try {
      const blandResponse = await fetch('https://api.bland.ai/v1/availability', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${blandApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          availability: availabilityData,
        }),
      })
      
      if (blandResponse.ok) {
        console.log('Successfully sent availability to Bland API')
      } else {
        console.error('Failed to send availability to Bland API:', await blandResponse.text())
      }
    } catch (error) {
      console.error('Error sending to Bland API:', error)
    }
  }

  return new Response(JSON.stringify(availabilityData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleBookingRequest(supabase: any, userId: string, bookingData: any) {
  console.log('Booking calendar event for user:', userId, 'with data:', bookingData)

  const { 
    startTime, 
    endTime, 
    callerName, 
    phoneNumber, 
    email, 
    serviceType, 
    notes 
  } = bookingData

  // Validate required fields
  if (!startTime || !endTime || !callerName || !phoneNumber) {
    throw new Error('Missing required booking fields: startTime, endTime, callerName, phoneNumber')
  }

  // Get user's calendar settings
  const { data: calendarSettings, error: settingsError } = await supabase
    .from('google_calendar_settings')
    .select('*')
    .eq('user_id', userId)
    .eq('is_connected', true)
    .maybeSingle()

  if (settingsError || !calendarSettings) {
    throw new Error('Google Calendar not connected for this user')
  }

  // Get fresh access token
  const accessToken = await getValidAccessToken(supabase, calendarSettings, userId)
  if (!accessToken) {
    throw new Error('Failed to get valid access token')
  }

  // Get business settings for the user (including timezone)
  const { data: businessSettings } = await supabase
    .from('business_settings')
    .select('business_name, business_phone, business_address, business_timezone, business_timezone_offset')
    .eq('user_id', userId)
    .maybeSingle()

  const businessName = businessSettings?.business_name || 'Business'

  // Extract a concise service type from the full service description
  let conciseServiceType = serviceType;
  
  // Try to extract service type using simple patterns first
  if (serviceType && serviceType.length > 30) {
    // Common service patterns
    if (serviceType.toLowerCase().includes('a/c') || serviceType.toLowerCase().includes('hvac') || serviceType.toLowerCase().includes('air condition')) {
      conciseServiceType = 'HVAC Service';
    } else if (serviceType.toLowerCase().includes('plumb')) {
      conciseServiceType = 'Plumbing Service';
    } else if (serviceType.toLowerCase().includes('electric')) {
      conciseServiceType = 'Electrical Service';
    } else if (serviceType.toLowerCase().includes('heat')) {
      conciseServiceType = 'Heating Service';
    } else if (serviceType.toLowerCase().includes('roof')) {
      conciseServiceType = 'Roofing Service';
    } else if (serviceType.toLowerCase().includes('repair')) {
      conciseServiceType = 'Repair Service';
    } else if (serviceType.toLowerCase().includes('install')) {
      conciseServiceType = 'Installation Service';
    } else if (serviceType.toLowerCase().includes('maintenance')) {
      conciseServiceType = 'Maintenance Service';
    } else {
      // Fallback: take first few words or use generic term
      const words = serviceType.split(' ').slice(0, 3);
      conciseServiceType = words.length > 0 ? words.join(' ') : 'Service Appointment';
    }
  }

  // Create the calendar event
  const event = {
    summary: `${callerName} - ${conciseServiceType}`,
    description: `
Appointment Details:
- Service: ${serviceType || 'General appointment'}
- Customer: ${callerName}
- Phone: ${phoneNumber}
- Email: ${email || 'Not provided'}
- Notes: ${notes || 'None'}

Business Contact: ${businessSettings?.business_phone || 'Not provided'}
    `.trim(),
    start: {
      dateTime: startTime,
      timeZone: businessSettings?.business_timezone || calendarSettings.timezone,
    },
    end: {
      dateTime: endTime,
      timeZone: businessSettings?.business_timezone || calendarSettings.timezone,
    },
    attendees: email ? [{
      email: email,
      displayName: callerName,
    }] : [],
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
      service_type: serviceType || 'General appointment',
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

  const bookingResult = {
    success: true,
    appointment: appointment,
    calendarEvent: {
      id: eventData.id,
      htmlLink: eventData.htmlLink,
      summary: eventData.summary,
      start: eventData.start,
      end: eventData.end,
    },
  }

  // Send confirmation to Bland's API
  if (blandApiKey) {
    try {
      const blandResponse = await fetch('https://api.bland.ai/v1/booking-confirmation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${blandApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          booking: bookingResult,
        }),
      })
      
      if (blandResponse.ok) {
        console.log('Successfully sent booking confirmation to Bland API')
      } else {
        console.error('Failed to send booking confirmation to Bland API:', await blandResponse.text())
      }
    } catch (error) {
      console.error('Error sending booking confirmation to Bland API:', error)
    }
  }

  return new Response(JSON.stringify(bookingResult), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getValidAccessToken(supabase: any, calendarSettings: any, userId: string): Promise<string | null> {
  console.log('Getting valid access token for user:', userId)
  console.log('Calendar settings exist:', !!calendarSettings)
  console.log('Has encrypted access token:', !!calendarSettings.encrypted_access_token)
  console.log('Has encrypted refresh token:', !!calendarSettings.encrypted_refresh_token)
  
  // Decrypt tokens
  let accessToken = null
  let refreshToken = null
  
  if (calendarSettings.encrypted_access_token) {
    try {
      let encryptedData = calendarSettings.encrypted_access_token
      
      // Handle the specific JSON format from Supabase encryption
      if (typeof encryptedData === 'string') {
        try {
          const parsed = JSON.parse(encryptedData)
          if (parsed.data) {
            encryptedData = parsed.data
          }
        } catch (e) {
          // If not JSON, use the string as is
        }
      } else if (typeof encryptedData === 'object' && encryptedData?.data) {
        encryptedData = encryptedData.data
      }
      
      console.log('Attempting to decrypt access token...')
      
      const { data: decryptedAccess, error: decryptError } = await supabase.rpc('decrypt_token', { 
        encrypted_token: encryptedData
      })
      
      if (decryptError) {
        console.error('Decryption error:', decryptError)
        return null
      }
      
      if (!decryptedAccess) {
        console.error('Decryption returned null/empty')
        return null
      }
      
      accessToken = decryptedAccess
      console.log('Access token decrypted successfully')
    } catch (error) {
      console.error('Exception during access token decryption:', error)
      return null
    }
  } else {
    console.error('No encrypted access token found')
    return null
  }
  
  if (calendarSettings.encrypted_refresh_token) {
    try {
      let encryptedData = calendarSettings.encrypted_refresh_token
      
      // Handle the specific JSON format from Supabase encryption
      if (typeof encryptedData === 'string') {
        try {
          const parsed = JSON.parse(encryptedData)
          if (parsed.data) {
            encryptedData = parsed.data
          }
        } catch (e) {
          // If not JSON, use the string as is
        }
      } else if (typeof encryptedData === 'object' && encryptedData?.data) {
        encryptedData = encryptedData.data
      }
      
      console.log('Attempting to decrypt refresh token...')
      
      const { data: decryptedRefresh, error: decryptError } = await supabase.rpc('decrypt_token', { 
        encrypted_token: encryptedData
      })
      
      if (decryptError) {
        console.error('Refresh token decryption error:', decryptError)
      } else if (decryptedRefresh) {
        refreshToken = decryptedRefresh
        console.log('Refresh token decrypted successfully')
      }
    } catch (error) {
      console.error('Exception during refresh token decryption:', error)
    }
  }

  if (!accessToken) {
    console.error('No access token available after decryption')
    return null
  }

  // Check if token needs refresh
  const expiresAt = new Date(calendarSettings.expires_at)
  const now = new Date()
  
  console.log('Token expires at:', expiresAt)
  console.log('Current time:', now)
  console.log('Token expired:', now >= expiresAt)

  if (now >= expiresAt && refreshToken) {
    console.log('Access token expired, refreshing...')
    
    try {
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
      console.log('Token refresh response status:', tokenResponse.status)
      
      if (tokenResponse.ok) {
        accessToken = tokenData.access_token
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        
        console.log('Token refreshed successfully, new expires at:', newExpiresAt)
        
        // Update the stored token using secure function
        const { error: updateError } = await supabase.rpc('update_google_calendar_tokens', {
          p_user_id: userId,
          p_access_token: accessToken,
          p_expires_at: newExpiresAt,
        })
        
        if (updateError) {
          console.error('Error updating tokens:', updateError)
        }
      } else {
        console.error('Token refresh failed:', tokenData)
        return null
      }
    } catch (error) {
      console.error('Exception during token refresh:', error)
      return null
    }
  }

  console.log('Returning access token:', !!accessToken)
  return accessToken
}