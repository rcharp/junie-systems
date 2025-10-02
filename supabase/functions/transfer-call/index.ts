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
    // Get call details from Twilio
    const callDetailsUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
    const callDetailsResponse = await fetch(callDetailsUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
      }
    });

    if (!callDetailsResponse.ok) {
      throw new Error(`Failed to get call details: ${callDetailsResponse.status}`);
    }

    const callDetails = await callDetailsResponse.json();
    console.log('[Transfer] Call details:', { 
      from: callDetails.from, 
      to: callDetails.to, 
      status: callDetails.status 
    });

    // Create a conference and move the caller to it
    const conferenceName = `transfer-${callSid}`;
    console.log('[Transfer] Creating conference:', conferenceName);

    // Update the original call to join the conference
    const updateCallUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`;
    const updateResponse = await fetch(updateCallUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        Twiml: `<Response><Say>Please hold while we transfer you.</Say><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
      }).toString()
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update call: ${updateResponse.status}`);
    }

    console.log('[Transfer] Caller moved to conference');

    // Wait a moment for the caller to join
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Dial the agent and connect them to the same conference
    const dialUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const dialResponse = await fetch(dialUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: callDetails.to,
        To: agentNumber,
        Twiml: `<Response><Dial><Conference>${conferenceName}</Conference></Dial></Response>`
      }).toString()
    });

    if (!dialResponse.ok) {
      throw new Error(`Failed to dial agent: ${dialResponse.status}`);
    }

    const dialResult = await dialResponse.json();
    console.log('[Transfer] Agent call initiated:', dialResult.sid);

    return {
      success: true,
      message: 'Call transfer initiated',
      conferenceName,
      agentCallSid: dialResult.sid
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
    const { callSid, businessId, userId, agentNumber } = await req.json();
    
    console.log('[Transfer] Request received:', { callSid, businessId, userId, agentNumber });

    if (!callSid) {
      console.error('[Transfer] No call SID provided');
      return new Response(
        JSON.stringify({ error: 'callSid is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await handleCallTransfer(callSid, businessId, userId, agentNumber);

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
