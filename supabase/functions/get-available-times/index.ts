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
    const { business_id, date, time } = requestBody;
    
    if (!business_id) {
      return new Response(
        JSON.stringify({ error: 'business_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate date is ISO timestamp if provided
    if (date && !isNaN(Date.parse(date))) {
      console.log('Valid ISO timestamp received for date:', date);
    } else if (date) {
      console.log('Warning: date is not a valid ISO timestamp:', date);
    }

    console.log('Looking up business by business_id:', business_id);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find business by business_id and get timezone
    const { data: businessSettings, error: businessError } = await supabase
      .from('business_settings')
      .select('user_id, business_name, business_timezone, business_timezone_offset')
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
      parameters: { business_id, date, time, full_request: requestBody },
      business_id: businessSettings.user_id,
      user_id: businessSettings.user_id
    }).then(({ error: logError }) => {
      if (logError) console.error('Failed to log tool call:', logError);
      else console.log('Successfully logged tool call to client_tool_events');
    });

    // Fetch availability synchronously for fast response
    console.log('Fetching availability for user:', businessSettings.user_id, 'date:', date, 'time:', time);
    
    const availabilityBody: any = { user_id: businessSettings.user_id, limit: 3 };
    if (date) availabilityBody.preferred_date = date;
    if (time) availabilityBody.preferred_time = time;
    
    // Call the calendar availability function directly via HTTP to get synchronous response
    const availabilityResponse = await fetch(
      `${supabaseUrl}/functions/v1/google-calendar-availability`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(availabilityBody)
      }
    );
    
    let availabilityData;
    let availabilityError;
    
    if (!availabilityResponse.ok) {
      availabilityError = new Error(`HTTP error! status: ${availabilityResponse.status}`);
    } else {
      availabilityData = await availabilityResponse.json();
    }

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
      
      return new Response(
        JSON.stringify({ available_slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully retrieved availability:', availabilityData?.slots?.length || 0, 'slots');
    console.log('Availability data timezone:', availabilityData?.timezone);
    
    // Extract slot start times and convert from UTC to local timezone
    const businessTimezone = availabilityData?.timezone || businessSettings.business_timezone || 'America/New_York';
    const slots = (availabilityData?.slots || []).map((slot: any) => {
      const utcDate = new Date(slot.startTime);
      
      // Format in local timezone with offset
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: businessTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(utcDate);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      const second = parts.find(p => p.type === 'second')?.value;
      
      // Get timezone offset
      const offset = businessSettings.business_timezone_offset || '-04:00';
      
      return `${year}-${month}-${day}T${hour}:${minute}:${second}.000${offset}`;
    });
    
    const response = {
      success: true,
      availability_count: slots.length,
      availability: {
        available_slots: slots
      }
    };
    
    // Log success to client_tool_events
    await supabase.from('client_tool_events')
      .update({ 
        result: JSON.stringify(response)
      })
      .eq('tool_call_id', toolCallId);
    
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
