import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Get user configuration from request body (business info, custom settings)
    const { businessName, businessType, customGreeting, commonQuestions, businessHours } = await req.json();

    // Create system instructions based on business configuration
    const systemInstructions = `You are Junie, an AI assistant for ${businessName || 'this business'}. You are a professional, friendly phone answering service.

Business Type: ${businessType || 'General Business'}
Business Hours: ${businessHours || 'Please ask for business hours'}

${customGreeting ? `Use this greeting: ${customGreeting}` : `Greeting: "Thank you for calling ${businessName || 'our business'}. This is Junie, your AI assistant. How can I help you today?"`}

${commonQuestions ? `Here are common questions and answers for this business:
${commonQuestions}` : ''}

Your main responsibilities:
1. Answer basic questions about the business
2. Take detailed messages including name, phone number, and reason for calling
3. Identify urgent calls and offer to transfer or take immediate action
4. Be professional, courteous, and helpful at all times
5. If you cannot answer a question, take a detailed message for the business owner

Important guidelines:
- Always get the caller's name and phone number
- Ask for the best time to call them back
- Identify the reason for their call
- If they mention urgent keywords like "emergency", "urgent", "ASAP", or "immediately", prioritize taking their information quickly
- Keep conversations focused and professional
- End calls by confirming their information and letting them know when to expect a callback

Remember: You represent ${businessName || 'this business'} and should maintain a professional, helpful demeanor at all times.`;

    // Request an ephemeral token from OpenAI
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: systemInstructions,
        modalities: ["text", "audio"],
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
                caller_name: { type: "string", description: "The caller's name" },
                phone_number: { type: "string", description: "The caller's phone number" },
                email: { type: "string", description: "The caller's email address if provided" },
                message: { type: "string", description: "The detailed message or reason for calling" },
                urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "The urgency level of the call" },
                best_time_to_call: { type: "string", description: "When is the best time to call them back" },
                call_type: { type: "string", enum: ["inquiry", "appointment", "complaint", "support", "sales", "other"], description: "Type of call" }
              },
              required: ["caller_name", "phone_number", "message", "urgency_level", "call_type"]
            }
          },
          {
            type: "function", 
            name: "schedule_appointment",
            description: "Schedule an appointment for the caller",
            parameters: {
              type: "object",
              properties: {
                caller_name: { type: "string", description: "The caller's name" },
                phone_number: { type: "string", description: "The caller's phone number" },
                email: { type: "string", description: "The caller's email address" },
                preferred_date: { type: "string", description: "Preferred appointment date" },
                preferred_time: { type: "string", description: "Preferred appointment time" },
                service_type: { type: "string", description: "Type of service or appointment needed" },
                notes: { type: "string", description: "Additional notes about the appointment" }
              },
              required: ["caller_name", "phone_number", "preferred_date", "preferred_time", "service_type"]
            }
          }
        ],
        tool_choice: "auto",
        temperature: 0.8,
        max_response_output_tokens: "inf"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Session created:", data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});