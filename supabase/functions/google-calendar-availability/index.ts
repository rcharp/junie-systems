import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

// Helper function to get timezone offset in milliseconds
function getTimezoneOffsetMs(timezone: string, date: Date): number {
  try {
    // Use Intl.DateTimeFormat to get the proper timezone offset
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset'
    })
    const parts = formatter.formatToParts(date)
    const offsetPart = parts.find(part => part.type === 'timeZoneName')
    if (offsetPart) {
      const offset = offsetPart.value // e.g., "GMT-4" or "GMT+5"
      const match = offset.match(/GMT([+-])(\d{1,2})/)
      if (match) {
        const sign = match[1] === '+' ? 1 : -1
        const hours = parseInt(match[2])
        return sign * hours * 60 * 60 * 1000
      }
    }
    // Fallback: use a simple approach
    console.log('Falling back to simple timezone offset calculation')
    return 0
  } catch (error) {
    console.error('Error calculating timezone offset:', error)
    return 0
  }
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
    console.log('Current time (now):', now.toISOString())

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]

      console.log(`Processing ${dayName} (${current.toDateString()})`, daySettings)

      if (daySettings?.enabled) {
        const [startHour, startMinute] = daySettings.start.split(':').map(Number)
        const [endHour, endMinute] = daySettings.end.split(':').map(Number)
        
        console.log(`Day ${dayName}: configured hours ${startHour}:${startMinute} to ${endHour}:${endMinute}`)
        
        // Simple approach: create UTC times by treating the configured hours as if they were UTC
        // Then adjust by adding the timezone offset to get the actual UTC time
        const baseDate = new Date(current)
        baseDate.setUTCHours(startHour, startMinute, 0, 0)
        
        const startTimeUTC = new Date(baseDate)
        // Add 4 hours to convert from EDT to UTC (EDT is UTC-4)
        if (userTimezone === 'America/New_York') {
          startTimeUTC.setUTCHours(startTimeUTC.getUTCHours() + 4)
        }
        
        const endBaseDate = new Date(current)
        endBaseDate.setUTCHours(endHour, endMinute, 0, 0)
        const endTimeUTC = new Date(endBaseDate)
        if (userTimezone === 'America/New_York') {
          endTimeUTC.setUTCHours(endTimeUTC.getUTCHours() + 4)
        }

        console.log(`Day ${dayName}: UTC range ${startTimeUTC.toISOString()} to ${endTimeUTC.toISOString()}`)

        // Generate slots for this day
        const slotStart = new Date(startTimeUTC)
        let slotCount = 0
        while (slotStart.getTime() + (appointmentDuration * 60 * 1000) <= endTimeUTC.getTime()) {
          const slotEnd = new Date(slotStart.getTime() + (appointmentDuration * 60 * 1000))
          slotCount++

          console.log(`Checking slot ${slotCount}: ${slotStart.toISOString()} to ${slotEnd.toISOString()}`)
          console.log(`Slot start > now? ${slotStart > now} (${slotStart.getTime()} > ${now.getTime()})`)

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

          console.log(`Slot has conflict: ${hasConflict}`)

          if (!hasConflict && slotStart > now) {
            // Convert back to user timezone for display
            const slotStartLocal = new Date(slotStart)
            const slotEndLocal = new Date(slotEnd)
            if (userTimezone === 'America/New_York') {
              slotStartLocal.setUTCHours(slotStartLocal.getUTCHours() - 4)
              slotEndLocal.setUTCHours(slotEndLocal.getUTCHours() - 4)
            }
            
            console.log(`Adding available slot: ${slotStart.toISOString()} (UTC) = ${slotStartLocal.toISOString()} (${userTimezone})`)
            
            // Create human readable format
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
          
          // Safety break to prevent infinite loops
          if (slotCount > 20) {
            console.log('Breaking slot generation loop - too many iterations')
            break
          }
        }
        console.log(`Generated ${slotCount} slots for ${dayName}`)
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