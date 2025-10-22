import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { business_id, date, time } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!date && !time) {
      return new Response(
        JSON.stringify({ error: 'date and/or time is required' }),
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

    console.log('Fetching availability for business:', {
      business_id,
      user_id,
      timezone: business_timezone,
      date,
      time,
    });

    // Call google-calendar-availability function
    const { data: availabilityData, error: availabilityError } = await supabase.functions.invoke(
      'google-calendar-availability',
      {
        body: {
          userId: user_id,
          preferredDate: date,
          preferredTime: time,
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
        requested_date: date,
        requested_time: time,
        available_slots: availabilityData.availableSlots || [],
        message: availabilityData.message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-specific-availability:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
