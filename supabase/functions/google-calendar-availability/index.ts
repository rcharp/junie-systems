import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

// Helper function to get timezone offset in milliseconds
function getTimezoneOffsetMs(timezone: string, date: Date): number {
  // Create two dates: one in UTC and one in the target timezone
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return tzDate.getTime() - utcDate.getTime()
}

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

    // Get user's calendar settings
    const { data: calendarData, error: settingsError } = await supabase
      .from('google_calendar_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (settingsError || !calendarData) {
      console.log('No calendar settings found for user:', userId, settingsError)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarSettings = calendarData

    // Decrypt tokens if they exist
    let accessToken = null
    let refreshToken = null

    if (calendarSettings.encrypted_access_token) {
      try {
        console.log('Attempting to decrypt access token...')
        const { data: decryptedAccess, error: decryptError } = await supabase.rpc('decrypt_token', {
          encrypted_token: calendarSettings.encrypted_access_token
        })
        console.log('Decryption result:', { success: !!decryptedAccess, hasError: !!decryptError })
        if (decryptedAccess) {
          accessToken = decryptedAccess
        }
      } catch (error) {
        console.error('Failed to decrypt access token:', error)
      }
    }

    if (calendarSettings.encrypted_refresh_token) {
      try {
        console.log('Attempting to decrypt refresh token...')
        const { data: decryptedRefresh, error: decryptError } = await supabase.rpc('decrypt_token', {
          encrypted_token: calendarSettings.encrypted_refresh_token
        })
        console.log('Refresh decryption result:', { success: !!decryptedRefresh, hasError: !!decryptError })
        if (decryptedRefresh) {
          refreshToken = decryptedRefresh
        }
      } catch (error) {
        console.error('Failed to decrypt refresh token:', error)
      }
    }

    console.log('Calendar settings:', {
      calendar_id: calendarSettings.calendar_id,
      timezone: calendarSettings.timezone,
      expires_at: calendarSettings.expires_at,
      has_access_token: !!accessToken,
      has_refresh_token: !!refreshToken,
      is_connected: calendarSettings.is_connected
    })

    if (!calendarSettings.is_connected) {
      console.log('Calendar not connected for user:', userId)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!accessToken) {
      console.log('No access token found for user:', userId)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar access token not available' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
        
        // Encrypt and update the stored token
        console.log('Encrypting new access token...')
        const { data: encryptedNewToken, error: encryptError } = await supabase.rpc('encrypt_token', {
          token: currentAccessToken
        })
        
        if (encryptedNewToken && !encryptError) {
          await supabase
            .from('google_calendar_settings')
            .update({
              encrypted_access_token: encryptedNewToken,
              expires_at: newExpiresAt
            })
            .eq('user_id', userId)
          console.log('Updated stored access token')
        } else {
          console.error('Failed to encrypt new token:', encryptError)
        }
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

    // Use primary calendar if no specific calendar_id is set
    const calendarId = calendarSettings.calendar_id || 'primary'
    
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
        items: [{ id: calendarId }],
      }),
    })

    console.log('FreeBusy request sent to calendar ID:', calendarId)

    const freeBusyData = await freeBusyResponse.json()
    console.log('FreeBusy response:', freeBusyData)

    if (!freeBusyResponse.ok) {
      throw new Error(`Failed to fetch calendar data: ${freeBusyData.error?.message}`)
    }

    const busyTimes = freeBusyData.calendars[calendarId]?.busy || []
    const availabilityHours = calendarSettings.availability_hours || {}
    const appointmentDuration = calendarSettings.appointment_duration || 60 // minutes

    // Generate available time slots
    const availableSlots = []
    const current = new Date(startDate)
    const userTimezone = calendarSettings.timezone || 'America/New_York'

    console.log('Generating slots with timezone:', userTimezone)
    console.log('Busy times from calendar:', busyTimes)
    console.log('Availability hours:', availabilityHours)
    console.log('Start date:', startDate.toISOString(), 'End date:', endDate.toISOString())

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]

      console.log(`Processing ${dayName} (${current.toDateString()})`, daySettings)

      if (daySettings?.enabled) {
        const [startHour, startMinute] = daySettings.start.split(':').map(Number)
        const [endHour, endMinute] = daySettings.end.split(':').map(Number)
        
        // Create times properly using the user's timezone
        const year = current.getFullYear()
        const month = current.getMonth()
        const date = current.getDate()
        
        // Create a date in the user's timezone to get the proper offset
        const tempDate = new Date(year, month, date, 12, 0, 0) // Use noon to avoid DST edge cases
        const utcTime = tempDate.getTime() + (tempDate.getTimezoneOffset() * 60000)
        
        // Get offset for user's timezone at this date
        const userDate = new Date(utcTime + (getTimezoneOffset(userTimezone, tempDate) * 60000))
        const userTimezoneOffsetMs = userDate.getTimezoneOffset() * 60000
        
        // Build time strings for the user's timezone
        const startTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`
        const endTimeString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`
        
        console.log(`Time strings: ${startTimeString} to ${endTimeString}`)
        
        // Create dates and convert to UTC properly
        const startTimeLocal = new Date(startTimeString)
        const endTimeLocal = new Date(endTimeString)
        
        // Convert to UTC by accounting for the user's timezone offset
        const startTimeUTC = new Date(startTimeLocal.getTime() - getTimezoneOffsetMs(userTimezone, startTimeLocal))
        const endTimeUTC = new Date(endTimeLocal.getTime() - getTimezoneOffsetMs(userTimezone, endTimeLocal))

        console.log(`Day ${dayName}: Local ${startTimeString} - ${endTimeString}`)
        console.log(`Day ${dayName}: UTC ${startTimeUTC.toISOString()} - ${endTimeUTC.toISOString()}`)

        // Generate slots for this day
        const slotStart = new Date(startTimeUTC)
        while (slotStart.getTime() + (appointmentDuration * 60 * 1000) <= endTimeUTC.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + (appointmentDuration * 60 * 1000))

          // Check if this slot conflicts with any busy times (all times are in UTC)
          const hasConflict = busyTimes.some((busy: any) => {
            const busyStart = new Date(busy.start)
            const busyEnd = new Date(busy.end)
            const conflict = (slotStart < busyEnd && slotEnd > busyStart)
            if (conflict) {
              console.log(`Conflict found: slot ${slotStart.toISOString()}-${slotEnd.toISOString()} conflicts with ${busyStart.toISOString()}-${busyEnd.toISOString()}`)
            }
            return conflict
          })

          if (!hasConflict && slotStart > now) {
            // Convert back to user timezone for display
            const slotStartLocal = new Date(slotStart.getTime() + getTimezoneOffsetMs(userTimezone, slotStart))
            const slotEndLocal = new Date(slotEnd.getTime() + getTimezoneOffsetMs(userTimezone, slotEnd))
            console.log(`Adding available slot: ${slotStart.toISOString()} (UTC) = ${slotStartLocal.toLocaleString()} (${userTimezone})`)
            
            // Create human readable format: "Tuesday, October 7th, 2025 9am-10am"
            const dateStr = slotStartLocal.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })
            const startTimeStr = slotStartLocal.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: slotStartLocal.getMinutes() === 0 ? undefined : '2-digit',
            }).toLowerCase()
            const endTimeStr = slotEndLocal.toLocaleTimeString('en-US', {
              hour: 'numeric', 
              minute: slotEndLocal.getMinutes() === 0 ? undefined : '2-digit',
            }).toLowerCase()
            const humanReadable = `${dateStr} ${startTimeStr}-${endTimeStr}`
            
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              display: slotStartLocal.toLocaleString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              }),
              humanReadable: humanReadable,
            })
          }

          slotStart.setTime(slotStart.getTime() + (appointmentDuration * 60 * 1000))
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