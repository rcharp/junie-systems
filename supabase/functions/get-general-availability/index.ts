import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to parse natural language dates
function parseNaturalLanguageDate(input: string, timezone: string): { date?: string; time?: string } {
  const now = new Date();
  const lowerInput = input.toLowerCase().trim();

  // Get timezone offset for the business
  const tzOffsetMatch = timezone.match(/GMT([+-]\d{1,2})/i);
  let businessHourOffset = 0;
  if (tzOffsetMatch) {
    businessHourOffset = parseInt(tzOffsetMatch[1]);
  } else {
    // Try to determine offset from timezone name
    const timezoneOffsets: { [key: string]: number } = {
      'america/new_york': -5,
      'america/chicago': -6,
      'america/denver': -7,
      'america/los_angeles': -8,
      'america/phoenix': -7,
      'america/anchorage': -9,
      'pacific/honolulu': -10,
      'est': -5,
      'cst': -6,
      'mst': -7,
      'pst': -8,
    };
    businessHourOffset = timezoneOffsets[timezone.toLowerCase()] || 0;
  }

  // Adjust current time to business timezone
  const businessNow = new Date(now.getTime() + (businessHourOffset * 60 * 60 * 1000));

  let targetDate = new Date(businessNow);
  let timeString: string | undefined;

  // Parse date-related keywords
  if (lowerInput.includes('today')) {
    // Keep current date
  } else if (lowerInput.includes('tomorrow')) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (lowerInput.includes('next week')) {
    targetDate.setDate(targetDate.getDate() + 7);
  } else if (lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const match = lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]);
      const currentDay = targetDate.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
  } else if (lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const match = lowerInput.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    if (match) {
      const targetDay = days.indexOf(match[1]);
      const currentDay = targetDate.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      targetDate.setDate(targetDate.getDate() + daysToAdd);
    }
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
    ];

    for (const pattern of timePatterns) {
      const match = lowerInput.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        // For pattern 1: match[2] is minutes, match[3] is meridiem
        // For pattern 2: match[2] is meridiem, no minutes captured
        const minutes = (match[2] && !isNaN(parseInt(match[2]))) ? match[2] : '00';
        const meridiem = match[3] || (match[2] && /^(am|pm)$/i.test(match[2]) ? match[2] : undefined);

        if (meridiem && meridiem.toLowerCase() === 'pm' && hours < 12) {
          hours += 12;
        } else if (meridiem && meridiem.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }

        timeString = `${hours.toString().padStart(2, '0')}:${minutes}`;
        break;
      }
    }
  }

  const dateString = targetDate.toISOString().split('T')[0];

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

    return new Response(
      JSON.stringify({
        success: true,
        business_id,
        timezone: business_timezone,
        natural_language_input: natural_language,
        parsed_date: parsed.date,
        parsed_time: parsed.time,
        available_slots: availabilityData.slots || [],
        message: availabilityData.message,
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
