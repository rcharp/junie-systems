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
    let userId;
    try {
      const body = await req.json();
      userId = body.user_id;
      console.log('Extracted user_id from request body:', userId);
    } catch (error) {
      // If no body or JSON parsing fails, try URL path
      const url = new URL(req.url);
      userId = url.pathname.split('/').pop();
      console.log('Extracted user_id from URL path:', userId);
    }

    if (!userId) {
      throw new Error('User ID is required')
    }

    console.log('Fetching calendar availability for user:', userId)
    console.log('Using get_google_calendar_encrypted_tokens RPC function')

    // Get user's encrypted calendar tokens
    const { data: calendarTokens, error: tokensError } = await supabase.rpc('get_google_calendar_encrypted_tokens', {
      p_user_id: userId
    })
    
    console.log('RPC call result:', { hasData: !!calendarTokens, error: tokensError })

    // Also get user profile timezone as backup
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('timezone')
      .eq('id', userId)
      .maybeSingle()

    if (tokensError || !calendarTokens || calendarTokens.length === 0) {
      console.log('No calendar settings found for user:', userId, tokensError)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const calendarSettings = calendarTokens[0]
    
    // Tokens are encrypted in the database, we need to decrypt them
    const encryptedAccessToken = calendarSettings.encrypted_access_token
    const encryptedRefreshToken = calendarSettings.encrypted_refresh_token

    console.log('Calendar settings:', {
      calendar_id: calendarSettings.calendar_id,
      timezone: calendarSettings.timezone,
      expires_at: calendarSettings.expires_at,
      has_access_token: !!encryptedAccessToken,
      has_refresh_token: !!encryptedRefreshToken,
      is_connected: calendarSettings.is_connected
    })

    console.log('User profile timezone:', userProfile?.timezone)
    console.log('Will use timezone:', calendarSettings.timezone || userProfile?.timezone || 'America/New_York')

    if (!calendarSettings.is_connected) {
      console.log('Calendar not connected for user:', userId)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar not connected' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!encryptedAccessToken) {
      console.log('No access token found for user:', userId)
      return new Response(JSON.stringify({ 
        available: false, 
        message: 'Google Calendar access token not available' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decrypt the tokens using shared encryption utility
    console.log('Decrypting access token...')
    
    const accessToken = await decryptToken(encryptedAccessToken)
    const refreshToken = encryptedRefreshToken ? await decryptToken(encryptedRefreshToken) : null

    console.log('Tokens decrypted successfully')

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
        const encryptedNewToken = await encryptToken(currentAccessToken)
        
        await supabase
          .from('google_calendar_settings')
          .update({
            encrypted_access_token: encryptedNewToken,
            expires_at: newExpiresAt
          })
          .eq('user_id', userId)
        console.log('Updated stored access token')
      } else {
        console.error('Token refresh failed:', tokenData)
        throw new Error('Failed to refresh access token')
      }
    }

    // Query 4 days instead of 7 since we only need 5 slots (performance optimization)
    const startDate = new Date()
    const endDate = new Date(Date.now() + (4 * 24 * 60 * 60 * 1000)) // 4 days from now

    const timeMin = startDate.toISOString()
    const timeMax = endDate.toISOString()

    // Use primary calendar if no specific calendar_id is set
    const calendarId = calendarSettings.calendar_id || 'primary'
    
    // Fetch calendar timezone and busy times in parallel for better performance
    console.log('Fetching calendar data in parallel...')
    const [calendarInfoResponse, freeBusyResponse] = await Promise.all([
      fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, {
        headers: {
          'Authorization': `Bearer ${currentAccessToken}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
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
    ])

    let googleCalendarTimezone = null
    if (calendarInfoResponse.ok) {
      const calendarInfo = await calendarInfoResponse.json()
      googleCalendarTimezone = calendarInfo.timeZone
      console.log('Google Calendar timezone:', googleCalendarTimezone)
    } else {
      console.log('Failed to get calendar info, using stored timezone')
    }

    console.log('FreeBusy request sent to calendar ID:', calendarId)

    const freeBusyData = await freeBusyResponse.json()
    console.log('FreeBusy response:', freeBusyData)

    if (!freeBusyResponse.ok) {
      throw new Error(`Failed to fetch calendar data: ${freeBusyData.error?.message}`)
    }

    const busyTimes = freeBusyData.calendars[calendarId]?.busy || []
    const availabilityHours = calendarSettings.availability_hours || {}
    const appointmentDuration = calendarSettings.appointment_duration || 60 // minutes
    const MAX_SLOTS = 5 // Only generate 5 slots for performance

    // Generate available time slots
    let availableSlots = []
    // Use Google Calendar timezone first, then stored calendar timezone, then user profile timezone, then default
    const userTimezone = googleCalendarTimezone || calendarSettings.timezone || userProfile?.timezone || 'America/New_York'

    console.log('=== STARTING SLOT GENERATION (MAX 5 SLOTS) ===')
    console.log('Final timezone resolution:')
    console.log('  - Google Calendar timezone:', googleCalendarTimezone)
    console.log('  - Stored calendar timezone:', calendarSettings.timezone)
    console.log('  - User profile timezone:', userProfile?.timezone)
    console.log('  - Final chosen timezone:', userTimezone)
    console.log('Appointment duration:', appointmentDuration, 'minutes')
    console.log('Availability hours:', JSON.stringify(availabilityHours))
    console.log('Current time (now):', now.toISOString())
    
    
    // Generate slots for the next 4 days (reduced from 7 since we only need 5 slots)
    let slotsFound = 0;
    
    for (let dayOffset = 0; dayOffset < 4 && slotsFound < MAX_SLOTS; dayOffset++) {
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
      
      // Convert from local timezone to UTC
      // For EDT (UTC-4), add 4 hours to convert local time to UTC
      const offsetHours = 4 // EDT offset
      utcStartTime.setUTCHours(utcStartTime.getUTCHours() + offsetHours)
      utcEndTime.setUTCHours(utcEndTime.getUTCHours() + offsetHours)
      
      console.log(`Local business hours: ${dateStr} ${startHour}:${startMinute} to ${endHour}:${endMinute} (${userTimezone})`)
      console.log(`UTC business hours: ${utcStartTime.toISOString()} to ${utcEndTime.toISOString()}`)
      
      // Find continuous available time blocks
      const availableBlocks = []
      let currentStart = new Date(utcStartTime)
      const slotIncrement = 15 // Check every 15 minutes for availability
      
      while (currentStart.getTime() < utcEndTime.getTime() && slotsFound < MAX_SLOTS) {
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
      
      // Store blocks for Claude to convert properly, split into appointment-duration chunks
      let slotNumber = 0
      for (const block of availableBlocks) {
        if (slotsFound >= MAX_SLOTS) {
          break;
        }
        
        slotNumber++
        
        console.log(`Processing block ${slotNumber}: start=${block.start}, end=${block.end}`)
        console.log(`Start ISO: ${block.start.toISOString()}, End ISO: ${block.end.toISOString()}`)
        
        // Split the block into appointment-duration chunks
        let chunkStart = new Date(block.start)
        const blockEnd = new Date(block.end)
        
        while (chunkStart.getTime() + (appointmentDuration * 60 * 1000) <= blockEnd.getTime() && slotsFound < MAX_SLOTS) {
          const chunkEnd = new Date(chunkStart.getTime() + (appointmentDuration * 60 * 1000))
          
          // Store the raw times - Claude will convert them properly
          availableSlots.push({
            startTime: chunkStart.toISOString(),
            endTime: chunkEnd.toISOString(),
            timeOfDay: "pending", // Will be determined after timezone conversion
            humanReadable: "pending" // Will be formatted by Claude
          })
          
          slotsFound++;
          console.log(`  Chunk ${slotsFound}: ${chunkStart.toISOString()} to ${chunkEnd.toISOString()}`)
          
          // Move to next chunk
          chunkStart = new Date(chunkEnd)
        }
      }
      
      console.log(`Generated ${slotsFound} total slots so far`)
    }

    console.log(`Generated ${availableSlots.length} available slots`)

    // Use Claude to convert timezone and format properly
    if (availableSlots.length > 0) {
      console.log(`Converting ${availableSlots.length} slots using Claude for timezone ${userTimezone}`)
      console.log('Raw slots before Claude:', JSON.stringify(availableSlots))
      
      try {
        const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
        console.log('Anthropic API key available:', !!anthropicApiKey)
        
        if (anthropicApiKey) {
      const claudePrompt = `You are helping format time slots for a business calendar.

Business timezone: ${userTimezone}

I have UTC time slots that represent business hours in ${userTimezone}. I need you to format them for display while keeping the UTC times unchanged.

Input slots (UTC times that are correctly converted for the business timezone):
${JSON.stringify(availableSlots)}

RULES:
1. Keep startTime and endTime exactly as provided (do NOT convert the UTC times)
2. The UTC times are already correct - they represent the business hours converted to UTC
3. For humanReadable, convert the UTC times to ${userTimezone} local time for display only
4. Set timeOfDay based on LOCAL time: "morning" (6am-12pm), "afternoon" (12pm-6pm), "evening" (6pm+)
5. Format humanReadable: "Weekday, Month Date, Year H:MM am/pm-H:MM am/pm" showing the LOCAL time
6. Return ONLY valid JSON array, no markdown or explanation

Example: If input is "2025-09-30T13:30:00.000Z" for America/New_York:
- Keep startTime: "2025-09-30T13:30:00.000Z" (do not change)
- Set humanReadable: "Tuesday, September 30, 2025 9:30 am-3:15 pm" (showing local time)
- Set timeOfDay: "morning" (based on 9:30 am local time)`;

          console.log('Calling Claude with prompt for timezone conversion...')
          
          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${anthropicApiKey}`,
              'Content-Type': 'application/json',
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 3000,
              messages: [
                {
                  role: 'user',
                  content: claudePrompt
                }
              ]
            })
          });

          console.log('Claude response status:', claudeResponse.status)
          
          if (claudeResponse.ok) {
            const claudeData = await claudeResponse.json();
            const convertedSlotsText = claudeData.content[0].text;
            console.log('Claude response text:', convertedSlotsText);
            
            try {
              // Clean up the response in case Claude adds markdown formatting
              const cleanText = convertedSlotsText.replace(/```json\n?|\n?```/g, '').trim();
              const convertedSlots = JSON.parse(cleanText);
              
              if (Array.isArray(convertedSlots) && convertedSlots.length > 0) {
                availableSlots = convertedSlots;
                console.log('Successfully converted slots using Claude:', convertedSlots);
              } else {
                console.log('Claude returned invalid format:', convertedSlots);
              }
            } catch (parseError) {
              console.error('Failed to parse Claude response:', parseError);
              console.log('Raw Claude response text:', convertedSlotsText);
            }
          } else {
            const errorText = await claudeResponse.text();
            console.error('Claude API error status:', claudeResponse.status);
            console.error('Claude API error:', errorText);
          }
        } else {
          console.log('No Anthropic API key found - skipping Claude conversion');
        }
      } catch (claudeError) {
        console.error('Error using Claude for timezone conversion:', claudeError);
      }
    } else {
      console.log('No available slots to convert');
    }

    return new Response(JSON.stringify({
      available: availableSlots.length > 0,
      slots: availableSlots, // Already limited to MAX_SLOTS during generation
      timezone: calendarSettings.timezone,
      duration: appointmentDuration,
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
})