import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const activeCalls = new Map<string, any>();

async function getForwardingNumber(businessId?: string, userId?: string): Promise<string> {
  try {
    console.log(`[Transfer] Fetching forwarding number for businessId: ${businessId}, userId: ${userId}`);
    
    let query = supabase
      .from('business_settings')
      .select('forwarding_number')
      .limit(1);
    
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname === "/incoming-call-eleven" && req.method === "POST") {
    try {
      // Twilio sends application/x-www-form-urlencoded data
      const text = await req.text();
      console.log(`[Twilio] Raw body: ${text.substring(0, 200)}`);
      
      const params = new URLSearchParams(text);
      const callSid = params.get('CallSid');
      
      console.log(`[Twilio] Incoming call received with SID: ${callSid}`);
      console.log(`[Twilio] From: ${params.get('From')}, To: ${params.get('To')}`);

      if (callSid) {
        activeCalls.set(callSid, {
          status: "active",
          from: params.get('From'),
          to: params.get('To'),
          started: new Date(),
          businessId: params.get('BusinessId') || undefined,
          userId: params.get('UserId') || undefined,
        });
      }

      // Return TwiML to connect to our WebSocket media stream
      const host = req.headers.get('host');
      const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${host}/functions/v1/call-transfer/media-stream" />
  </Connect>
</Response>`;

      console.log(`[Twilio] Returning TwiML with WebSocket URL: wss://${host}/functions/v1/call-transfer/media-stream`);

      return new Response(twimlResponse, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/xml' 
        }
      });
    } catch (error) {
      console.error('[Twilio] Error processing incoming call:', error);
      return new Response('Error processing call', { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }

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
            socket.send(JSON.stringify({ event: "clear", streamSid }));
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

          case "client_tool_call":
            console.log("[II] *** CLIENT TOOL CALL RECEIVED ***");
            console.log(`[II] Tool name: ${message.client_tool_call?.tool_name}`);
            console.log(`[II] Tool call ID: ${message.client_tool_call?.tool_call_id}`);
            console.log(`[II] Parameters: ${JSON.stringify(message.client_tool_call?.parameters || {})}`);

            // Log the client tool call event to database
            if (callSid) {
              const callContext = activeCalls.get(callSid);
              await supabase.from('client_tool_events').insert({
                call_sid: callSid,
                tool_name: message.client_tool_call?.tool_name,
                tool_call_id: message.client_tool_call?.tool_call_id,
                parameters: message.client_tool_call?.parameters || {},
                business_id: callContext?.businessId,
                user_id: callContext?.userId
              });
            }

            if (message.client_tool_call?.tool_name === "transfer_call" && callSid) {
              console.log(`[II] Processing transfer_call for call ${callSid}`);

              const callContext = activeCalls.get(callSid);
              if (!callContext || !callContext.forwarding_number) {
                console.error("[II] No forwarding number found in call context");
                
                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: "No forwarding number available",
                  is_error: true
                }));
                break;
              }

              const forwardingNumber = callContext.forwarding_number;
              console.log(`[II] Calling Supabase Edge Function to transfer to: ${forwardingNumber}`);

              try {
                const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
                const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
                
                const callContext = activeCalls.get(callSid);
                
                const response = await fetch(
                  `${SUPABASE_URL}/functions/v1/transfer-call`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                      callSid: callSid,
                      businessId: callContext?.businessId,
                      userId: callContext?.userId,
                      agentNumber: forwardingNumber
                    })
                  }
                );

                const result = await response.json();
                console.log("[II] Supabase Edge Function result:", result);

                const resultMessage = result.success 
                  ? "Transfer initiated successfully" 
                  : `Transfer failed: ${result.error}`;

                // Update the event with the result
                await supabase
                  .from('client_tool_events')
                  .update({
                    result: resultMessage,
                    is_error: !result.success
                  })
                  .eq('tool_call_id', message.client_tool_call.tool_call_id);

                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: resultMessage,
                  is_error: !result.success
                }));

              } catch (error) {
                console.error("[II] Error calling Supabase Edge Function:", error);
                
                const errorMessage = `Transfer failed: ${error.message}`;

                // Update the event with the error
                await supabase
                  .from('client_tool_events')
                  .update({
                    result: errorMessage,
                    is_error: true
                  })
                  .eq('tool_call_id', message.client_tool_call.tool_call_id);
                
                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: errorMessage,
                  is_error: true
                }));
              }
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
              
              const forwardingNumber = await getForwardingNumber(
                existingCall.businessId, 
                existingCall.userId
              );
              
              activeCalls.set(callSid, { 
                ...existingCall,
                status: "active", 
                streamSid,
                forwarding_number: forwardingNumber
              });
              
              console.log(`[Twilio] Call context: ${JSON.stringify({
                callSid,
                streamSid,
                forwarding_number: forwardingNumber
              })}`);
            }
            break;

          case "media":
            if (elevenLabsWs.readyState === WebSocket.OPEN) {
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
            console.log(`[Twilio] Stream stopped: ${streamSid}`);
            if (callSid) {
              activeCalls.delete(callSid);
            }
            elevenLabsWs.close();
            break;
        }
      } catch (error) {
        console.error("[Twilio] Error handling message:", error);
      }
    };

    socket.onclose = () => {
      console.log("[Twilio] WebSocket connection closed");
      elevenLabsWs.close();
    };

    socket.onerror = (error) => {
      console.error("[Twilio] WebSocket error:", error);
    };

    return response;
  }

  return new Response("Not Found", { status: 404 });
});