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
    console.log('=== GET CURRENT TIME ENDPOINT CALLED ===');
    
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));
    const { business_id, browser_timezone } = requestBody;
    
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

    // Log the tool call to client_tool_events
    const toolCallId = `get_current_time_${Date.now()}`;
    supabase.from('client_tool_events').insert({
      call_sid: requestBody.call_sid || requestBody.conversation_id || 'direct_call',
      tool_name: 'get_current_time',
      tool_call_id: toolCallId,
      parameters: { business_id, full_request: requestBody },
      business_id: businessSettings.user_id,
      user_id: businessSettings.user_id
    }).then(({ error: logError }) => {
      if (logError) console.error('Failed to log tool call:', logError);
      else console.log('Successfully logged tool call to client_tool_events');
    });

    // Get current time in UTC
    const now = new Date();
    
    // Get business timezone
    const businessTimezone = businessSettings.business_timezone || 'America/New_York';
    const businessOffset = businessSettings.business_timezone_offset || '-05:00';
    
    // Format current time in business timezone
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
    
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;
    
    // Construct ISO-like string with timezone offset
    const currentDateTime = `${year}-${month}-${day}T${hour}:${minute}:${second}.000${businessOffset}`;
    
    // Also provide separate date and time for convenience
    const currentDate = `${year}-${month}-${day}`;
    const currentTime = `${hour}:${minute}`;
    
    console.log('Current time in business timezone:', currentDateTime);
    
    // Build response object
    const response: any = {
      success: true,
      business: {
        current_datetime: currentDateTime,
        current_date: currentDate,
        current_time: currentTime,
        timezone: businessTimezone,
        timezone_offset: businessOffset
      }
    };
    
    // If browser timezone is provided, format current time in browser timezone
    if (browser_timezone) {
      try {
        const browserFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: browser_timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const browserParts = browserFormatter.formatToParts(now);
        const browserYear = browserParts.find(p => p.type === 'year')?.value;
        const browserMonth = browserParts.find(p => p.type === 'month')?.value;
        const browserDay = browserParts.find(p => p.type === 'day')?.value;
        const browserHour = browserParts.find(p => p.type === 'hour')?.value;
        const browserMinute = browserParts.find(p => p.type === 'minute')?.value;
        const browserSecond = browserParts.find(p => p.type === 'second')?.value;
        
        // Get browser timezone offset
        const browserDate = new Date(now.toLocaleString('en-US', { timeZone: browser_timezone }));
        const offsetMinutes = -browserDate.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMins = Math.abs(offsetMinutes) % 60;
        const browserOffset = `${offsetMinutes >= 0 ? '+' : '-'}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
        
        const browserDateTime = `${browserYear}-${browserMonth}-${browserDay}T${browserHour}:${browserMinute}:${browserSecond}.000${browserOffset}`;
        const browserDate_only = `${browserYear}-${browserMonth}-${browserDay}`;
        const browserTime_only = `${browserHour}:${browserMinute}`;
        
        response.browser = {
          current_datetime: browserDateTime,
          current_date: browserDate_only,
          current_time: browserTime_only,
          timezone: browser_timezone,
          timezone_offset: browserOffset
        };
        
        console.log('Current time in browser timezone:', browserDateTime);
      } catch (error) {
        console.error('Error formatting browser timezone:', error);
      }
    }
    
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
    console.error('Error in get-current-time function:', error);
    
    // Log error to client_tool_events
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const errorSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    errorSupabase.from('client_tool_events').insert({
      call_sid: 'error_' + Date.now(),
      tool_name: 'get_current_time',
      tool_call_id: `get_current_time_error_${Date.now()}`,
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
