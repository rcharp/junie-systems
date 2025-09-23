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
    const userTimezone = calendarSettings.timezone || 'America/New_York'

    console.log('=== STARTING SLOT GENERATION ===')
    console.log('User timezone:', userTimezone)
    console.log('Appointment duration:', appointmentDuration, 'minutes')
    console.log('Availability hours:', JSON.stringify(availabilityHours))
    console.log('Busy times:', JSON.stringify(busyTimes))
    
    // Generate slots for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]
      
      console.log(`--- Day ${dayOffset + 1}: ${dayName} (${currentDate.toDateString()}) ---`)
      console.log('Day settings:', JSON.stringify(daySettings))
      
      if (!daySettings?.enabled) {
        console.log(`Skipping ${dayName} - not enabled`)
        continue
      }
      
      const [startHour, startMinute] = daySettings.start.split(':').map(Number)
      const [endHour, endMinute] = daySettings.end.split(':').map(Number)
      
      console.log(`Processing ${dayName}: ${startHour}:${startMinute} to ${endHour}:${endMinute}`)
      
      // Create start and end times in user's timezone correctly
      // For EDT (UTC-4): 9:00 AM EDT should become 13:00 UTC
      // Business hours: 9:00-17:00 EDT = 13:00-21:00 UTC
      
      // Create times in user's local timezone first
      const startDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour, startMinute, 0, 0)
      const endDateTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour, endMinute, 0, 0)
      
      console.log(`Local business hours: ${startDateTime.toString()} to ${endDateTime.toString()}`)
      
      // Convert to UTC by adding the EDT offset (EDT = UTC-4, so add 4 hours to get UTC)
      const startTimeUTC = new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000))
      const endTimeUTC = new Date(endDateTime.getTime() + (4 * 60 * 60 * 1000))
      
      console.log(`UTC times: ${startTimeUTC.toISOString()} to ${endTimeUTC.toISOString()}`)
      
      // Generate slots
      let slotStart = new Date(startTimeUTC)
      let slotNumber = 0
      
      while (slotStart.getTime() + (appointmentDuration * 60 * 1000) <= endTimeUTC.getTime()) {
        slotNumber++
        const slotEnd = new Date(slotStart.getTime() + (appointmentDuration * 60 * 1000))
        
        console.log(`  Slot ${slotNumber}: ${slotStart.toISOString()} to ${slotEnd.toISOString()}`)
        console.log(`  Slot start > now? ${slotStart > now} (${slotStart.getTime()} > ${now.getTime()})`)
        
        // Check for conflicts with busy times
        const hasConflict = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          const conflict = (slotStart < busyEnd && slotEnd > busyStart)
          if (conflict) {
            console.log(`    CONFLICT: slot conflicts with busy time ${busyStart.toISOString()}-${busyEnd.toISOString()}`)
          }
          return conflict
        })
        
        if (!hasConflict && slotStart > now) {
          // Convert back to EDT for display (subtract 4 hours from UTC to get EDT)
          const localStart = new Date(slotStart.getTime() - (4 * 60 * 60 * 1000))
          const localEnd = new Date(slotEnd.getTime() - (4 * 60 * 60 * 1000))
          
          const humanReadable = `${localStart.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          })} ${localStart.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: localStart.getMinutes() === 0 ? undefined : '2-digit' 
          }).toLowerCase()}-${localEnd.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: localEnd.getMinutes() === 0 ? undefined : '2-digit' 
          }).toLowerCase()}`
          
          console.log(`    ADDING SLOT: ${humanReadable}`)
          
          availableSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            display: localStart.toLocaleString('en-US', {
              weekday: 'long',
              month: 'short', 
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }),
            humanReadable: humanReadable
          })
        } else {
          console.log(`    SKIPPING: hasConflict=${hasConflict}, futureTime=${slotStart > now}`)
        }
        
        slotStart.setTime(slotStart.getTime() + (appointmentDuration * 60 * 1000))
        
        // Safety break
        if (slotNumber > 50) {
          console.log('Breaking - too many slots generated')
          break
        }
      }
      
      console.log(`Generated ${slotNumber} slots for ${dayName}`)
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