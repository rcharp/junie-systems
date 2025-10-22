import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { decryptToken, encryptToken } from '../_shared/encryption.ts'

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
  console.log('google-calendar-availability function v2 called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Try to get user_id from request body first, then fall back to URL path
    let userId, limit, skip, preferredDate, preferredTime;
    try {
      const body = await req.json();
      userId = body.user_id;
      limit = body.limit || 3; // Default to 3 slots for faster response
      skip = body.skip || 0; // Default to 0 (no skip)
      preferredDate = body.preferred_date; // Optional preferred date
      preferredTime = body.preferred_time; // Optional preferred time
      console.log('Extracted from request body:', { userId, limit, skip, preferredDate, preferredTime });
    } catch (error) {
      // If no body or JSON parsing fails, try URL path
      const url = new URL(req.url);
      userId = url.pathname.split('/').pop();
      limit = 3;
      skip = 0;
      preferredDate = null;
      console.log('Extracted user_id from URL path:', userId);
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Fetch calendar tokens and user profile in parallel for better performance
    const [calendarTokensResult, userProfileResult] = await Promise.all([
      supabase.rpc('get_google_calendar_encrypted_tokens', { p_user_id: userId }),
      supabase.from('user_profiles').select('timezone').eq('id', userId).maybeSingle()
    ])
    
    const { data: calendarTokens, error: tokensError } = calendarTokensResult
    const { data: userProfile } = userProfileResult

    if (tokensError || !calendarTokens || calendarTokens.length === 0) {
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarSettings = calendarTokens[0]
    
    if (!calendarSettings.is_connected || !calendarSettings.encrypted_access_token) {
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decrypt tokens
    const accessToken = await decryptToken(calendarSettings.encrypted_access_token)
    const refreshToken = calendarSettings.encrypted_refresh_token ? await decryptToken(calendarSettings.encrypted_refresh_token) : null

    // Use preferred date/time if provided, otherwise query 2 days starting from now
    let startDate: Date;
    if (preferredDate && preferredTime) {
      // Combine date and time to get a specific start point
      // Need to parse carefully to preserve the time
      const dateTimeString = `${preferredDate}T${preferredTime}:00`;
      startDate = new Date(dateTimeString);
      console.log(`Using preferred date+time: ${dateTimeString}, parsed to: ${startDate.toISOString()}`);
    } else if (preferredDate) {
      startDate = new Date(preferredDate);
      console.log(`Using preferred date only: ${preferredDate}, parsed to: ${startDate.toISOString()}`);
    } else {
      startDate = new Date();
      console.log('Using current date/time as start:', startDate.toISOString());
    }
    
    const endDate = new Date(startDate.getTime() + (2 * 24 * 60 * 60 * 1000))
    const calendarId = calendarSettings.calendar_id || 'primary'
    console.log('Searching availability from', startDate.toISOString(), 'to', endDate.toISOString())
    
    // Fetch freeBusy data only (skip calendar info call - we already have timezone)
    const freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        items: [{ id: calendarId }],
      }),
    })

    const freeBusyData = await freeBusyResponse.json()

    if (!freeBusyResponse.ok) {
      // Try to refresh token if unauthorized
      if (freeBusyResponse.status === 401 && refreshToken) {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        })

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          const newAccessToken = tokenData.access_token
          const newExpiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
          
          // Update stored token
          const encryptedNewToken = await encryptToken(newAccessToken)
          await supabase
            .from('google_calendar_settings')
            .update({ encrypted_access_token: encryptedNewToken, expires_at: newExpiresAt })
            .eq('user_id', userId)
          
          // Retry freeBusy request with new token
          const retryResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newAccessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeMin: startDate.toISOString(),
              timeMax: endDate.toISOString(),
              items: [{ id: calendarId }],
            }),
          })
          
          if (!retryResponse.ok) {
            throw new Error(`Failed to fetch calendar data after token refresh`)
          }
          
          const retryData = await retryResponse.json()
          return processAvailability(retryData, calendarId, calendarSettings, userProfile, startDate, limit, skip, preferredDate, preferredTime)
        }
      }
      throw new Error(`Failed to fetch calendar data: ${freeBusyData.error?.message}`)
    }

    return processAvailability(freeBusyData, calendarId, calendarSettings, userProfile, startDate, limit, skip, preferredDate, preferredTime)
  } catch (error) {
    console.error('Error in google-calendar-availability function:', error)
    return new Response(JSON.stringify({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function processAvailability(freeBusyData: any, calendarId: string, calendarSettings: any, userProfile: any, startDate: Date, limit: number, skip: number, preferredDate?: string, preferredTime?: string) {
  try {
    const busyTimes = freeBusyData.calendars[calendarId]?.busy || []
    const availabilityHours = calendarSettings.availability_hours || {}
    const appointmentDuration = calendarSettings.appointment_duration || 60
    const MAX_SLOTS = Math.min(limit, 3)
    const now = new Date()

    let availableSlots = []
    const userTimezone = calendarSettings.timezone || userProfile?.timezone || 'America/New_York'
    let slotsFound = 0;
    
    // If preferred time is specified, check if that specific slot is available first
    if (preferredDate && preferredTime) {
      const [reqHour, reqMinute] = preferredTime.split(':').map(Number)
      // Parse date correctly by adding T00:00:00Z to ensure UTC parsing
      const reqDate = new Date(preferredDate + 'T00:00:00Z')
      const dayName = reqDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase()
      const daySettings = availabilityHours[dayName]
      
      console.log(`Checking if preferred time ${preferredTime} on ${preferredDate} (${dayName}) is available`)
      
      if (daySettings?.enabled) {
        const [dayStartHour, dayStartMinute] = daySettings.start.split(':').map(Number)
        const [dayEndHour, dayEndMinute] = daySettings.end.split(':').map(Number)
        
        // Check if requested time is within working hours
        const reqMinutes = reqHour * 60 + reqMinute
        const startMinutes = dayStartHour * 60 + dayStartMinute
        const endMinutes = dayEndHour * 60 + dayEndMinute
        
        if (reqMinutes >= startMinutes && reqMinutes + appointmentDuration <= endMinutes) {
          // Create a local time for the requested slot in the user's timezone
          // We need to create it as if it's a local date, then convert to UTC
          const year = reqDate.getUTCFullYear()
          const month = reqDate.getUTCMonth()
          const date = reqDate.getUTCDate()
          
          // Create date as local (using Date constructor which creates in local/system timezone)
          // But we want it in the USER'S timezone, so we need to be careful
          // Actually, let's create a UTC date representing the local time in the user's timezone
          const localSlotStart = new Date(Date.UTC(year, month, date, 0, 0, 0))
          
          // Now add the hours and minutes
          localSlotStart.setUTCHours(reqHour, reqMinute, 0, 0)
          
          const offsetMs = getTimezoneOffsetMs(userTimezone, localSlotStart)
          const utcSlotStart = new Date(localSlotStart.getTime() - offsetMs)
          const utcSlotEnd = new Date(utcSlotStart.getTime() + (appointmentDuration * 60 * 1000))
          
          console.log(`Checking slot: ${utcSlotStart.toISOString()} to ${utcSlotEnd.toISOString()}`)
          
          // Check if it's in the past
          if (utcSlotStart > now) {
            // Check if there's a conflict
            const hasConflict = busyTimes.some((busy: any) => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              const conflict = (utcSlotStart < busyEnd && utcSlotEnd > busyStart)
              if (conflict) {
                console.log(`Conflict found with busy period: ${busyStart.toISOString()} to ${busyEnd.toISOString()}`)
              }
              return conflict
            })
            
            if (!hasConflict) {
              console.log(`✓ Preferred time ${preferredTime} is available!`)
              console.log(`Adding slot: ${utcSlotStart.toISOString()} to ${utcSlotEnd.toISOString()}`)
              // Store as UTC times (which is what the rest of the code expects)
              const slotToAdd = {
                startTime: utcSlotStart.toISOString(),
                endTime: utcSlotEnd.toISOString(),
                timeOfDay: "pending",
                humanReadable: "pending"
              };
              console.log(`Slot object:`, JSON.stringify(slotToAdd))
              availableSlots.push(slotToAdd)
              slotsFound++
            } else {
              console.log(`✗ Preferred time ${preferredTime} is not available (conflict)`)
            }
          } else {
            console.log(`✗ Preferred time ${preferredTime} is in the past`)
          }
        } else {
          console.log(`✗ Preferred time ${preferredTime} is outside working hours (${daySettings.start}-${daySettings.end})`)
        }
      } else {
        console.log(`✗ ${dayName} is not enabled for appointments`)
      }
    }
    
    for (let dayOffset = 0; dayOffset < 2 && slotsFound < MAX_SLOTS; dayOffset++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]
      
      if (!daySettings?.enabled) {
        continue
      }
      
      const [startHour, startMinute] = daySettings.start.split(':').map(Number)
      const [endHour, endMinute] = daySettings.end.split(':').map(Number)
      
      // Create date in local timezone, then convert to UTC for API query
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      
      // Create a date object in the user's timezone
      const localDateStart = new Date(year, month, date, startHour, startMinute, 0)
      const localDateEnd = new Date(year, month, date, endHour, endMinute, 0)
      
      // Get the timezone offset for this specific date (handles DST)
      const offsetMs = getTimezoneOffsetMs(userTimezone, localDateStart)
      
      // Convert to UTC by subtracting the offset
      const utcStartTime = new Date(localDateStart.getTime() - offsetMs)
      const utcEndTime = new Date(localDateEnd.getTime() - offsetMs)
      
      console.log(`Day ${dayOffset} (${dayName}): Local ${localDateStart.toISOString()} -> UTC ${utcStartTime.toISOString()}`)
      
      // Find continuous available time blocks (using 30-min increments for speed)
      const availableBlocks = []
      let currentStart = new Date(utcStartTime)
      const slotIncrement = 30
      
      while (currentStart.getTime() < utcEndTime.getTime() && slotsFound < MAX_SLOTS) {
        const slotEnd = new Date(currentStart.getTime() + (slotIncrement * 60 * 1000))
        
        if (currentStart <= now) {
          currentStart.setTime(currentStart.getTime() + (slotIncrement * 60 * 1000))
          continue
        }
        
        const hasConflict = busyTimes.some((busy: any) => {
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return (currentStart < busyEnd && slotEnd > busyStart)
        })
        
        if (!hasConflict) {
          let blockStart = new Date(currentStart)
          let blockEnd = new Date(slotEnd)
          
          let nextSlot = new Date(slotEnd)
          while (nextSlot.getTime() < utcEndTime.getTime()) {
            const nextSlotEnd = new Date(nextSlot.getTime() + (slotIncrement * 60 * 1000))
            
            const nextHasConflict = busyTimes.some((busy: any) => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              return (nextSlot < busyEnd && nextSlotEnd > busyStart)
            })
            
            if (nextHasConflict) break
            
            blockEnd = new Date(nextSlotEnd)
            nextSlot.setTime(nextSlot.getTime() + (slotIncrement * 60 * 1000))
          }
          
          const blockDuration = blockEnd.getTime() - blockStart.getTime()
          if (blockDuration >= (appointmentDuration * 60 * 1000)) {
            availableBlocks.push({ start: blockStart, end: blockEnd })
          }
          
          currentStart = new Date(blockEnd)
        } else {
          currentStart.setTime(currentStart.getTime() + (slotIncrement * 60 * 1000))
        }
      }
      
      for (const block of availableBlocks) {
        if (slotsFound >= MAX_SLOTS) break
        
        let chunkStart = new Date(block.start)
        const blockEnd = new Date(block.end)
        
        let skippedInBlock = 0
        while (chunkStart.getTime() + (appointmentDuration * 60 * 1000) <= blockEnd.getTime() && slotsFound < MAX_SLOTS) {
          const chunkEnd = new Date(chunkStart.getTime() + (appointmentDuration * 60 * 1000))
          
          if (skippedInBlock < skip) {
            skippedInBlock++
            chunkStart = new Date(chunkEnd)
            continue
          }
          
          availableSlots.push({
            startTime: chunkStart.toISOString(),
            endTime: chunkEnd.toISOString(),
            timeOfDay: "pending",
            humanReadable: "pending"
          })
          
          slotsFound++
          chunkStart = new Date(chunkEnd)
        }
        
        skip = Math.max(0, skip - skippedInBlock)
      }
    }

    // Format slots with basic timezone conversion (no Claude API)
    if (availableSlots.length > 0) {
      console.log(`Formatting ${availableSlots.length} slots:`, JSON.stringify(availableSlots))
      availableSlots = availableSlots.map(slot => {
        console.log(`Processing slot:`, JSON.stringify(slot))
        const startDate = new Date(slot.startTime);
        const endDate = new Date(slot.endTime);
        console.log(`Parsed dates: ${startDate.toISOString()} - ${endDate.toISOString()}`)
        
        // Format in user's timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        const timeFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        const startFormatted = formatter.format(startDate);
        const endTimeFormatted = timeFormatter.format(endDate);
        
        // Get hour for timeOfDay
        const localHour = parseInt(new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          hour: 'numeric',
          hour12: false
        }).format(startDate));
        
        let timeOfDay = 'morning';
        if (localHour >= 18) {
          timeOfDay = 'evening';
        } else if (localHour >= 12) {
          timeOfDay = 'afternoon';
        }
        
        // Combine date and time range
        const datePart = startFormatted.split(' at ')[0];
        const startTimePart = timeFormatter.format(startDate);
        const humanReadable = `${datePart} ${startTimePart}-${endTimeFormatted}`;
        
        return {
          startTime: slot.startTime,
          endTime: slot.endTime,
          timeOfDay,
          humanReadable,
          formatted: humanReadable
        };
      });
    }

    return new Response(JSON.stringify({
      available: availableSlots.length > 0,
      slots: availableSlots,
      timezone: userTimezone,
      duration: appointmentDuration,
      message: availableSlots.length > 0 ? `Found ${availableSlots.length} available slots` : 'No available slots found'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in google-calendar-availability function:', error)
    return new Response(JSON.stringify({ 
      available: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}