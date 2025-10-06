import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');

async function getForwardingNumber(businessId: string | null, userId: string | null): Promise<string> {
  console.log('[Transfer] Looking up forwarding number for:', { businessId, userId });
  
  try {
    let query = supabase
      .from('business_settings')
      .select('forwarding_number')
      .single();

    if (businessId) {
      query = query.eq('id', businessId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      console.error('[Transfer] No businessId or userId provided');
      return '+19412584006'; // Default fallback
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Transfer] Error fetching forwarding number:', error);
      return '+19412584006';
    }

    const forwardingNumber = data?.forwarding_number || '+19412584006';
    console.log('[Transfer] Found forwarding number:', forwardingNumber);
    return forwardingNumber;
  } catch (error) {
    console.error('[Transfer] Exception getting forwarding number:', error);
    return '+19412584006';
  }
}

async function handleCallTransfer(
  callSid: string,
  businessId: string | null,
  userId: string | null,
  providedAgentNumber: string | null
) {
  console.log('[Transfer] Starting call transfer for:', { callSid, businessId, userId, providedAgentNumber });

  // Get the agent's number
  const agentNumber = providedAgentNumber || await getForwardingNumber(businessId, userId);
  console.log('[Transfer] Using agent number:', agentNumber);

  try {
    // Simple approach: just update the call with a Dial verb to the agent
    const updateCallUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
    const updateResponse = await fetch(updateCallUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        Twiml: `<Response><Say>Transferring you now.</Say><Dial>${agentNumber}</Dial></Response>`
      }).toString()
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('[Transfer] Failed to update call:', errorText);
      throw new Error(`Failed to transfer call: ${updateResponse.status}`);
    }

    const result = await updateResponse.json();
    console.log('[Transfer] Call transfer initiated:', result);

    return {
      success: true,
      message: 'Call transferred successfully',
      callSid: result.sid
    };
  } catch (error) {
    console.error('[Transfer] Error during transfer:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[Transfer] Request received:', JSON.stringify(body, null, 2));

    // Check if this is an ElevenLabs server tool webhook
    // ElevenLabs sends: { business_id, forwarding_number, etc }
    // Legacy sends: { callSid, businessId, userId, agentNumber }
    const isElevenLabsWebhook = body.business_id && !body.callSid;
    
    let callSid: string;
    let businessId: string | null = null;
    let userId: string | null = null;
    let agentNumber: string | null = null;
    let conversationId: string | null = null;

    if (isElevenLabsWebhook) {
      console.log('[Transfer] ElevenLabs server tool webhook detected');
      
      // Get the business_id or forwarding_number from parameters
      const transferBusinessId = body.parameters?.business_id;
      const forwardingNumber = body.parameters?.forwarding_number || body.parameters?.phone_number;
      
      console.log('[Transfer] Parameters:', { transferBusinessId, forwardingNumber });
      
      // Look up the most recent call for this business (within last 5 minutes)
      if (transferBusinessId) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: mapping, error: mappingError } = await supabase
          .from('conversation_call_mapping')
          .select('*')
          .eq('business_id', transferBusinessId)
          .gte('created_at', fiveMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (mapping && !mappingError) {
          callSid = mapping.call_sid;
          businessId = mapping.business_id;
          userId = mapping.user_id;
          console.log('[Transfer] Found recent call mapping:', { callSid, businessId, userId });
        } else {
          console.error('[Transfer] No recent mapping found for business:', transferBusinessId, mappingError);
        }
      }
      
      agentNumber = forwardingNumber;

      
      console.log('[Transfer] Extracted from ElevenLabs webhook:', { 
        callSid, 
        businessId, 
        userId, 
        agentNumber,
        conversationId 
      });

      // Log the tool call event to database
      try {
        await supabase.from('client_tool_events').insert({
          call_sid: callSid || 'unknown',
          tool_name: body.tool_name,
          tool_call_id: body.tool_call_id,
          parameters: body.parameters || {},
          business_id: businessId,
          user_id: userId,
          is_error: false
        });
      } catch (dbError) {
        console.error('[Transfer] Failed to log tool event:', dbError);
      }
    } else {
      // Direct call format (legacy)
      console.log('[Transfer] Direct/legacy format detected');
      callSid = body.callSid;
      businessId = body.businessId;
      userId = body.userId;
      agentNumber = body.agentNumber;
    }

    if (!callSid) {
      console.error('[Transfer] No call SID provided or found');
      
      const errorResponse = isElevenLabsWebhook 
        ? { 
            error: 'call_sid not found for conversation', 
            conversation_id: conversationId,
            hint: 'Conversation mapping may not have been created yet'
          }
        : { error: 'callSid is required' };

      // Log error for ElevenLabs webhooks
      if (isElevenLabsWebhook) {
        try {
          await supabase.from('client_tool_events').insert({
            call_sid: 'unknown',
            tool_name: body.tool_name,
            tool_call_id: body.tool_call_id,
            parameters: body.parameters || {},
            result: JSON.stringify(errorResponse),
            is_error: true
          });
        } catch (dbError) {
          console.error('[Transfer] Failed to log error event:', dbError);
        }
      }
      
      return new Response(
        JSON.stringify(errorResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await handleCallTransfer(callSid, businessId, userId, agentNumber);

    // Log success for ElevenLabs webhooks
    if (isElevenLabsWebhook) {
      try {
        await supabase.from('client_tool_events').update({
          result: JSON.stringify(result),
          is_error: false
        })
        .eq('tool_call_id', body.tool_call_id)
        .eq('call_sid', callSid);
      } catch (dbError) {
        console.error('[Transfer] Failed to update tool event:', dbError);
      }
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Transfer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
