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
    console.log('Current time (now):', now.toISOString())
    
    // Generate slots for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]
      
      console.log(`--- Day ${dayOffset + 1}: ${dayName} (${currentDate.toDateString()}) ---`)
      
      if (!daySettings?.enabled) {
        console.log(`Skipping ${dayName} - not enabled`)
        continue
      }
      
      const [startHour, startMinute] = daySettings.start.split(':').map(Number)
      const [endHour, endMinute] = daySettings.end.split(':').map(Number)
      
      console.log(`Processing ${dayName}: ${startHour}:${startMinute} to ${endHour}:${endMinute} in ${userTimezone}`)
      
      // Create business hours in EDT/EST and convert to UTC
      // EDT = UTC-4, so 9:00 AM EDT becomes 13:00 UTC
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      
      // Create dates in the local timezone (this creates them in the server's timezone, but we'll adjust)
      const localStartTime = new Date(year, month, date, startHour, startMinute, 0, 0)
      const localEndTime = new Date(year, month, date, endHour, endMinute, 0, 0)
      
      // Convert to UTC by treating them as if they were already in the target timezone
      // For America/New_York, add 4 hours during EDT season (or 5 during EST)
      const utcStartTime = new Date(localStartTime.getTime() + (4 * 60 * 60 * 1000))
      const utcEndTime = new Date(localEndTime.getTime() + (4 * 60 * 60 * 1000))
      
      console.log(`Business hours in UTC: ${utcStartTime.toISOString()} to ${utcEndTime.toISOString()}`)
      
      // Find continuous available time blocks
      const availableBlocks = []
      let currentStart = new Date(utcStartTime)
      const slotIncrement = 15 // Check every 15 minutes for availability
      
      while (currentStart.getTime() < utcEndTime.getTime()) {
        // Check if current 15-minute slot is available
        const slotEnd = new Date(currentStart.getTime() + (slotIncrement * 60 * 1000))
        
        // Skip if in the past
        if (currentStart <= now) {
          currentStart.setTime(currentStart.getTime() + (slotIncrement * 60 * 1000))
          continue
        }
        
        // Check for conflicts with busy times
        const hasConflict = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return (currentStart < busyEnd && slotEnd > busyStart)
        })
        
        if (!hasConflict) {
          // Start a new available block
          let blockStart = new Date(currentStart)
          let blockEnd = new Date(slotEnd)
          
          // Extend the block as far as possible
          let nextSlot = new Date(slotEnd)
          while (nextSlot.getTime() < utcEndTime.getTime()) {
            const nextSlotEnd = new Date(nextSlot.getTime() + (slotIncrement * 60 * 1000))
            
            // Check if next slot is also available
            const nextHasConflict = busyTimes.some((busy: any) => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              return (nextSlot < busyEnd && nextSlotEnd > busyStart)
            })
            
            if (nextHasConflict) {
              break // Stop extending the block
            }
            
            blockEnd = new Date(nextSlotEnd)
            nextSlot.setTime(nextSlot.getTime() + (slotIncrement * 60 * 1000))
          }
          
          // Only add blocks that are at least as long as the appointment duration
          const blockDuration = blockEnd.getTime() - blockStart.getTime()
          if (blockDuration >= (appointmentDuration * 60 * 1000)) {
            availableBlocks.push({
              start: blockStart,
              end: blockEnd
            })
          }
          
          // Move to the end of this block
          currentStart = new Date(blockEnd)
        } else {
          // Move to next 15-minute slot
          currentStart.setTime(currentStart.getTime() + (slotIncrement * 60 * 1000))
        }
      }
      
      // Convert blocks to slots
      let slotNumber = 0
      for (const block of availableBlocks) {
        slotNumber++
        
        // Convert back to local time for display
        const displayStartTime = new Date(block.start.getTime() - (4 * 60 * 60 * 1000))
        const displayEndTime = new Date(block.end.getTime() - (4 * 60 * 60 * 1000))
        
        const humanReadable = `${displayStartTime.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })} ${displayStartTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: displayStartTime.getMinutes() === 0 ? undefined : '2-digit' 
        }).toLowerCase()}-${displayEndTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: displayEndTime.getMinutes() === 0 ? undefined : '2-digit' 
        }).toLowerCase()}`
        
        console.log(`  Block ${slotNumber}: ${humanReadable}`)
        console.log(`    UTC: ${block.start.toISOString()} to ${block.end.toISOString()}`)
        console.log(`    Local: ${displayStartTime.toString()} to ${displayEndTime.toString()}`)
        
        // Determine time of day tag based on the START time of the slot
        const startHour = displayStartTime.getHours()
        let timeOfDay: string
        if (startHour >= 6 && startHour < 12) {
          timeOfDay = "morning"
        } else if (startHour >= 12 && startHour < 18) {
          timeOfDay = "afternoon" 
        } else {
          timeOfDay = "evening"
        }
        
        console.log(`    Time of day for ${startHour}:xx = ${timeOfDay}`)
        
        availableSlots.push({
          start: displayStartTime.toISOString(),
          end: displayEndTime.toISOString(),
          display: displayStartTime.toLocaleString('en-US', {
            weekday: 'long',
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }),
          humanReadable: humanReadable,
          timeOfDay: timeOfDay
        })
      }
      
      console.log(`Generated ${availableSlots.length} total slots so far`)
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