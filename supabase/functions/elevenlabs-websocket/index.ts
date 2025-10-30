// ElevenLabs WebSocket integration - handles incoming calls and real-time audio streaming
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

async function getTransferNumber(businessId?: string, userId?: string): Promise<string> {
  try {
    console.log(`[Transfer] Fetching transfer number for businessId: ${businessId}, userId: ${userId}`);
    
    let query = supabase
      .from('business_settings')
      .select('transfer_number')
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
      console.error("[Transfer] Error fetching transfer number:", error);
      return "+12345";
    }
    
    if (!data || !data.transfer_number) {
      console.log("[Transfer] No transfer number found, using default");
      return "+12345";
    }
    
    console.log(`[Transfer] Found transfer number: ${data.transfer_number}`);
    return data.transfer_number;
  } catch (error) {
    console.error("[Transfer] Exception fetching transfer number:", error);
    return "+12345";
  }
}

serve(async (req) => {
  const url = new URL(req.url);
  const upgrade = req.headers.get("upgrade") || "";
  const method = req.method;
  
  console.log(`[Request] Method: ${method}, URL: ${req.url}`);
  console.log(`[Request] Headers - Upgrade: ${upgrade}, Connection: ${req.headers.get("connection")}`);

  if (method === 'OPTIONS') {
    console.log("[CORS] Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  // Handle WebSocket connections for media streaming
  if (upgrade.toLowerCase() === "websocket") {
    console.log("[WebSocket] ✅ WebSocket upgrade detected - starting WebSocket handler");
    
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

            // Log the client tool call event to database with start time
            const toolCallStartTime = Date.now();
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

            // Handle get_availability tool
            if (message.client_tool_call?.tool_name === "get_availability" && callSid) {
              console.log(`[II] Processing get_availability for call ${callSid}`);

              const callContext = activeCalls.get(callSid);
              if (!callContext?.businessId) {
                console.error("[II] No business ID found in call context");
                
                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: "Unable to check availability - no business information found",
                  is_error: true
                }));
                break;
              }

              console.log(`[II] Calling get-available-times function`);

              try {
                const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
                const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
                
                const response = await fetch(
                  `${SUPABASE_URL}/functions/v1/get-available-times`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                      business_id: callContext.businessId,
                      preferred_date: message.client_tool_call.parameters?.preferred_date,
                      preferred_time: message.client_tool_call.parameters?.preferred_time,
                      call_sid: callSid
                    })
                  }
                );

                const result = await response.json();
                console.log("[II] get-available-times function result:", result);

                // Format the result as a readable string for ElevenLabs
                let resultMessage: string;
                if (result.available_slots && result.available_slots.length > 0) {
                  const slots = result.available_slots.map((slot: any, index: number) => 
                    `${index + 1}. ${slot.start_time}`
                  ).join(', ');
                  resultMessage = `Available times: ${slots}`;
                } else {
                  resultMessage = "No availability found for the requested date";
                }

                console.log("[II] Formatted result:", resultMessage);

                // Update the event with the result and duration
                const durationMs = Date.now() - toolCallStartTime;
                await supabase
                  .from('client_tool_events')
                  .update({
                    result: resultMessage,
                    is_error: false,
                    duration_ms: durationMs
                  })
                  .eq('tool_call_id', message.client_tool_call.tool_call_id);

                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: resultMessage,
                  is_error: false
                }));

              } catch (error) {
                console.error("[II] Error calling get-available-times function:", error);
                
                const errorMessage = `Unable to check availability at this time`;

                // Update the event with the error and duration
                const durationMs = Date.now() - toolCallStartTime;
                await supabase
                  .from('client_tool_events')
                  .update({
                    result: errorMessage,
                    is_error: true,
                    duration_ms: durationMs
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
            // Handle transfer_call or transfer_call_webhook tool
            else if ((message.client_tool_call?.tool_name === "transfer_call" || message.client_tool_call?.tool_name === "transfer_call_webhook") && callSid) {
              console.log(`[II] Processing ${message.client_tool_call?.tool_name} for call ${callSid}`);

              const callContext = activeCalls.get(callSid);
              if (!callContext || !callContext.transfer_number) {
                console.error("[II] No transfer number found in call context");
                
                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: "No transfer number available",
                  is_error: true
                }));
                break;
              }

              const transferNumber = callContext.transfer_number;
              console.log(`[II] Calling twilio-transfer function to transfer to: ${transferNumber}`);

              try {
                const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
                
                const response = await fetch(
                  `${SUPABASE_URL}/functions/v1/twilio-transfer`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      callSid: callSid,
                      businessId: callContext?.businessId,
                      userId: callContext?.userId,
                      agentNumber: transferNumber
                    })
                  }
                );

                const result = await response.json();
                console.log("[II] twilio-transfer function result:", result);

                const resultMessage = result.success 
                  ? "Transfer initiated successfully" 
                  : `Transfer failed: ${result.error}`;

                // Update the event with the result and duration
                const durationMs = Date.now() - toolCallStartTime;
                await supabase
                  .from('client_tool_events')
                  .update({
                    result: resultMessage,
                    is_error: !result.success,
                    duration_ms: durationMs
                  })
                  .eq('tool_call_id', message.client_tool_call.tool_call_id);

                elevenLabsWs.send(JSON.stringify({
                  type: "client_tool_result",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  result: resultMessage,
                  is_error: !result.success
                }));

              } catch (error) {
                console.error("[II] Error calling twilio-transfer function:", error);
                
                const errorMessage = `Transfer failed: ${error.message}`;

                // Update the event with the error and duration
                const durationMs = Date.now() - toolCallStartTime;
                await supabase
                  .from('client_tool_events')
                  .update({
                    result: errorMessage,
                    is_error: true,
                    duration_ms: durationMs
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
              
              const transferNumber = await getTransferNumber(
                existingCall.businessId, 
                existingCall.userId
              );
              
              activeCalls.set(callSid, { 
                ...existingCall,
                status: "active", 
                streamSid,
                transfer_number: transferNumber
              });
              
              console.log(`[Twilio] Call context: ${JSON.stringify({
                callSid,
                streamSid,
                transfer_number: transferNumber
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

  // Handle incoming Twilio call (POST request)
  if (req.method === "POST") {
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
    <Stream url="wss://${host}/functions/v1/elevenlabs-websocket" />
  </Connect>
</Response>`;

      console.log(`[Twilio] Returning TwiML with WebSocket URL: wss://${host}/functions/v1/elevenlabs-websocket`);

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

  return new Response("Not Found", { status: 404 });
});
