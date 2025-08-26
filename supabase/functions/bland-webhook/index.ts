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

    // Extract webhook_id from URL query params or body
    const url = new URL(req.url);
    const webhookId = url.searchParams.get('webhook_id');
    
    const webhookData = await req.json();
    console.log('Received AI call webhook:', webhookData);
    console.log('Webhook ID:', webhookId);

    const { call_id, status, transcript, duration, recording_url, metadata } = webhookData;

    // Get user_id from webhook_id if provided
    let userId = null;
    if (webhookId) {
      const { data: userFromWebhook, error: webhookError } = await supabase
        .rpc('get_user_id_by_webhook_id', { _webhook_id: webhookId });
      
      if (!webhookError && userFromWebhook) {
        userId = userFromWebhook;
        console.log('Found user via webhook_id:', userId);
      }
    }

    // Insert or update call log with webhook data
    const { error: upsertError } = await supabase
      .from('call_logs')
      .upsert({
        call_id: call_id || crypto.randomUUID(),
        user_id: userId,
        caller_name: 'Webhook Caller',
        phone_number: 'Unknown',
        call_status: status || 'received',
        call_duration: duration || 0,
        transcript: transcript || '',
        recording_url: recording_url || '',
        message: transcript ? transcript.substring(0, 500) : 'Webhook data received',
        urgency_level: 'medium',
        call_type: 'webhook',
        ended_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          webhook_received_at: new Date().toISOString(),
          raw_webhook_data: webhookData
        }
      }, {
        onConflict: 'call_id'
      });

    if (upsertError) {
      console.error('Error upserting call log:', upsertError);
      throw upsertError;
    }

    // Extract message information from transcript if call was completed
    if (status === 'completed' && transcript) {
      try {
        // Enhanced extraction logic with better parsing
        const callerInfo = extractCallerInfo(transcript);
        
        if (callerInfo.caller_name || callerInfo.phone_number) {
          let userId = null;

          // First try to get user_id from webhook_id if provided
          if (webhookId) {
            const { data: userFromWebhook, error: webhookError } = await supabase
              .rpc('get_user_id_by_webhook_id', { _webhook_id: webhookId });
            
            if (!webhookError && userFromWebhook) {
              userId = userFromWebhook;
              console.log('Found user via webhook_id:', userId);
            }
          }

          // Fallback: Get user_id from call_logs if webhook_id didn't work
          if (!userId) {
            const { data: callLog, error: callError } = await supabase
              .from('call_logs')
              .select('user_id')
              .eq('call_id', call_id)
              .single();

            if (callError) {
              console.error('Error finding call log:', callError);
              throw callError;
            }
            userId = callLog.user_id;
          }

          const { error: messageError } = await supabase
            .from('call_messages')
            .insert({
              user_id: userId,
              call_id: call_id,
              caller_name: callerInfo.caller_name || 'Unknown Caller',
              phone_number: callerInfo.phone_number || 'Unknown',
              email: callerInfo.email,
              message: callerInfo.message || transcript.substring(0, 500),
              urgency_level: callerInfo.urgency_level,
              best_time_to_call: callerInfo.best_time_to_call,
              call_type: callerInfo.call_type,
              status: 'new'
            });

          if (messageError) {
            console.error('Error saving message:', messageError);
          } else {
            console.log('Successfully saved call message for user:', callLog.user_id);
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

// Enhanced helper function to extract caller information from transcript
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

  // Enhanced regex patterns for better extraction
  const namePatterns = [
    /(?:my name is|i'm|this is|call me)\s+([a-zA-Z\s]{2,30})/i,
    /(?:name)\s*[:,]?\s*([a-zA-Z\s]{2,30})/i
  ];

  for (const pattern of namePatterns) {
    const match = transcript.match(pattern);
    if (match && match[1].trim().length > 1) {
      info.caller_name = match[1].trim();
      break;
    }
  }

  // Enhanced phone number extraction
  const phonePatterns = [
    /(?:my number is|call me at|phone number is|you can reach me at)\s*([\d\s\-\(\)\+\.]{7,20})/i,
    /(?:number)\s*[:,]?\s*([\d\s\-\(\)\+\.]{7,20})/i
  ];

  for (const pattern of phonePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/\D/g, '');
      if (cleaned.length >= 7) {
        info.phone_number = cleaned;
        break;
      }
    }
  }

  // Enhanced email extraction
  const emailPattern = /(?:my email is|email me at|email)\s*[:,]?\s*([^\s,]+@[^\s,]+\.[^\s,]+)/i;
  const emailMatch = transcript.match(emailPattern);
  if (emailMatch) {
    info.email = emailMatch[1];
  }

  // Best time to call extraction
  const timePatterns = [
    /(?:best time to call|call me)\s*(?:is|at)?\s*(morning|afternoon|evening|weekdays?|weekends?|[\d]{1,2}(?:am|pm|:\d{2})?)/i,
    /(?:available|free)\s*(?:in the|during the)?\s*(morning|afternoon|evening|weekdays?|weekends?)/i
  ];

  for (const pattern of timePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      info.best_time_to_call = match[1];
      break;
    }
  }

  // Enhanced urgency detection
  if (/urgent|emergency|asap|immediately|right away|rush|critical/i.test(transcript)) {
    info.urgency_level = 'urgent';
  } else if (/important|soon|quickly|priority|needed|serious/i.test(transcript)) {
    info.urgency_level = 'high';
  } else if (/when you can|whenever|no rush|not urgent/i.test(transcript)) {
    info.urgency_level = 'low';
  }

  // Enhanced call type detection
  if (/appointment|schedule|book|meeting|consultation|visit/i.test(transcript)) {
    info.call_type = 'appointment';
  } else if (/complaint|problem|issue|wrong|dissatisfied|unhappy|bad|terrible/i.test(transcript)) {
    info.call_type = 'complaint';
  } else if (/support|help|assistance|technical|fix|repair|troubleshoot/i.test(transcript)) {
    info.call_type = 'support';
  } else if (/buy|purchase|price|cost|sale|order|interested in buying|want to buy/i.test(transcript)) {
    info.call_type = 'sales';
  } else if (/question|ask|wondering|curious|information|details/i.test(transcript)) {
    info.call_type = 'inquiry';
  }

  return info;
}