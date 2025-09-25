import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Handle WebSocket upgrade
    if (req.headers.get("upgrade") === "websocket") {
      const { socket, response } = Deno.upgradeWebSocket(req);
      
      let openaiWs: WebSocket | null = null;
      let sessionCreated = false;

      socket.onopen = () => {
        console.log("Client connected to Junie voice service");
        
        // Connect to OpenAI Realtime API
        openaiWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
          headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "OpenAI-Beta": "realtime=v1"
          }
        });

        openaiWs.onopen = () => {
          console.log("Connected to OpenAI Realtime API");
        };

        openaiWs.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          console.log("Received from OpenAI:", data.type);

          // Send session update after session is created
          if (data.type === 'session.created' && !sessionCreated) {
            sessionCreated = true;
            
            const sessionUpdate = {
              type: "session.update",
              session: {
                modalities: ["text", "audio"],
                instructions: "You are Junie, an AI assistant that answers phone calls for small businesses. Be professional, friendly, and helpful. Always get the caller's name and phone number. Take detailed messages and identify urgent calls.",
                voice: "alloy",
                input_audio_format: "pcm16",
                output_audio_format: "pcm16",
                input_audio_transcription: {
                  model: "whisper-1"
                },
                turn_detection: {
                  type: "server_vad",
                  threshold: 0.5,
                  prefix_padding_ms: 300,
                  silence_duration_ms: 1000
                },
                tools: [
                  {
                    type: "function",
                    name: "save_call_message",
                    description: "Save a message from the caller with their contact information",
                    parameters: {
                      type: "object",
                      properties: {
                        caller_name: { type: "string" },
                        phone_number: { type: "string" },
                        email: { type: "string" },
                        message: { type: "string" },
                        urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        best_time_to_call: { type: "string" },
                        call_type: { type: "string", enum: ["inquiry", "appointment", "complaint", "support", "sales", "other"] }
                      },
                      required: ["caller_name", "phone_number", "message", "urgency_level", "call_type"]
                    }
                  }
                ],
                tool_choice: "auto",
                temperature: 0.8
              }
            };
            
            openaiWs?.send(JSON.stringify(sessionUpdate));
            console.log("Session update sent");
          }

          // Handle function calls
          if (data.type === 'response.function_call_arguments.done') {
            console.log("Function call completed:", data);
            
            try {
              const functionArgs = JSON.parse(data.arguments);
              
              if (data.name === 'save_call_message') {
                // Save to database
                const { error } = await supabase
                  .from('call_logs')
                  .insert({
                    caller_name: functionArgs.caller_name,
                    phone_number: functionArgs.phone_number,
                    email: functionArgs.email,
                    message: functionArgs.message,
                    urgency_level: functionArgs.urgency_level,
                    best_time_to_call: functionArgs.best_time_to_call,
                    call_type: functionArgs.call_type,
                    call_duration: 0, // Will be updated when call ends
                    recording_url: null, // Will be set if recording is available
                    transcript: functionArgs.message,
                    call_status: 'completed'
                  });

                if (error) {
                  console.error('Error saving call log:', error);
                } else {
                  console.log('Call message saved successfully');
                }

                // Send function result back to OpenAI
                const functionResult = {
                  type: "conversation.item.create",
                  item: {
                    type: "function_call_output",
                    call_id: data.call_id,
                    output: JSON.stringify({ success: true, message: "Message saved successfully" })
                  }
                };
                
                openaiWs?.send(JSON.stringify(functionResult));
                openaiWs?.send(JSON.stringify({ type: "response.create" }));
              }
            } catch (error) {
              console.error('Error processing function call:', error);
            }
          }

          // Forward all messages to client
          socket.send(event.data);
        };

        openaiWs.onerror = (error) => {
          console.error("OpenAI WebSocket error:", error);
          socket.close();
        };

        openaiWs.onclose = () => {
          console.log("OpenAI WebSocket closed");
          socket.close();
        };
      };

      socket.onmessage = (event) => {
        // Forward client messages to OpenAI
        if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
          openaiWs.send(event.data);
        }
      };

      socket.onclose = () => {
        console.log("Client disconnected");
        openaiWs?.close();
      };

      socket.onerror = (error) => {
        console.error("Client socket error:", error);
        openaiWs?.close();
      };

      return response;
    }

    return new Response("WebSocket upgrade required", { status: 400 });

  } catch (error) {
    console.error("Error in realtime-chat function:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});