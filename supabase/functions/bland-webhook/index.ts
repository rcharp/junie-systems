import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const webhookData = await req.json();
    console.log('Received Bland AI webhook:', webhookData);

    const { call_id, status, transcript, duration, recording_url, metadata } = webhookData;

    // Update call log with webhook data
    const { error: updateError } = await supabase
      .from('call_logs')
      .update({
        status: status,
        duration: duration,
        transcript: transcript,
        recording_url: recording_url,
        ended_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          webhook_received_at: new Date().toISOString()
        }
      })
      .eq('call_id', call_id);

    if (updateError) {
      console.error('Error updating call log:', updateError);
      throw updateError;
    }

    // Extract message information from transcript if call was completed
    if (status === 'completed' && transcript) {
      try {
        // Simple extraction logic - you might want to enhance this
        const callerInfo = extractCallerInfo(transcript);
        
        if (callerInfo.caller_name || callerInfo.phone_number) {
          const { error: messageError } = await supabase
            .from('call_messages')
            .insert({
              call_id: call_id,
              caller_name: callerInfo.caller_name,
              phone_number: callerInfo.phone_number,
              email: callerInfo.email,
              message: callerInfo.message,
              urgency_level: callerInfo.urgency_level,
              best_time_to_call: callerInfo.best_time_to_call,
              call_type: callerInfo.call_type
            });

          if (messageError) {
            console.error('Error saving message:', messageError);
          }
        }
      } catch (extractError) {
        console.error('Error extracting caller info:', extractError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processed successfully" 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to extract caller information from transcript
function extractCallerInfo(transcript: string) {
  const info = {
    caller_name: null as string | null,
    phone_number: null as string | null,
    email: null as string | null,
    message: transcript,
    urgency_level: 'medium' as string,
    best_time_to_call: null as string | null,
    call_type: 'inquiry' as string
  };

  // Simple regex patterns - enhance as needed
  const nameMatch = transcript.match(/(?:my name is|i'm|this is)\s+([a-zA-Z\s]+)/i);
  if (nameMatch) {
    info.caller_name = nameMatch[1].trim();
  }

  const phoneMatch = transcript.match(/(?:my number is|call me at|phone number is)\s*([\d\s\-\(\)]+)/i);
  if (phoneMatch) {
    info.phone_number = phoneMatch[1].replace(/\D/g, '');
  }

  const emailMatch = transcript.match(/(?:my email is|email me at)\s*([^\s]+@[^\s]+)/i);
  if (emailMatch) {
    info.email = emailMatch[1];
  }

  // Check for urgency keywords
  if (/urgent|emergency|asap|immediately|rush/i.test(transcript)) {
    info.urgency_level = 'urgent';
  } else if (/important|soon|quickly/i.test(transcript)) {
    info.urgency_level = 'high';
  }

  // Check for call type
  if (/appointment|schedule|book/i.test(transcript)) {
    info.call_type = 'appointment';
  } else if (/complaint|problem|issue|wrong/i.test(transcript)) {
    info.call_type = 'complaint';
  } else if (/support|help|assistance/i.test(transcript)) {
    info.call_type = 'support';
  } else if (/buy|purchase|price|cost|sale/i.test(transcript)) {
    info.call_type = 'sales';
  }

  return info;
}