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
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleAvailabilityRequest(supabase: any, userId: string) {
  console.log('Fetching calendar availability for user:', userId)

  // Get user's business settings to check business hours
  const { data: businessSettings, error: businessError } = await supabase
    .from('business_settings')
    .select('business_hours, business_name')
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

  // Parse business hours
  const businessHours = businessSettings.business_hours ? JSON.parse(businessSettings.business_hours) : []
  
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

  // Generate available time slots based on business hours
  const availableSlots = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const dayName = current.toLocaleLowerCase('en-US', { weekday: 'long' })
    
    // Find business hours for this day
    const dayBusinessHours = businessHours.find((bh: any) => bh.day === dayName && bh.isOpen)
    
    if (dayBusinessHours) {
      const startTime = new Date(current)
      const [startHour, startMinute] = dayBusinessHours.openTime.split(':').map(Number)
      startTime.setHours(startHour, startMinute, 0, 0)

      const endTime = new Date(current)
      const [endHour, endMinute] = dayBusinessHours.closeTime.split(':').map(Number)
      endTime.setHours(endHour, endMinute, 0, 0)

      // Generate slots for this day
      const slotStart = new Date(startTime)
      while (slotStart.getTime() + (appointmentDuration * 60 * 1000) <= endTime.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + (appointmentDuration * 60 * 1000))

        // Check if this slot conflicts with any busy times
        const hasConflict = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return (slotStart < busyEnd && slotEnd > busyStart)
        })

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
              timeZone: calendarSettings.timezone,
            }),
          })
        }

        slotStart.setTime(slotStart.getTime() + (30 * 60 * 1000)) // 30-minute intervals
      }
    }

    current.setDate(current.getDate() + 1)
  }

  console.log(`Generated ${availableSlots.length} available slots`)

  const availabilityData = {
    business_name: businessSettings.business_name,
    available: availableSlots.length > 0,
    slots: availableSlots.slice(0, 20), // Return first 20 slots
    timezone: calendarSettings.timezone,
    duration: appointmentDuration,
    business_hours: businessHours,
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

  // Get business settings for the user
  const { data: businessSettings } = await supabase
    .from('business_settings')
    .select('business_name, business_phone, business_address')
    .eq('user_id', userId)
    .maybeSingle()

  const businessName = businessSettings?.business_name || 'Business'

  // Create the calendar event
  const event = {
    summary: `${serviceType || 'Appointment'} - ${callerName}`,
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
      timeZone: calendarSettings.timezone,
    },
    end: {
      dateTime: endTime,
      timeZone: calendarSettings.timezone,
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
  // Decrypt tokens
  let accessToken = null
  let refreshToken = null
  
  if (calendarSettings.encrypted_access_token) {
    const { data: decryptedAccess } = await supabase.rpc('decrypt_token', { 
      encrypted_token: calendarSettings.encrypted_access_token 
    })
    accessToken = decryptedAccess
  }
  
  if (calendarSettings.encrypted_refresh_token) {
    const { data: decryptedRefresh } = await supabase.rpc('decrypt_token', { 
      encrypted_token: calendarSettings.encrypted_refresh_token 
    })
    refreshToken = decryptedRefresh
  }

  if (!accessToken) {
    return null
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
      return null
    }
  }

  return accessToken
}