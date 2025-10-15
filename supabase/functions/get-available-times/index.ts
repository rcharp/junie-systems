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
    const { business_id } = requestBody;
    
    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Looking up business by business_id:', business_id);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find business by business_id
    const { data: businessSettings, error: businessError } = await supabase
      .from('business_settings')
      .select('user_id, business_name')
      .eq('id', business_id)
      .maybeSingle();

    if (businessError) {
      console.error('Error finding business:', businessError);
      return new Response(
        JSON.stringify({ error: 'Error finding business', details: businessError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!businessSettings) {
      console.error('No business found for business_id:', business_id);
      return new Response(
        JSON.stringify({ error: 'No business found for this business_id' }),
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
      parameters: { business_id, full_request: requestBody },
      business_id: businessSettings.user_id,
      user_id: businessSettings.user_id
    }).then(({ error: logError }) => {
      if (logError) console.error('Failed to log tool call:', logError);
      else console.log('Successfully logged tool call to client_tool_events');
    });

    // Fetch availability synchronously for fast response
    console.log('Fetching availability for user:', businessSettings.user_id);
    
    const { data: availabilityData, error: availabilityError } = await supabase.functions.invoke(
      'google-calendar-availability',
      {
        body: { user_id: businessSettings.user_id, limit: 3 }
      }
    );

    let response;
    
    if (availabilityError) {
      console.error('Error getting availability:', availabilityError);
      
      // Log error to client_tool_events
      await supabase.from('client_tool_events')
        .update({ 
          result: JSON.stringify({ 
            success: false, 
            error: availabilityError.message 
          }),
          is_error: true
        })
        .eq('tool_call_id', toolCallId);
      
      response = {
        success: false,
        business_name: businessSettings.business_name,
        error: 'Failed to fetch availability',
        availability: {
          available_times: []
        }
      };
    } else {
      console.log('Successfully retrieved availability:', availabilityData?.available_times?.length || 0, 'slots');
      
      // Log success to client_tool_events
      await supabase.from('client_tool_events')
        .update({ 
          result: JSON.stringify({ 
            success: true, 
            availability_count: availabilityData?.available_times?.length || 0,
            availability: availabilityData
          })
        })
        .eq('tool_call_id', toolCallId);
      
      response = {
        success: true,
        business_name: businessSettings.business_name,
        availability: availabilityData || { available_times: [] }
      };
    }

    return new Response(
      JSON.stringify(response),
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
