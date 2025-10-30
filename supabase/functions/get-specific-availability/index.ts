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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch business settings and call availability in parallel
    const [settingsResult, availabilityResult] = await Promise.all([
      supabase.from('business_settings').select('user_id, business_timezone').eq('id', business_id).single(),
      supabase.from('business_settings').select('user_id').eq('id', business_id).single()
        .then(({ data }) => data ? supabase.functions.invoke('google-calendar-availability', {
          body: { user_id: data.user_id, preferred_date: date, preferred_time: time, limit: 100 }
        }) : null)
    ]);

    const { data: businessSettings, error: businessError } = settingsResult;
    if (businessError || !businessSettings) {
      return new Response(JSON.stringify({ error: 'Business not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { data: availabilityData, error: availabilityError } = availabilityResult || {};
    if (availabilityError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch availability' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        business_id,
        timezone: businessSettings.business_timezone,
        requested_date: date,
        requested_time: time,
        available_slots: availabilityData.slots || [],
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
