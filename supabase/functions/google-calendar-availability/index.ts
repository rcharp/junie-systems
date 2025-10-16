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
  console.log('google-calendar-availability function called with method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Try to get user_id from request body first, then fall back to URL path
    let userId, limit, skip;
    try {
      const body = await req.json();
      userId = body.user_id;
      limit = body.limit || 3; // Default to 3 slots for faster response
      skip = body.skip || 0; // Default to 0 (no skip)
      console.log('Extracted from request body:', { userId, limit, skip });
    } catch (error) {
      // If no body or JSON parsing fails, try URL path
      const url = new URL(req.url);
      userId = url.pathname.split('/').pop();
      limit = 3;
      skip = 0;
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

    // Query only 2 days for faster response (3 slots max)
    const startDate = new Date()
    const endDate = new Date(Date.now() + (2 * 24 * 60 * 60 * 1000))
    const calendarId = calendarSettings.calendar_id || 'primary'
    
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
          return processAvailability(retryData, calendarId, calendarSettings, userProfile, startDate, limit, skip)
        }
      }
      throw new Error(`Failed to fetch calendar data: ${freeBusyData.error?.message}`)
    }

    return processAvailability(freeBusyData, calendarId, calendarSettings, userProfile, startDate, limit, skip)
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

function processAvailability(freeBusyData: any, calendarId: string, calendarSettings: any, userProfile: any, startDate: Date, limit: number, skip: number) {
  try {
    const busyTimes = freeBusyData.calendars[calendarId]?.busy || []
    const availabilityHours = calendarSettings.availability_hours || {}
    const appointmentDuration = calendarSettings.appointment_duration || 60
    const MAX_SLOTS = Math.min(limit, 3)
    const now = new Date()

    let availableSlots = []
    const userTimezone = calendarSettings.timezone || userProfile?.timezone || 'America/New_York'
    let slotsFound = 0;
    
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
      
      // Create business hours for Google Calendar query (will be converted by Claude later)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const date = currentDate.getDate()
      
      // Create business hours in the user's timezone using a simpler, more reliable approach
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`
      
      // For America/New_York timezone, we need to convert local business hours to UTC
      // September 30th is still in Daylight Saving Time (EDT = UTC-4)
      // So 9:30 AM EDT becomes 1:30 PM UTC (9:30 + 4 = 13:30)
      
      const utcStartTime = new Date(`${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00.000Z`)
      const utcEndTime = new Date(`${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00.000Z`)
      
      // Convert from local timezone to UTC (EDT offset)
      const offsetHours = 4
      utcStartTime.setUTCHours(utcStartTime.getUTCHours() + offsetHours)
      utcEndTime.setUTCHours(utcEndTime.getUTCHours() + offsetHours)
      
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
      availableSlots = availableSlots.map(slot => {
        const startDate = new Date(slot.startTime);
        const endDate = new Date(slot.endTime);
        
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
      available_slots: availableSlots.map(slot => slot.startTime)
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