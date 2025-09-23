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
  console.log('google-calendar-availability function called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const url = new URL(req.url)
    const userId = url.pathname.split('/').pop()

    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log('Fetching calendar availability for user:', userId)

    // Get user's calendar settings with decrypted tokens using the secure function
    const { data: calendarData, error: settingsError } = await supabase.rpc('get_google_calendar_tokens', {
      p_user_id: userId
    })

    if (settingsError || !calendarData || calendarData.length === 0) {
      console.log('No calendar settings found for user:', userId, settingsError)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarSettings = calendarData[0]

    // Get tokens directly from the secure function result
    const accessToken = calendarSettings.access_token
    const refreshToken = calendarSettings.refresh_token

    if (!accessToken) {
      throw new Error('No access token available for user')
    }

    console.log('Calendar settings:', {
      calendar_id: calendarSettings.calendar_id,
      timezone: calendarSettings.timezone,
      expires_at: calendarSettings.expires_at,
      has_access_token: !!accessToken,
      has_refresh_token: !!refreshToken
    })

    // Check if token needs refresh
    const expiresAt = new Date(calendarSettings.expires_at)
    const now = new Date()

    let currentAccessToken = accessToken

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
        currentAccessToken = tokenData.access_token
        const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
        
        // Update the stored token using secure function
        await supabase.rpc('update_google_calendar_tokens', {
          p_user_id: userId,
          p_access_token: currentAccessToken,
          p_expires_at: newExpiresAt,
        })
      } else {
        console.error('Token refresh failed:', tokenData)
        throw new Error('Failed to refresh access token')
      }
    }

    // Get the next 7 days for availability checking
    const startDate = new Date()
    const endDate = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days from now

    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()

    // Fetch busy times from Google Calendar
    const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarSettings.calendar_id }],
      }),
    })

    const freeBusyData = await freeBusyResponse.json()
    console.log('FreeBusy response:', freeBusyData)

    if (!freeBusyResponse.ok) {
      throw new Error(`Failed to fetch calendar data: ${freeBusyData.error?.message}`)
    }

    const busyTimes = freeBusyData.calendars[calendarSettings.calendar_id]?.busy || []
    const availabilityHours = calendarSettings.availability_hours || {}
    const appointmentDuration = calendarSettings.appointment_duration || 60 // minutes

    // Generate available time slots
    const availableSlots = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]

      if (daySettings?.enabled) {
        const startTime = new Date(current)
        const [startHour, startMinute] = daySettings.start.split(':').map(Number)
        startTime.setHours(startHour, startMinute, 0, 0)

        const endTime = new Date(current)
        const [endHour, endMinute] = daySettings.end.split(':').map(Number)
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

          if (!hasConflict && slotStart > now) {
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

    return new Response(JSON.stringify({
      available: availableSlots.length > 0,
      slots: availableSlots.slice(0, 10), // Return first 10 slots
      timezone: calendarSettings.timezone,
      duration: appointmentDuration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in google-calendar-availability function:', error)
    return new Response(JSON.stringify({ 
      available: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})