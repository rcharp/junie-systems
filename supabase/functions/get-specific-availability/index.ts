import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { toZonedTime, fromZonedTime, format } from 'https://esm.sh/date-fns-tz@3.2.0';
import { decryptToken, encryptToken } from '../_shared/encryption.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 5-minute cache
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, date, time } = await req.json();

    if (!business_id || (!date && !time)) {
      return new Response(
        JSON.stringify({ error: 'business_id and at least date or time are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

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
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const cacheKey = getCacheKey(businessSettings.user_id, date, time);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch calendar tokens using user_id
    const { data: calendarTokens, error: tokensError } = await supabase.rpc(
      'get_google_calendar_encrypted_tokens',
      { p_user_id: businessSettings.user_id }
    );

    if (tokensError || !calendarTokens || calendarTokens.length === 0 || !calendarTokens[0].is_connected) {
      return new Response(
        JSON.stringify({ 
          success: false,
          available_slots: [],
          message: 'Google Calendar not connected' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarSettings = calendarTokens[0];
    const userTimezone = calendarSettings.timezone || businessSettings.business_timezone;
    
    // Build optimized date range - only query what we need
    let startDate: Date;
    if (date && time) {
      startDate = fromZonedTime(`${date}T${time}:00`, userTimezone);
    } else if (date) {
      startDate = fromZonedTime(`${date}T09:00:00`, userTimezone);
    } else {
      startDate = new Date();
    }
    // Only query 1 day ahead instead of 2 to reduce API response time
    const endDate = new Date(startDate.getTime() + (24 * 60 * 60 * 1000));
    
    // Decrypt tokens in parallel with building date range
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

    // Token refresh
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
      throw new Error('Failed to fetch calendar data');
    }

    const freeBusyData = await freeBusyResponse.json();
    const busyTimes = freeBusyData.calendars[calendarId]?.busy || [];
    const availabilityHours = calendarSettings.availability_hours || {};
    const appointmentDuration = calendarSettings.appointment_duration || 60;
    const businessNow = toZonedTime(new Date(), userTimezone);

    // If specific time is requested, check if it's available first
    if (date && time) {
      const requestedDateTime = fromZonedTime(`${date}T${time}:00`, userTimezone);
      const requestedEndTime = new Date(requestedDateTime.getTime() + appointmentDuration * 60000);
      
      // Check if requested time is in the past
      if (toZonedTime(requestedDateTime, userTimezone) > businessNow) {
        // Check if requested time has any conflicts
        const hasConflict = busyTimes.some((busy: any) => 
          requestedDateTime < new Date(busy.end) && requestedEndTime > new Date(busy.start)
        );
        
        // Check if requested time is within business hours
        const dayName = requestedDateTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        const daySettings = availabilityHours[dayName];
        
        if (daySettings?.enabled && !hasConflict) {
          const [startHour, startMinute] = daySettings.start.split(':').map(Number);
          const [endHour, endMinute] = daySettings.end.split(':').map(Number);
          
          const localDateStart = new Date(requestedDateTime.getFullYear(), requestedDateTime.getMonth(), requestedDateTime.getDate(), startHour, startMinute);
          const localDateEnd = new Date(requestedDateTime.getFullYear(), requestedDateTime.getMonth(), requestedDateTime.getDate(), endHour, endMinute);
          const utcStartTime = fromZonedTime(localDateStart, userTimezone);
          const utcEndTime = fromZonedTime(localDateEnd, userTimezone);
          
          if (requestedDateTime >= utcStartTime && requestedEndTime <= utcEndTime) {
            // Requested time is available - return success only
            const result = {
              success: true,
              available: true,
              timezone: userTimezone,
              requested_date: date,
              requested_time: time,
              message: 'Requested time is available',
            };
            
            setCache(cacheKey, result);
            
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }
    }

    // If we reach here, either no specific time was requested or it wasn't available
    // Find alternative available slots
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
          const formatted = format(zonedStart, 'PPPp', { timeZone: userTimezone });
          
          availableSlots.push({
            startTime: currentStart.toISOString(),
            endTime: slotEnd.toISOString(),
            formatted
          });
        }
        
        currentStart.setTime(currentStart.getTime() + slotIncrement * 60000);
      }
    }

    const result = {
      success: availableSlots.length > 0,
      available: availableSlots.length > 0,
      timezone: userTimezone,
      requested_date: date,
      requested_time: time,
      available_slots: availableSlots,
      message: date && time 
        ? `Requested time not available. ${availableSlots.length > 0 ? `Found ${availableSlots.length} alternative slots` : 'No alternative slots available'}`
        : availableSlots.length > 0 ? `Found ${availableSlots.length} available slots` : 'No available slots',
    };
    
    setCache(cacheKey, result);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in get-specific-availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
