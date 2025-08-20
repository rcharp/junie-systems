import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallRequest {
  phone_number: string;
  task?: string;
  business_name?: string;
  business_type?: string;
  custom_greeting?: string;
  common_questions?: string;
  business_hours?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BLAND_AI_API_KEY = Deno.env.get('BLAND_AI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!BLAND_AI_API_KEY) {
      throw new Error('BLAND_AI_API_KEY is not set');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      phone_number, 
      task, 
      business_name, 
      business_type, 
      custom_greeting, 
      common_questions, 
      business_hours 
    }: CallRequest = await req.json();

    // Create default task if not provided
    const defaultTask = task || `You are Availabee, an AI assistant for ${business_name || 'this business'}. You are a professional, friendly phone answering service.

Business Type: ${business_type || 'General Business'}
Business Hours: ${business_hours || 'Please ask for business hours'}

${custom_greeting ? `Use this greeting: ${custom_greeting}` : `Greeting: "Thank you for calling ${business_name || 'our business'}. This is Availabee, your AI assistant. How can I help you today?"`}

${common_questions ? `Here are common questions and answers for this business:
${common_questions}` : ''}

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

Remember: You represent ${business_name || 'this business'} and should maintain a professional, helpful demeanor at all times.`;

    console.log('Making call with Bland AI API to:', phone_number);

    // Make the call using Bland AI API
    const response = await fetch("https://us.api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        "Authorization": BLAND_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: phone_number,
        task: defaultTask,
        voice_id: "6", // Professional female voice
        reduce_latency: false,
        max_duration: 300, // 5 minutes max
        record: true,
        request_data: {
          business_name: business_name,
          business_type: business_type,
          timestamp: new Date().toISOString()
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bland AI API error:', errorText);
      throw new Error(`Bland AI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Call initiated:", data);

    // Save call log to database
    const { error: insertError } = await supabase
      .from('call_logs')
      .insert({
        call_id: data.call_id,
        phone_number: phone_number,
        status: 'initiated',
        business_name: business_name,
        business_type: business_type,
        call_type: 'outbound',
        provider: 'bland_ai',
        metadata: {
          task: defaultTask,
          voice_id: "6",
          max_duration: 300
        }
      });

    if (insertError) {
      console.error('Error saving call log:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      call_id: data.call_id,
      status: data.status,
      message: "Call initiated successfully"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});