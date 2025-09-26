import WebSocket from "ws";
import twilio from "twilio";

export function registerInboundRoutes(fastify) {
  // Check for the required ElevenLabs Agent ID
  const { ELEVENLABS_AGENT_ID, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

  if (!ELEVENLABS_AGENT_ID) {
    console.error("Missing ELEVENLABS_AGENT_ID in environment variables");
    throw new Error("Missing ELEVENLABS_AGENT_ID in environment variables");
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error("Missing Twilio environment variables");
    throw new Error("Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN");
  }

  // Initialize Twilio client
  const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  // Active call tracking
  const activeCalls = new Map();

  // Function to handle call transfer request from ElevenLabs
  async function handleCallTransfer(callSid, agentNumber = "+12345") {
    try {
      console.log(`[Transfer] Initiating transfer for call ${callSid} to ${agentNumber}`);

      // Get call details
      const call = await twilioClient.calls(callSid).fetch();
      const conferenceName = `transfer_${callSid}`;
      const callerNumber = call.to;

      // Move caller to a conference room
      const customerTwiml = new twilio.twiml.VoiceResponse();
      customerTwiml.say("Please hold while we connect you to an agent."); // You can edit this message to say whatever you want to the caller before transfer.
      customerTwiml.dial().conference({
        startConferenceOnEnter: false,
        endConferenceOnExit: false,
        waitUrl: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
      }, conferenceName);

      console.log(`[Transfer] Updating call ${callSid} with conference TwiML`);
      await twilioClient.calls(callSid).update({ twiml: customerTwiml.toString() });

      console.log(`[Transfer] Caller ${callerNumber} placed in conference ${conferenceName}`);

      // Call the agent and connect them to the same conference
      console.log(`[Transfer] Creating outbound call to agent ${agentNumber}`);
      const agentCall = await twilioClient.calls.create({
        to: agentNumber,
        from: call.from,
        twiml: `
          <Response>
            <Say>You are being connected to a caller who was speaking with Junie, our AI assistant.</Say>
            <Dial>
              <Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">
                ${conferenceName}
              </Conference>
            </Dial>
          </Response>
        `
      });

      console.log(`[Transfer] Outbound call to agent created: ${agentCall.sid}`);

      activeCalls.set(callSid, {
        status: "transferring",
        conferenceName,
        agentCallSid: agentCall.sid,
        agentNumber,
      });

      return { success: true, agentCallSid: agentCall.sid };
    } catch (error) {
      console.error("[Transfer] Error transferring call:", error);
      console.error("[Transfer] Full error details:", error.stack);
      return { success: false, error: error.message };
    }
  }

  // Route to handle incoming calls from Twilio
  fastify.all("/incoming-call-eleven", async (request, reply) => {
    const callSid = request.body.CallSid;
    console.log(`[Twilio] Incoming call received with SID: ${callSid}`);

    if (callSid) {
      activeCalls.set(callSid, {
        status: "active",
        from: request.body.From,
        to: request.body.To,
        started: new Date(),
      });
      console.log(`[Twilio] Call tracked: ${JSON.stringify({
        from: request.body.From,
        to: request.body.To
      })}`);
    }

    // Generate TwiML response to connect the call to a WebSocket stream
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Connect>
          <Stream url="wss://${request.headers.host}/media-stream" />
        </Connect>
      </Response>`;

    reply.type("text/xml").send(twimlResponse);
  });

  // WebSocket route for handling media streams from Twilio
  fastify.register(async (fastifyInstance) => {
    fastifyInstance.get("/media-stream", { websocket: true }, (connection, req) => {
      console.info("[Server] Twilio connected to media stream.");

      let streamSid = null;
      let callSid = null;

      console.log(`[ElevenLabs] Connecting to ElevenLabs with agent ID: ${ELEVENLABS_AGENT_ID}`);
      const elevenLabsWs = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${ELEVENLABS_AGENT_ID}`);

      elevenLabsWs.on("open", () => {
        console.log("[II] Connected to ElevenLabs Conversational AI.");
      });

      elevenLabsWs.on("error", (error) => {
        console.error("[II] ElevenLabs WebSocket error:", error);
      });

      elevenLabsWs.on("close", (code, reason) => {
        console.log(`[II] ElevenLabs connection closed. Code: ${code}, Reason: ${reason || 'No reason provided'}`);
      });

      elevenLabsWs.on("message", async (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`[II] Received message type: ${message.type}`);

          switch (message.type) {
            case "conversation_initiation_metadata":
              console.info("[II] Received conversation initiation metadata.");
              break;

            case "audio":
              if (message.audio_event?.audio_base_64) {
                console.log("[II] Received audio from ElevenLabs, sending to Twilio");
                connection.send(JSON.stringify({ 
                  event: "media", 
                  streamSid, 
                  media: { payload: message.audio_event.audio_base_64 } 
                }));
              }
              break;

            case "interruption":
              console.log("[II] Received interruption event from ElevenLabs");
              connection.send(JSON.stringify({ event: "clear", streamSid }));
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

            case "tool_request":
              console.log("[II] *** TOOL REQUEST RECEIVED ***");
              console.log(`[II] Tool name: ${message.tool_request?.tool_name}`);
              console.log(`[II] Tool parameters: ${JSON.stringify(message.tool_request?.params || {})}`);
              console.log(`[II] Event ID: ${message.tool_request?.event_id}`);

              if (message.tool_request?.tool_name === "transfer_to_agent" && callSid) {
                console.log(`[II] Processing transfer_to_agent tool request for call ${callSid}`);

                let agentNumber = "+12345";
                if (message.tool_request.params?.agent_number) {
                  agentNumber = message.tool_request.params.agent_number;
                }
                console.log(`[II] Agent number for transfer: ${agentNumber}`);

                console.log(`[II] Initiating call transfer from tool request`);
                const transferResult = await handleCallTransfer(callSid, agentNumber);
                console.log(`[II] Transfer result: ${JSON.stringify(transferResult)}`);

                console.log(`[II] Sending tool response to ElevenLabs with event ID: ${message.tool_request.event_id}`);
                const toolResponse = {
                  type: "tool_response",
                  event_id: message.tool_request.event_id,
                  tool_name: "transfer_to_agent",
                  result: transferResult,
                };
                console.log(`[II] Tool response payload: ${JSON.stringify(toolResponse)}`);
                elevenLabsWs.send(JSON.stringify(toolResponse));
              }
              break;

            // NEW: Handle client_tool_call message type
            case "client_tool_call":
              console.log("[II] *** CLIENT TOOL CALL RECEIVED ***");
              console.log(`[II] Tool name: ${message.client_tool_call?.tool_name}`);
              console.log(`[II] Tool call ID: ${message.client_tool_call?.tool_call_id}`);
              console.log(`[II] Parameters: ${JSON.stringify(message.client_tool_call?.parameters || {})}`);

              if (message.client_tool_call?.tool_name === "transfer_to_agent" && callSid) {
                console.log(`[II] Processing transfer_to_agent client tool call for call ${callSid}`);

                let agentNumber = "+12345";
                if (message.client_tool_call.parameters?.phone_number) {
                  agentNumber = message.client_tool_call.parameters.phone_number;
                }
                console.log(`[II] Agent number for transfer: ${agentNumber}`);

                console.log(`[II] Initiating call transfer from client tool call`);
                const transferResult = await handleCallTransfer(callSid, agentNumber);
                console.log(`[II] Transfer result: ${JSON.stringify(transferResult)}`);

                // Send a tool response back to ElevenLabs
                console.log(`[II] Sending client tool response to ElevenLabs with tool call ID: ${message.client_tool_call.tool_call_id}`);
                const toolResponse = {
                  type: "client_tool_response",
                  tool_call_id: message.client_tool_call.tool_call_id,
                  data: transferResult
                };
                console.log(`[II] Client tool response payload: ${JSON.stringify(toolResponse)}`);
                elevenLabsWs.send(JSON.stringify(toolResponse));
              } else if (message.client_tool_call?.tool_name === "transfer_to_agent") {
                console.error(`[II] Transfer requested but callSid is missing. Current callSid: ${callSid}`);
              }
              break;

            default:
              console.log(`[II] Received unhandled message type: ${message.type}`);
              console.log(`[II] Full message content: ${JSON.stringify(message)}`);
          }
        } catch (error) {
          console.error("[II] Error parsing or handling ElevenLabs message:", error);
          console.error("[II] Raw message data:", data.toString().substring(0, 200) + "...");
        }
      });

      connection.on("message", async (message) => {
        try {
          const data = JSON.parse(message);

          switch (data.event) {
            case "start":
              streamSid = data.start.streamSid;
              callSid = data.start.callSid;
              console.log(`[Twilio] Stream started: ${streamSid} for call: ${callSid}`);

              // Update tracked call with stream info
              if (callSid) {
                const existingCall = activeCalls.get(callSid) || {};
                activeCalls.set(callSid, { 
                  ...existingCall,
                  status: "active", 
                  streamSid 
                });
                console.log(`[Twilio] Updated call tracking with stream info: ${JSON.stringify({
                  callSid,
                  streamSid,
                  status: "active"
                })}`);
              }
              break;

            case "media":
              // Don't log every media chunk to avoid flooding logs
              if (elevenLabsWs.readyState === WebSocket.OPEN) {
                elevenLabsWs.send(JSON.stringify({ 
                  user_audio_chunk: Buffer.from(data.media.payload, "base64").toString("base64") 
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

            default:
              console.log(`[Twilio] Received unhandled event: ${data.event}`);
              console.log(`[Twilio] Full event data: ${JSON.stringify(data)}`);
          }
        } catch (error) {
          console.error("[Twilio] Error processing message:", error);
          console.error("[Twilio] Error stack:", error.stack);
        }
      });

      connection.on("close", () => {
        console.log("[Twilio] WebSocket connection closed");
        elevenLabsWs.close();
      });

      connection.on("error", (error) => {
        console.error("[Twilio] WebSocket error:", error);
        console.error("[Twilio] Error stack:", error.stack);
        elevenLabsWs.close();
      });
    });
  });

  // Endpoint for manually triggering call transfer (for testing)
  fastify.post("/transfer-call", async (request, reply) => {
    const { callSid, agentNumber } = request.body;

    if (!callSid) {
      console.log("[API] Transfer request missing callSid");
      return reply.code(400).send({ error: "Missing callSid parameter" });
    }

    console.log(`[API] Manual transfer requested for call ${callSid} to ${agentNumber || "+12345"}`);
    const result = await handleCallTransfer(callSid, agentNumber || "+12345");
    console.log(`[API] Manual transfer result: ${JSON.stringify(result)}`);

    return reply.send(result);
  });
}