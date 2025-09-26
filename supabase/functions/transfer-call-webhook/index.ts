import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Active call tracking with business context
const activeCalls = new Map();

// Function to get forwarding number for a business
async function getForwardingNumber(businessId: string | null, userId: string | null): Promise<string> {
  try {
    console.log(`[Transfer] Fetching forwarding number for businessId: ${businessId}, userId: ${userId}`);
    
    let query = supabase.from('business_settings').select('forwarding_number').limit(1);
    
    if (businessId) {
      query = query.eq('id', businessId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    } else {
      console.log("[Transfer] No businessId or userId provided, using default number");
      return "+12345";
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error("[Transfer] Error fetching forwarding number:", error);
      return "+12345";
    }
    
    if (!data || !data.forwarding_number) {
      console.log("[Transfer] No forwarding number found, using default");
      return "+12345";
    }
    
    console.log(`[Transfer] Found forwarding number: ${data.forwarding_number}`);
    return data.forwarding_number;
  } catch (error) {
    console.error("[Transfer] Exception fetching forwarding number:", error);
    return "+12345";
  }
}

// Function to handle call transfer request from ElevenLabs
async function handleCallTransfer(callSid: string, businessId: string | null, userId: string | null, providedAgentNumber: string | null) {
  try {
    // Get the forwarding number - use provided number first, then fetch from database
    const agentNumber = providedAgentNumber || await getForwardingNumber(businessId, userId);
    
    console.log(`[Transfer] Initiating transfer for call ${callSid} to ${agentNumber}`);
    
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
    }
    
    // Get call details using Twilio REST API
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const callResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (!callResponse.ok) {
      throw new Error(`Failed to fetch call details: ${callResponse.statusText}`);
    }
    
    const call = await callResponse.json();
    const conferenceName = `transfer_${callSid}`;
    const callerNumber = call.to;
    
    // Move caller to a conference room
    const customerTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Please hold while we connect you to an agent.</Say>
        <Dial>
          <Conference startConferenceOnEnter="false" endConferenceOnExit="false" waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical">
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>`;
    
    console.log(`[Transfer] Updating call ${callSid} with conference TwiML`);
    
    // Update the call with new TwiML
    const updateResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'Twiml': customerTwiml
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update call: ${updateResponse.statusText}`);
    }
    
    console.log(`[Transfer] Caller ${callerNumber} placed in conference ${conferenceName}`);
    
    // Call the agent and connect them to the same conference
    console.log(`[Transfer] Creating outbound call to agent ${agentNumber}`);
    
    const agentTwiml = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>You are being connected to a caller who was speaking with Junie, our AI assistant.</Say>
        <Dial>
          <Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">
            ${conferenceName}
          </Conference>
        </Dial>
      </Response>`;
    
    const agentCallResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'To': agentNumber,
        'From': call.from,
        'Twiml': agentTwiml
      })
    });
    
    if (!agentCallResponse.ok) {
      throw new Error(`Failed to create agent call: ${agentCallResponse.statusText}`);
    }
    
    const agentCall = await agentCallResponse.json();
    console.log(`[Transfer] Outbound call to agent created: ${agentCall.sid}`);
    
    activeCalls.set(callSid, {
      status: "transferring",
      conferenceName,
      agentCallSid: agentCall.sid,
      agentNumber
    });
    
    return {
      success: true,
      agentCallSid: agentCall.sid,
      message: "Call transfer initiated successfully"
    };
  } catch (error) {
    console.error("[Transfer] Error transferring call:", error);
    if (error instanceof Error) {
      console.error("[Transfer] Full error details:", error.stack);
      return {
        success: false,
        error: error.message
      };
    }
    return {
      success: false,
      error: "Unknown error occurred"
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  // Handle webhook requests for transfer_call tool
  if (pathname === "/transfer-call" && req.method === "POST") {
    try {
      console.log("[Webhook] Transfer call webhook request received");
      
      const body = await req.json();
      console.log("[Webhook] Request body:", JSON.stringify(body, null, 2));
      
      // Extract parameters from the webhook request
      // ElevenLabs webhook sends different formats, so we need to handle multiple possibilities
      let callSid, businessId, userId, agentNumber;
      
      // Check if it's in the parameters object
      if (body.parameters) {
        callSid = body.parameters.call_sid || body.parameters.callSid;
        businessId = body.parameters.business_id || body.parameters.businessId;
        userId = body.parameters.user_id || body.parameters.userId;
        agentNumber = body.parameters.agent_number || body.parameters.phone_number || body.parameters.forwarding_number;
      }
      
      // Check if it's in the root of the body
      if (!callSid) {
        callSid = body.call_sid || body.callSid || body.CallSid;
        businessId = body.business_id || body.businessId || body.BusinessId;
        userId = body.user_id || body.userId || body.UserId;
        agentNumber = body.agent_number || body.phone_number || body.forwarding_number;
      }
      
      // Check if it's in conversation_context or metadata
      if (body.conversation_context) {
        callSid = callSid || body.conversation_context.call_sid;
        businessId = businessId || body.conversation_context.business_id;
        userId = userId || body.conversation_context.user_id;
      }
      
      console.log(`[Webhook] Extracted parameters - callSid: ${callSid}, businessId: ${businessId}, userId: ${userId}, agentNumber: ${agentNumber}`);
      
      if (!callSid) {
        console.error("[Webhook] No call SID provided in request");
        return new Response(JSON.stringify({
          success: false,
          error: "Missing call_sid parameter"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Perform the transfer
      const transferResult = await handleCallTransfer(callSid, businessId, userId, agentNumber);
      
      console.log("[Webhook] Transfer result:", JSON.stringify(transferResult));
      
      return new Response(JSON.stringify(transferResult), {
        status: transferResult.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error("[Webhook] Error processing transfer request:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Internal server error"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle incoming calls from Twilio
  if (pathname === "/incoming-call-eleven" && (req.method === "GET" || req.method === "POST")) {
    const body = await req.formData();
    const callSid = body.get('CallSid');
    
    console.log(`[Twilio] Incoming call received with SID: ${callSid}`);
    
    if (callSid) {
      activeCalls.set(callSid, {
        status: "active",
        from: body.get('From'),
        to: body.get('To'),
        started: new Date(),
        // Extract business context from form data if available
        businessId: body.get('BusinessId') || undefined,
        userId: body.get('UserId') || undefined
      });
      
      console.log(`[Twilio] Call tracked: ${JSON.stringify({
        from: body.get('From'),
        to: body.get('To'),
        businessId: body.get('BusinessId'),
        userId: body.get('UserId')
      })}`);
    }
    
    // Generate TwiML response to connect the call to a WebSocket stream
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="wss://${req.headers.get('host')}/media-stream" />
        </Connect>
      </Response>`;
    
    return new Response(twimlResponse, {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' }
    });
  }

  // Handle WebSocket connections for media streams (keeping existing functionality)
  if (pathname === "/media-stream") {
    const upgrade = req.headers.get("upgrade") || "";
    if (upgrade.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket connection", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    let streamSid: string | null = null;
    let callSid: string | null = null;

    const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID');
    if (!ELEVENLABS_AGENT_ID) {
      console.error("Missing ELEVENLABS_AGENT_ID in environment variables");
      return new Response("Missing ELEVENLABS_AGENT_ID", { status: 500 });
    }

    console.log(`[ElevenLabs] Connecting to ElevenLabs with agent ID: ${ELEVENLABS_AGENT_ID}`);
    const elevenLabsWs = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`);

    elevenLabsWs.onopen = () => {
      console.log("[II] Connected to ElevenLabs Conversational AI.");
    };

    elevenLabsWs.onerror = (error) => {
      console.error("[II] ElevenLabs WebSocket error:", error);
    };

    elevenLabsWs.onclose = (event) => {
      console.log(`[II] ElevenLabs connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
    };

    elevenLabsWs.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[II] Received message type: ${message.type}`);

        switch (message.type) {
          case "conversation_initiation_metadata":
            console.info("[II] Received conversation initiation metadata.");
            break;
          case "audio":
            if (message.audio_event?.audio_base_64) {
              console.log("[II] Received audio from ElevenLabs, sending to Twilio");
              socket.send(JSON.stringify({
                event: "media",
                streamSid,
                media: { payload: message.audio_event.audio_base_64 }
              }));
            }
            break;
          case "interruption":
            console.log("[II] Received interruption event from ElevenLabs");
            socket.send(JSON.stringify({
              event: "clear",
              streamSid
            }));
            break;
          case "ping":
            if (message.ping_event?.event_id) {
              console.log(`[II] Received ping with event ID: ${message.ping_event.event_id}, sending pong`);
              elevenLabsWs.send(JSON.stringify({
                type: "pong",
                event_id: message.ping_event.event_id
              }));
            }
            break;
          default:
            console.log(`[II] Received unhandled message type: ${message.type}`);
        }
      } catch (error) {
        console.error("[II] Error parsing or handling ElevenLabs message:", error);
      }
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.event) {
          case "start":
            streamSid = data.start.streamSid;
            callSid = data.start.callSid;
            console.log(`[Twilio] Stream started: ${streamSid} for call: ${callSid}`);
            
            if (callSid) {
              const existingCall = activeCalls.get(callSid) || {};
              activeCalls.set(callSid, {
                ...existingCall,
                status: "active",
                streamSid
              });
            }
            break;
          case "media":
            if (elevenLabsWs.readyState === WebSocket.OPEN) {
              const encoder = new TextEncoder();
              const decoder = new TextDecoder();
              const audioData = atob(data.media.payload);
              const audioBytes = new Uint8Array(audioData.length);
              for (let i = 0; i < audioData.length; i++) {
                audioBytes[i] = audioData.charCodeAt(i);
              }
              const base64Audio = btoa(String.fromCharCode(...audioBytes));
              elevenLabsWs.send(JSON.stringify({
                user_audio_chunk: base64Audio
              }));
            }
            break;
          case "stop":
            console.log(`[Twilio] Received stop event for stream: ${streamSid}`);
            elevenLabsWs.close();
            if (callSid) {
              console.log(`[Twilio] Removing call ${callSid} from tracking`);
              activeCalls.delete(callSid);
            }
            break;
        }
      } catch (error) {
        console.error("[Twilio] Error handling Twilio message:", error);
      }
    };

    socket.onclose = () => {
      console.log("[Twilio] WebSocket connection closed");
      elevenLabsWs.close();
      if (callSid) {
        activeCalls.delete(callSid);
      }
    };

    socket.onerror = (error) => {
      console.error("[Twilio] WebSocket error:", error);
    };

    return response;
  }

  // Default response for unhandled routes
  return new Response(JSON.stringify({ 
    error: "Not found",
    available_endpoints: [
      "POST /transfer-call - Handle transfer call webhook",
      "POST /incoming-call-eleven - Handle incoming Twilio calls",
      "WebSocket /media-stream - Handle media streams"
    ]
  }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
