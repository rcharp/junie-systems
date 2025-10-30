import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'
import { decryptToken, encryptToken } from '../_shared/encryption.ts'
import { toZonedTime, fromZonedTime } from 'https://esm.sh/date-fns-tz@3.2.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!
const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!

// 5-minute cache for availability results
const CACHE_TTL_MS = 5 * 60 * 1000
const availabilityCache = new Map<string, { data: any; timestamp: number }>()

function getCacheKey(userId: string, startDate: Date, preferredDate?: string, preferredTime?: string): string {
  return `${userId}:${startDate.toISOString()}:${preferredDate || ''}:${preferredTime || ''}`
}

function getFromCache(key: string): any | null {
  const cached = availabilityCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }
  availabilityCache.delete(key)
  return null
}

function setCache(key: string, data: any): void {
  availabilityCache.set(key, { data, timestamp: Date.now() })
  // Clean old cache entries periodically
  if (availabilityCache.size > 100) {
    const now = Date.now()
    for (const [k, v] of availabilityCache.entries()) {
      if (now - v.timestamp >= CACHE_TTL_MS) {
        availabilityCache.delete(k)
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Parse request body
    let userId, limit, skip, preferredDate, preferredTime;
    try {
      const body = await req.json();
      userId = body.user_id;
      limit = body.limit || 3;
      skip = body.skip || 0;
      preferredDate = body.preferred_date;
      preferredTime = body.preferred_time;
    } catch (error) {
      const url = new URL(req.url);
      userId = url.pathname.split('/').pop();
      limit = 3;
      skip = 0;
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Check cache first
    let startDate: Date;
    if (preferredDate && preferredTime) {
      startDate = new Date(`${preferredDate}T${preferredTime}:00Z`);
    } else if (preferredDate) {
      startDate = new Date(`${preferredDate}T09:00:00Z`);
    } else {
      startDate = new Date();
    }
    
    const cacheKey = getCacheKey(userId, startDate, preferredDate, preferredTime)
    const cachedResult = getFromCache(cacheKey)
    if (cachedResult) {
      return new Response(JSON.stringify(cachedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch calendar tokens and settings
    const [calendarTokensResult, userProfileResult] = await Promise.all([
      supabase.rpc('get_google_calendar_encrypted_tokens', { p_user_id: userId }),
      supabase.from('user_profiles').select('timezone').eq('id', userId).maybeSingle()
    ])
    
    const { data: calendarTokens, error: tokensError } = calendarTokensResult
    const { data: userProfile } = userProfileResult

    if (tokensError || !calendarTokens || calendarTokens.length === 0 || !calendarTokens[0].is_connected) {
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarSettings = calendarTokens[0]
    const accessToken = await decryptToken(calendarSettings.encrypted_access_token)
    const refreshToken = calendarSettings.encrypted_refresh_token ? await decryptToken(calendarSettings.encrypted_refresh_token) : null
    const userTimezone = calendarSettings.timezone || userProfile?.timezone || 'America/New_York'

    // Refine start date with timezone
    if (preferredDate && preferredTime) {
      startDate = fromZonedTime(`${preferredDate}T${preferredTime}:00`, userTimezone);
    } else if (preferredDate) {
      startDate = fromZonedTime(`${preferredDate}T09:00:00`, userTimezone);
    }
    
    const endDate = new Date(startDate.getTime() + (2 * 24 * 60 * 60 * 1000))
    const calendarId = calendarSettings.calendar_id || 'primary'
    
    // Call Google Calendar freeBusy API
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

    if (!freeBusyResponse.ok) {
      // Try token refresh on 401
      if (freeBusyResponse.status === 401 && refreshToken) {
        const tokenData = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
          }),
        }).then(r => r.json())

        const newAccessToken = tokenData.access_token
        
        // Update token and retry
        await Promise.all([
          supabase.from('google_calendar_settings').update({ 
            encrypted_access_token: await encryptToken(newAccessToken),
            expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          }).eq('user_id', userId),
          
          fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${newAccessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              timeMin: startDate.toISOString(),
              timeMax: endDate.toISOString(),
              items: [{ id: calendarId }],
            }),
          }).then(async r => {
            if (!r.ok) throw new Error('Failed after token refresh')
            const data = await r.json()
            const result = processAvailability(data, calendarId, calendarSettings, userProfile, startDate, limit, skip, preferredDate, preferredTime, userTimezone)
            setCache(cacheKey, result)
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          })
        ])
      }
      throw new Error('Failed to fetch calendar data')
    }

    const freeBusyData = await freeBusyResponse.json()
    const result = processAvailability(freeBusyData, calendarId, calendarSettings, userProfile, startDate, limit, skip, preferredDate, preferredTime, userTimezone)
    setCache(cacheKey, result)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
})

