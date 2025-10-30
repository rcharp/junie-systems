import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { toZonedTime, format } from 'https://esm.sh/date-fns-tz@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to parse natural language dates
function parseNaturalLanguageDate(input: string, timezone: string): { date?: string; time?: string } {
  const lowerInput = input.toLowerCase().trim();

  // Get current time in business timezone - this is our reference point
  const now = new Date();
  const businessNow = toZonedTime(now, timezone);
  
  // Extract date components in the business timezone
  const currentYear = parseInt(format(businessNow, 'yyyy', { timeZone: timezone }));
  const currentMonth = parseInt(format(businessNow, 'M', { timeZone: timezone })) - 1; // 0-indexed
  const currentDate = parseInt(format(businessNow, 'd', { timeZone: timezone }));
  const currentDay = parseInt(format(businessNow, 'i', { timeZone: timezone })); // day of week (1=Monday, 7=Sunday)
  
  // Create target date starting from business timezone's current date
  let targetDate = new Date(currentYear, currentMonth, currentDate);
  let timeString: string | undefined;

  // Parse date-related keywords - ORDER MATTERS: most specific patterns FIRST!
  // Check compound patterns with numbers/words + days/weeks BEFORE simple keywords
  if (lowerInput.match(/(\d+|two|three|four)\s+(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\s*(from\s+(now|today))?/)) {
    // Handle "two fridays from now", "3 mondays from today", etc. - CHECK THIS FIRST!
    const match = lowerInput.match(/(\d+|two|three|four)\s+(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\s*(from\s+(now|today))?/);
    if (match) {
      console.log('Matched day count pattern:', match);
      const numberWords: { [key: string]: number } = { 'two': 2, 'three': 3, 'four': 4 };
      const occurrences = isNaN(parseInt(match[1])) ? numberWords[match[1]] : parseInt(match[1]);
      const dayName = match[2].replace(/s$/, ''); // Remove plural 's'
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const targetDay = days.indexOf(dayName) + 1; // 1=Monday, 7=Sunday
      const todayDayOfWeek = currentDay; // Already in 1-7 format from above
      
      console.log(`Looking for ${occurrences} occurrences of ${dayName}, current day: ${todayDayOfWeek}, target day: ${targetDay}`);
      
      // Find the first occurrence
      let daysToAdd = targetDay - todayDayOfWeek;
      if (daysToAdd <= 0) daysToAdd += 7;
      
      // Add additional weeks for the nth occurrence
      daysToAdd += (occurrences - 1) * 7;
      
      console.log(`Adding ${daysToAdd} days`);
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.match(/(\d+|two|three|four)\s+(weeks?)\s*(from\s+(now|today))?/)) {
    // Handle "2 weeks from now", "3 weeks", etc.
    const match = lowerInput.match(/(\d+|two|three|four)\s+(weeks?)\s*(from\s+(now|today))?/);
    if (match) {
      console.log('Matched weeks pattern:', match);
      const numberWords: { [key: string]: number } = { 'two': 2, 'three': 3, 'four': 4 };
      const numWeeks = isNaN(parseInt(match[1])) ? numberWords[match[1]] : parseInt(match[1]);
      targetDate.setDate(targetDate.getDate() + (numWeeks * 7));
    }
  } else if (lowerInput.match(/(\d+|two|three|four)\s+(days?)\s*(from\s+(now|today))?/)) {
    // Handle "2 days from now", "3 days", etc.
    const match = lowerInput.match(/(\d+|two|three|four)\s+(days?)\s*(from\s+(now|today))?/);
    if (match) {
      console.log('Matched days pattern:', match);
      const numberWords: { [key: string]: number } = { 'two': 2, 'three': 3, 'four': 4 };
      const numDays = isNaN(parseInt(match[1])) ? numberWords[match[1]] : parseInt(match[1]);
      targetDate.setDate(targetDate.getDate() + numDays);
    }
  } else if (lowerInput.match(/next week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    // Handle "next week friday", "next week monday", etc.
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const match = lowerInput.match(/next week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]) + 1; // 1=Monday, 7=Sunday
      // Always go to next week (minimum 7 days)
      let daysToAdd = targetDay - currentDay + 7;
      if (daysToAdd < 7) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const match = lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]) + 1; // 1=Monday, 7=Sunday
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.includes('next week')) {
    // "next week" means the first day of the next calendar week (Monday)
    // Days until next Monday (1 = Monday in our 1-7 system)
    const daysUntilMonday = currentDay === 7 ? 1 : 8 - currentDay; // If Sunday (7), add 1 day; otherwise 8 - current day
    targetDate.setDate(targetDate.getDate() + daysUntilMonday);
  } else if (lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    // Simple day name - check after "next [day]"
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const match = lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]) + 1; // 1=Monday, 7=Sunday
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lowerInput.includes('today')) {
    // Keep current date - check this LAST since it's most generic
  }

  // Parse time-related keywords
  if (lowerInput.includes('morning')) {
    timeString = '09:00';
  } else if (lowerInput.includes('afternoon')) {
    timeString = '14:00';
  } else if (lowerInput.includes('evening')) {
    timeString = '18:00';
  } else if (lowerInput.includes('noon')) {
    timeString = '12:00';
  } else {
    // Try to extract time in various formats
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
      /(\d{1,2})\s*(am|pm)/i,
      /\bat\s+(\d{1,2})(?:\s|$)/i, // "at 3" - bare number after "at"
    ];

    for (const pattern of timePatterns) {
      const match = lowerInput.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        // For pattern 1: match[2] is minutes, match[3] is meridiem
        // For pattern 2: match[2] is meridiem, no minutes captured
        // For pattern 3: match[1] is hours, no meridiem or minutes
        const minutes = (match[2] && !isNaN(parseInt(match[2]))) ? match[2] : '00';
        const meridiem = match[3] || (match[2] && /^(am|pm)$/i.test(match[2]) ? match[2] : undefined);

        // Handle AM/PM conversion
        if (meridiem && meridiem.toLowerCase() === 'pm' && hours < 12) {
          hours += 12;
        } else if (meridiem && meridiem.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        } else if (!meridiem && hours >= 1 && hours <= 11) {
          // No meridiem specified - assume PM for times 1-11 (common for appointments)
          hours += 12;
        }

        timeString = `${hours.toString().padStart(2, '0')}:${minutes}`;
        break;
      }
    }
  }

  // Format date in YYYY-MM-DD format using the business timezone
  const dateString = format(targetDate, 'yyyy-MM-dd', { timeZone: timezone });

  return {
    date: dateString,
    time: timeString,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, natural_language } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!natural_language) {
      return new Response(
        JSON.stringify({ error: 'natural_language is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get business settings to retrieve user_id and timezone
    const { data: businessSettings, error: businessError } = await supabase
      .from('business_settings')
      .select('user_id, business_timezone')
      .eq('id', business_id)
      .single();

    if (businessError || !businessSettings) {
      console.error('Error fetching business settings:', businessError);
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, business_timezone } = businessSettings;

    console.log('Processing natural language:', {
      business_id,
      user_id,
      timezone: business_timezone,
      natural_language,
    });

    // Parse natural language to date/time
    const parsed = parseNaturalLanguageDate(natural_language, business_timezone);

    console.log('Parsed date/time:', parsed);

    // Call google-calendar-availability function
    const { data: availabilityData, error: availabilityError } = await supabase.functions.invoke(
      'google-calendar-availability',
      {
        body: {
          user_id: user_id,
          preferred_date: parsed.date,
          preferred_time: parsed.time,
          limit: 100, // Get all slots for the date
        },
      }
    );

    if (availabilityError) {
      console.error('Error fetching availability:', availabilityError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch availability', details: availabilityError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Availability response:', availabilityData);

    // Process slots to remove humanReadable and formatted fields
    const processedSlots = (availabilityData.slots || []).map((slot: any) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      timeOfDay: slot.timeOfDay
    }));
    
    // Determine if the requested time is available
    let timeAvailable = null;
    let responseMessage = availabilityData.message;
    
    if (parsed.time) {
      // Find if the requested time matches any available slot
      const requestedSlot = processedSlots.find((slot: any) => {
        if (!slot.startTime) return false;
        const slotTime = new Date(slot.startTime);
        const slotTimeStr = `${slotTime.getUTCHours().toString().padStart(2, '0')}:${slotTime.getUTCMinutes().toString().padStart(2, '0')}`;
        return slotTimeStr === parsed.time;
      });
      
      timeAvailable = !!requestedSlot;
      
      if (timeAvailable) {
        responseMessage = `The requested time ${parsed.time} on ${parsed.date} is available.`;
        console.log('Found exact match for requested time:', parsed.time);
      } else {
        responseMessage = `The requested time ${parsed.time} on ${parsed.date} is not available. Here are other available slots:`;
        console.log('Requested time not available, showing all slots for the date');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        business_id,
        timezone: business_timezone,
        natural_language_input: natural_language,
        parsed_date: parsed.date,
        parsed_time: parsed.time,
        time_available: timeAvailable,
        available_slots: processedSlots,
        message: responseMessage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-general-availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
