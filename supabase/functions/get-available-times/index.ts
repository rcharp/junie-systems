import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== GET AVAILABILITY BY PHONE ENDPOINT CALLED ===');
    
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    const { called_number } = requestBody;
    
    if (!called_number) {
      return new Response(
        JSON.stringify({ error: 'called_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up business by phone number:', called_number);
    
    // Normalize phone number - add +1 if not present
    const normalizedNumber = called_number.startsWith('+') ? called_number : `+1${called_number}`;
    console.log('Normalized phone number:', normalizedNumber);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find business by phone number (try normalized version first, then original)
    const { data: businessSettings, error: businessError } = await supabase
      .from('business_settings')
      .select('user_id, business_name')
      .eq('twilio_phone_number', normalizedNumber)
      .maybeSingle();

    if (businessError) {
      console.error('Error finding business:', businessError);
      return new Response(
        JSON.stringify({ error: 'Error finding business', details: businessError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!businessSettings) {
      console.error('No business found for phone number:', called_number);
      return new Response(
        JSON.stringify({ error: 'No business found for this phone number' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found business for user_id:', businessSettings.user_id);

    // Log the tool call to client_tool_events (don't await to avoid blocking)
    const toolCallId = `get_available_times_${Date.now()}`;
    supabase.from('client_tool_events').insert({
      call_sid: requestBody.call_sid || requestBody.conversation_id || 'direct_call',
      tool_name: 'get_available_times',
      tool_call_id: toolCallId,
      parameters: { called_number, normalized_number: normalizedNumber, full_request: requestBody },
      business_id: businessSettings.user_id,
      user_id: businessSettings.user_id
    }).then(({ error: logError }) => {
      if (logError) console.error('Failed to log tool call:', logError);
      else console.log('Successfully logged tool call to client_tool_events');
    });

    // Call the google-calendar-availability function
    const { data: availabilityData, error: availabilityError } = await supabase.functions.invoke(
      'google-calendar-availability',
      {
        body: { userId: businessSettings.user_id }
      }
    );

    if (availabilityError) {
      console.error('Error getting availability:', availabilityError);
      return new Response(
        JSON.stringify({ error: 'Error getting availability', details: availabilityError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully retrieved availability');

    // Update the tool call event with the result (don't await to avoid blocking)
    supabase.from('client_tool_events')
      .update({ 
        result: JSON.stringify({ 
          success: true, 
          availability_count: availabilityData?.available_times?.length || 0 
        })
      })
      .eq('tool_call_id', toolCallId)
      .then(({ error: updateError }) => {
        if (updateError) console.error('Failed to update tool call result:', updateError);
      });

    return new Response(
      JSON.stringify({
        success: true,
        business_name: businessSettings.business_name,
        availability: availabilityData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-available-times function:', error);
    
    // Log error to client_tool_events
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const errorSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    errorSupabase.from('client_tool_events').insert({
      call_sid: 'error_' + Date.now(),
      tool_name: 'get_available_times',
      tool_call_id: `get_available_times_error_${Date.now()}`,
      parameters: { error_context: 'Failed to parse request or process' },
      result: error.message,
      is_error: true
    }).then(({ error: logError }) => {
      if (logError) console.error('Failed to log error:', logError);
      else console.log('Logged error to client_tool_events');
    });
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