function processAvailability(freeBusyData: any, calendarId: string, calendarSettings: any, userProfile: any, startDate: Date, limit: number, skip: number, preferredDate?: string, preferredTime?: string, userTimezone?: string) {
  try {
    const busyTimes = freeBusyData.calendars[calendarId]?.busy || []
    const availabilityHours = calendarSettings.availability_hours || {}
    const appointmentDuration = calendarSettings.appointment_duration || 60
    const MAX_SLOTS = Math.min(limit, 3)
    const tz = userTimezone || calendarSettings.timezone || userProfile?.timezone || 'America/New_York'
    const businessNow = toZonedTime(new Date(), tz)

    let availableSlots = []
    let slotsFound = 0;
    
    // If preferred time is specified, check if that specific slot is available first
    if (preferredDate && preferredTime) {
      const [reqHour, reqMinute] = preferredTime.split(':').map(Number)
      const reqDate = new Date(preferredDate + 'T00:00:00Z')
      const dayName = reqDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase()
      const daySettings = availabilityHours[dayName]
      
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
          const localSlotStart = new Date(Date.UTC(year, month, date, reqHour, reqMinute, 0, 0))
          const utcSlotStart = fromZonedTime(localSlotStart, tz)
          const utcSlotEnd = new Date(utcSlotStart.getTime() + appointmentDuration * 60000)
          const slotInBusinessTz = toZonedTime(utcSlotStart, tz)
          const isPast = slotInBusinessTz <= businessNow
          
          if (!isPast) {
            const hasConflict = busyTimes.some((busy: any) => {
              const busyStart = new Date(busy.start)
              const busyEnd = new Date(busy.end)
              return (utcSlotStart < busyEnd && utcSlotEnd > busyStart)
            })
            
            if (!hasConflict) {
              availableSlots.push({
                startTime: utcSlotStart.toISOString(),
                endTime: utcSlotEnd.toISOString(),
                timeOfDay: "pending",
                humanReadable: "pending"
              })
              slotsFound++
            }
          }
        }
      }
    }
    
    for (let dayOffset = 0; dayOffset < 2 && slotsFound < MAX_SLOTS; dayOffset++) {
      // If a specific date was requested, only check that one date
      if (preferredDate && dayOffset > 0) {
        break;
      }
      
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + dayOffset)
      
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
      const daySettings = availabilityHours[dayName]
      
      if (!daySettings?.enabled) {
        continue
      }
      
      const [startHour, startMinute] = daySettings.start.split(':').map(Number)
      const [endHour, endMinute] = daySettings.end.split(':').map(Number)
      
      const localDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour, startMinute)
      const localDateEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour, endMinute)
      const utcStartTime = fromZonedTime(localDateStart, tz)
      const utcEndTime = fromZonedTime(localDateEnd, tz)
      
      const availableBlocks = []
      let currentStart = new Date(utcStartTime)
      const slotIncrement = 30
      
      while (currentStart.getTime() < utcEndTime.getTime() && slotsFound < MAX_SLOTS) {
        const slotEnd = new Date(currentStart.getTime() + slotIncrement * 60000)
        
        if (toZonedTime(currentStart, tz) <= businessNow) {
          currentStart.setTime(currentStart.getTime() + slotIncrement * 60000)
          continue
        }
        
        const hasConflict = busyTimes.some((busy: any) => 
          currentStart < new Date(busy.end) && slotEnd > new Date(busy.start)
        )
        
        if (!hasConflict) {
          let blockEnd = new Date(slotEnd)
          let nextSlot = new Date(slotEnd)
          
          while (nextSlot.getTime() < utcEndTime.getTime()) {
            const nextSlotEnd = new Date(nextSlot.getTime() + slotIncrement * 60000)
            if (busyTimes.some((busy: any) => nextSlot < new Date(busy.end) && nextSlotEnd > new Date(busy.start))) break
            blockEnd = nextSlotEnd
            nextSlot = nextSlotEnd
          }
          
          if (blockEnd.getTime() - currentStart.getTime() >= appointmentDuration * 60000) {
            availableBlocks.push({ start: new Date(currentStart), end: blockEnd })
          }
          currentStart = blockEnd
        } else {
          currentStart.setTime(currentStart.getTime() + slotIncrement * 60000)
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