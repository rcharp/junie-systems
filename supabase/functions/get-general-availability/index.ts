import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { toZonedTime, fromZonedTime, format } from 'https://esm.sh/date-fns-tz@3.2.0';
import { decryptToken, encryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 5-minute cache for availability results
const CACHE_TTL_MS = 5 * 60 * 1000;
const availabilityCache = new Map<string, { data: any; timestamp: number }>();

function getCacheKey(userId: string, date: string, time?: string): string {
  return `${userId}:${date}:${time || ''}`;
}

function getFromCache(key: string): any | null {
  const cached = availabilityCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  availabilityCache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  availabilityCache.set(key, { data, timestamp: Date.now() });
}

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Helper function to parse natural language dates
function parseNaturalLanguageDate(input: string, timezone: string): { date?: string; time?: string } {
  const lowerInput = input.toLowerCase().trim();
  const now = new Date();
  const businessNow = toZonedTime(now, timezone);
  
  const currentYear = parseInt(format(businessNow, 'yyyy', { timeZone: timezone }));
  const currentMonth = parseInt(format(businessNow, 'M', { timeZone: timezone })) - 1;
  const currentDate = parseInt(format(businessNow, 'd', { timeZone: timezone }));
  const currentDay = parseInt(format(businessNow, 'i', { timeZone: timezone }));
  
  let targetDate = new Date(currentYear, currentMonth, currentDate);
  let timeString: string | undefined;

  // Parse date patterns
  if (lowerInput.match(/(\d+|two|three|four)\s+(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)/)) {
    const match = lowerInput.match(/(\d+|two|three|four)\s+(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)/);
    if (match) {
      const numberWords: { [key: string]: number } = { 'two': 2, 'three': 3, 'four': 4 };
      const occurrences = isNaN(parseInt(match[1])) ? numberWords[match[1]] : parseInt(match[1]);
      const dayName = match[2].replace(/s$/, '');
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const targetDay = days.indexOf(dayName) + 1;
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      daysToAdd += (occurrences - 1) * 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.match(/(\d+|two|three|four)\s+weeks?/)) {
    const match = lowerInput.match(/(\d+|two|three|four)\s+weeks?/);
    if (match) {
      const numberWords: { [key: string]: number } = { 'two': 2, 'three': 3, 'four': 4 };
      const numWeeks = isNaN(parseInt(match[1])) ? numberWords[match[1]] : parseInt(match[1]);
      targetDate.setDate(targetDate.getDate() + (numWeeks * 7));
    }
  } else if (lowerInput.match(/(\d+|two|three|four)\s+days?/)) {
    const match = lowerInput.match(/(\d+|two|three|four)\s+days?/);
    if (match) {
      const numberWords: { [key: string]: number } = { 'two': 2, 'three': 3, 'four': 4 };
      const numDays = isNaN(parseInt(match[1])) ? numberWords[match[1]] : parseInt(match[1]);
      targetDate.setDate(targetDate.getDate() + numDays);
    }
  } else if (lowerInput.match(/next week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const match = lowerInput.match(/next week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]) + 1;
      let daysToAdd = targetDay - currentDay + 7;
      if (daysToAdd < 7) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const match = lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]) + 1;
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.includes('next week')) {
    const daysUntilMonday = currentDay === 7 ? 1 : 8 - currentDay;
    targetDate.setDate(targetDate.getDate() + daysUntilMonday);
  } else if (lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const match = lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]) + 1;
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // Parse time
  if (lowerInput.includes('morning')) {
    timeString = '09:00';
  } else if (lowerInput.includes('afternoon')) {
    timeString = '14:00';
  } else if (lowerInput.includes('evening')) {
    timeString = '18:00';
  } else if (lowerInput.includes('noon')) {
    timeString = '12:00';
  }

  const dateString = format(targetDate, 'yyyy-MM-dd', { timeZone: timezone });
  return { date: dateString, time: timeString };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, natural_language } = await req.json();

    if (!business_id || !natural_language) {
      return new Response(
        JSON.stringify({ error: 'business_id and natural_language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
          );
          const googleClientId = Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!;
          const googleClientSecret = Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!;

          // Fetch business settings first to get user_id
          const { data: businessSettings, error: businessError } = await supabase
            .from('business_settings')
            .select('user_id, business_timezone')
            .eq('id', business_id)
            .single();

          if (businessError || !businessSettings) {
            sendEvent({ status: 'error', error: 'Business not found' });
            controller.close();
            return;
          }

          // Parse natural language
          const parsed = parseNaturalLanguageDate(natural_language, businessSettings.business_timezone);
          const cacheKey = getCacheKey(businessSettings.user_id, parsed.date!, parsed.time);
          
          // Check cache
          const cached = getFromCache(cacheKey);
          if (cached) {
            sendEvent({ status: 'complete', ...cached });
            controller.close();
            return;
          }

          // Fetch calendar tokens using user_id
          const { data: calendarTokens, error: tokensError } = await supabase.rpc(
            'get_google_calendar_encrypted_tokens',
            { p_user_id: businessSettings.user_id }
          );

          if (tokensError || !calendarTokens || calendarTokens.length === 0 || !calendarTokens[0].is_connected) {
            sendEvent({ 
              status: 'complete',
              success: false,
              available_slots: [],
              message: 'Google Calendar not connected' 
            });
            controller.close();
            return;
          }

          const calendarSettings = calendarTokens[0];
          const userTimezone = calendarSettings.timezone || businessSettings.business_timezone;
          
          // Build optimized date range - only query what we need
          let startDate: Date;
          if (parsed.date && parsed.time) {
            startDate = fromZonedTime(`${parsed.date}T${parsed.time}:00`, userTimezone);
          } else if (parsed.date) {
            startDate = fromZonedTime(`${parsed.date}T09:00:00`, userTimezone);
          } else {
            startDate = new Date();
          }
          // Only query 1 day ahead instead of 2 to reduce API response time
          const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000));
          
          // Decrypt tokens in parallel
          let [accessToken, refreshToken] = await Promise.all([
            decryptToken(calendarSettings.encrypted_access_token),
            calendarSettings.encrypted_refresh_token ? decryptToken(calendarSettings.encrypted_refresh_token) : Promise.resolve(null)
          ]);
          const calendarId = calendarSettings.calendar_id || 'primary';
    
          // Call Google Calendar API
          let freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
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
          });

          // Token refresh logic
          if (!freeBusyResponse.ok && freeBusyResponse.status === 401 && refreshToken) {
            const tokenData = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: googleClientId,
                client_secret: googleClientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
              }),
            }).then(r => r.json());

            accessToken = tokenData.access_token;
            await supabase.from('google_calendar_settings').update({ 
              encrypted_access_token: await encryptToken(accessToken),
              expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
            }).eq('user_id', businessSettings.user_id);
            
            freeBusyResponse = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                items: [{ id: calendarId }],
              }),
            });
          }

          if (!freeBusyResponse.ok) {
            sendEvent({ status: 'error', error: 'Failed to fetch calendar data' });
            controller.close();
            return;
          }

          // Send immediate success response
          sendEvent({ status: 'success', message: 'Calendar data fetched successfully' });

          const freeBusyData = await freeBusyResponse.json();
          const busyTimes = freeBusyData.calendars[calendarId]?.busy || [];
          const availabilityHours = calendarSettings.availability_hours || {};
          const appointmentDuration = calendarSettings.appointment_duration || 60;
          const businessNow = toZonedTime(new Date(), userTimezone);

          // Find available slots
          const availableSlots = [];
          const MAX_SLOTS = 3;
          
          for (let dayOffset = 0; dayOffset < 1 && availableSlots.length < MAX_SLOTS; dayOffset++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + dayOffset);
            
            const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            const daySettings = availabilityHours[dayName];
            
            if (!daySettings?.enabled) continue;
            
            const [startHour, startMinute] = daySettings.start.split(':').map(Number);
            const [endHour, endMinute] = daySettings.end.split(':').map(Number);
            
            const localDateStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), startHour, startMinute);
            const localDateEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), endHour, endMinute);
            const utcStartTime = fromZonedTime(localDateStart, userTimezone);
            const utcEndTime = fromZonedTime(localDateEnd, userTimezone);
            
            let currentStart = new Date(utcStartTime);
            const slotIncrement = 30;
            
            while (currentStart.getTime() < utcEndTime.getTime() && availableSlots.length < MAX_SLOTS) {
              const slotEnd = new Date(currentStart.getTime() + appointmentDuration * 60000);
              
              if (toZonedTime(currentStart, userTimezone) <= businessNow || slotEnd.getTime() > utcEndTime.getTime()) {
                currentStart.setTime(currentStart.getTime() + slotIncrement * 60000);
                continue;
              }
              
              const hasConflict = busyTimes.some((busy: any) => 
                currentStart < new Date(busy.end) && slotEnd > new Date(busy.start)
              );
              
              if (!hasConflict) {
                const zonedStart = toZonedTime(currentStart, userTimezone);
                const dayName = format(zonedStart, 'EEEE', { timeZone: userTimezone });
                const monthName = format(zonedStart, 'MMMM', { timeZone: userTimezone });
                const day = parseInt(format(zonedStart, 'd', { timeZone: userTimezone }));
                const time = format(zonedStart, 'h:mmaaa', { timeZone: userTimezone }).toLowerCase();
                const localHour = parseInt(format(zonedStart, 'H', { timeZone: userTimezone }));
                
                let timeOfDay = 'morning';
                if (localHour >= 18) timeOfDay = 'evening';
                else if (localHour >= 12) timeOfDay = 'afternoon';
                
                availableSlots.push({
                  startTime: currentStart.toISOString(),
                  endTime: slotEnd.toISOString(),
                  timeOfDay,
                  humanReadable: `${dayName}, ${monthName} ${day}${getOrdinalSuffix(day)} at ${time}`
                });
              }
              
              currentStart.setTime(currentStart.getTime() + slotIncrement * 60000);
            }
          }

          const result = {
            success: true,
            timezone: userTimezone,
            time_available: parsed.time ? availableSlots.some(slot => {
              const slotTime = new Date(slot.startTime);
              return `${slotTime.getUTCHours().toString().padStart(2, '0')}:${slotTime.getUTCMinutes().toString().padStart(2, '0')}` === parsed.time;
            }) : null,
            available_slots: availableSlots,
          };
          
          setCache(cacheKey, result);
          
          // Send final result
          sendEvent({ status: 'complete', ...result });
          controller.close();
        } catch (error) {
          console.error('Error in SSE stream:', error);
          sendEvent({ status: 'error', error: error.message });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error in get-general-availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});