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
      throw new Error('AI service is not configured. Please contact support.');
    }

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid authentication');
    }

    const { 
      phone_number, 
      task, 
      business_name, 
      business_type, 
      custom_greeting, 
      common_questions, 
      business_hours 
    }: CallRequest = await req.json();

    if (!phone_number) {
      throw new Error('Phone number is required');
    }

    // Create enhanced AI task prompt
    const defaultTask = task || `You are an intelligent AI assistant representing ${business_name || 'this business'}. You are professional, friendly, and helpful.

BUSINESS INFORMATION:
• Business Name: ${business_name || 'Not specified'}
• Business Type: ${business_type || 'General Business'}
• Business Hours: ${business_hours || 'Please ask for specific hours'}

GREETING: ${custom_greeting || `"Hello! Thank you for calling ${business_name || 'our business'}. I'm your AI assistant. How can I help you today?"`}

${common_questions ? `COMMON QUESTIONS & ANSWERS:
${common_questions}

` : ''}YOUR RESPONSIBILITIES:
1. Answer questions about the business using the information provided
2. Collect detailed caller information including:
   - Full name
   - Phone number (verify the number they're calling from)
   - Email address if possible
   - Reason for calling
   - Best time for a callback
   - Urgency level of their request

3. Handle different types of calls appropriately:
   - APPOINTMENTS: Help schedule or take appointment requests
   - SALES: Capture interest and contact details
   - SUPPORT: Document the issue and urgency
   - COMPLAINTS: Listen empathetically and collect details
   - GENERAL INQUIRIES: Answer questions and offer assistance

4. Identify urgency levels:
   - URGENT: Emergency situations, immediate needs
   - HIGH: Important time-sensitive matters
   - MEDIUM: Standard business inquiries
   - LOW: General questions, non-urgent requests

IMPORTANT GUIDELINES:
• Always be polite, professional, and helpful
• Speak clearly and at a conversational pace
• Get the caller's name early in the conversation
• Confirm their phone number and best callback time
• Ask clarifying questions to understand their needs
• Thank them for calling and set proper expectations
• Keep the conversation focused but natural
• If you can't answer something, take a detailed message

CONVERSATION FLOW:
1. Use the greeting provided
2. Listen to their request
3. Answer what you can or acknowledge their need
4. Collect their contact information
5. Determine urgency and call type
6. Confirm details and set expectations
7. Thank them and end professionally

Remember: You represent ${business_name || 'this business'} and should maintain their professional image at all times.`;

    console.log('Making AI call to:', phone_number);

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
        webhook: `https://${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}.functions.supabase.co/bland-webhook`,
        request_data: {
          business_name: business_name,
          business_type: business_type,
          user_id: user.id,
          timestamp: new Date().toISOString()
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI service error:', errorText);
      throw new Error(`Failed to initiate call: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Call initiated successfully:", data);

    // Save call log to database
    const { error: insertError } = await supabase
      .from('call_logs')
      .insert({
        user_id: user.id,
        call_id: data.call_id,
        phone_number: phone_number,
        call_status: 'initiated',
        caller_name: 'Outbound Call',
        call_type: 'outbound',
        urgency_level: 'medium',
        message: `AI assistant call to ${phone_number}`,
        provider: 'ai_service',
        metadata: {
          task: defaultTask,
          voice_id: "6",
          max_duration: 300,
          business_name: business_name,
          business_type: business_type
        }
      });

    if (insertError) {
      console.error('Error saving call log:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      call_id: data.call_id,
      status: data.status,
      message: "AI call initiated successfully"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});