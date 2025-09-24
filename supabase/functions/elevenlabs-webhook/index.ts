import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('=== WEBHOOK FUNCTION CALLED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('User-Agent:', req.headers.get('user-agent'));
  console.log('Content-Type:', req.headers.get('content-type'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== WEBHOOK RECEIVED ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Headers:', Object.fromEntries(req.headers.entries()));

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ELEVENLABS_WEBHOOK_SIGNATURE = Deno.env.get('ELEVENLABS_WEBHOOK_SIGNATURE');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the raw request body
    const rawBody = await req.text();
    console.log('Raw body received:', rawBody);
    
    // Check for webhook signature (make it optional for debugging)
    const providedSignature = req.headers.get('x-elevenlabs-signature') || 
                             req.headers.get('elevenlabs-signature') || 
                             req.headers.get('signature') ||
                             req.headers.get('x-signature');
    
    console.log('Provided signature:', providedSignature);
    console.log('Expected signature:', ELEVENLABS_WEBHOOK_SIGNATURE);

    // Only verify signature if we have both provided and expected signatures
    if (ELEVENLABS_WEBHOOK_SIGNATURE && providedSignature) {
      if (providedSignature !== ELEVENLABS_WEBHOOK_SIGNATURE) {
        console.error('Invalid webhook signature:', providedSignature);
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Invalid webhook signature' 
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Webhook signature verified successfully');
    } else {
      console.log('Webhook signature verification disabled or not configured');
      // Allow the request to continue without signature verification for debugging
    }

    // Extract webhook_id from URL query params
    const url = new URL(req.url);
    const webhookId = url.searchParams.get('webhook_id');
    console.log('Webhook ID from URL:', webhookId);
    
    // Parse JSON with better error handling
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
      console.log('Parsed webhook data:', webhookData);
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError);
      console.error('Raw body was:', rawBody);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid JSON in webhook body',
        details: parseError.message,
        received_body: rawBody
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { call_id, status, transcript, duration, recording_url, metadata, transcripts } = webhookData;

    // Handle transcript extraction from ElevenLabs format
    let fullTranscript = '';
    
    // First try the new ElevenLabs format: data.transcript (array of conversation objects)
    if (webhookData.data?.transcript && Array.isArray(webhookData.data.transcript)) {
      console.log('Found transcript array in data.transcript:', webhookData.data.transcript.length, 'entries');
      fullTranscript = webhookData.data.transcript
        .filter(item => item.message && item.message.trim()) // Filter out empty messages
        .map(item => {
          const role = item.role === 'agent' ? 'Agent' : 
                      item.role === 'user' ? 'Caller' : 
                      item.role?.charAt(0).toUpperCase() + item.role?.slice(1) || 'Speaker';
          return `${role}: ${item.message}`;
        })
        .join('\n\n');
      console.log('Processed ElevenLabs transcript into full transcript:', fullTranscript.length, 'characters');
    }
    // Fallback to legacy formats
    else if (transcript) {
      fullTranscript = transcript;
      console.log('Using legacy transcript field');
    } else if (transcripts && Array.isArray(transcripts)) {
      // Handle legacy transcripts array format
      fullTranscript = transcripts
        .map(t => `${t.user === 'user' ? 'Caller' : 'Assistant'}: ${t.text}`)
        .join('\n');
      console.log('Processed legacy transcripts into full transcript:', fullTranscript);
    }

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

    // Extract caller info - use the same logic as the admin dashboard
    let callerInfo = {
      caller_name: 'Unknown Caller',
      phone_number: 'Unknown',
      email: null,
      message: 'Webhook data received',
      urgency_level: 'medium',
      call_type: 'other',
      service_address: null,
      appointment_details: null,
      appointment_scheduled: false
    };

    // First try to extract from analysis.data_collection_results (same as admin dashboard)
    if (webhookData.data?.analysis?.data_collection_results) {
      const results = webhookData.data.analysis.data_collection_results;
      console.log('Data collection results found:', results);
      
      // Extract customer name and format properly
      if (results.customer_name?.value) {
        callerInfo.caller_name = results.customer_name.value.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      // Extract phone number
      if (results.phone_number?.value) {
        callerInfo.phone_number = String(results.phone_number.value);
      }
      
      // Extract email
      if (results.email_address?.value) {
        callerInfo.email = results.email_address.value;
      } else if (results.email?.value) {
        callerInfo.email = results.email.value;
      }
      
      // Extract service address
      if (results.service_address?.value) {
        callerInfo.service_address = results.service_address.value;
      }
      
      // Extract appointment time
      if (results.appointment_time?.value) {
        callerInfo.appointment_details = results.appointment_time.value;
      }
      
      // Extract appointment scheduled status
      if (results.appointment_scheduled?.value) {
        callerInfo.appointment_scheduled = results.appointment_scheduled.value === true || 
                                         results.appointment_scheduled.value.toString().toLowerCase() === 'true' || 
                                         results.appointment_scheduled.value.toString().toLowerCase() === 'yes';
      }
      
      // Use the transcript summary as the message
      if (webhookData.data?.analysis?.transcript_summary) {
        callerInfo.message = webhookData.data.analysis.transcript_summary.substring(0, 500);
      }
      
      // Determine call type from appointment data
      if (callerInfo.appointment_scheduled) {
        callerInfo.call_type = 'appointment';
      } else {
        callerInfo.call_type = 'inquiry';
      }
      
      console.log('Caller info extracted from data collection results:', callerInfo);
    }
    // Fallback to variables if available (legacy structure)
    else if (webhookData.variables) {
      const vars = webhookData.variables;
      
      console.log('Variables found:', vars);
      
      // Extract name (prefer full name, fallback to first/last) and capitalize
      if (vars.name) {
        callerInfo.caller_name = vars.name.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      } else if (vars.first_name || vars.last_name) {
        const firstName = vars.first_name ? 
          vars.first_name.charAt(0).toUpperCase() + vars.first_name.slice(1).toLowerCase() : '';
        const lastName = vars.last_name ? 
          vars.last_name.charAt(0).toUpperCase() + vars.last_name.slice(1).toLowerCase() : '';
        callerInfo.caller_name = `${firstName} ${lastName}`.trim();
      }
      
      // Extract contact info
      if (vars.phone_number) callerInfo.phone_number = String(vars.phone_number);
      if (vars.email) callerInfo.email = vars.email;
      if (vars.address) callerInfo.service_address = vars.address;
      
      // Extract appointment info
      if (vars.appointment_details) {
        callerInfo.appointment_details = vars.appointment_details;
      }
      
      // Extract service notes/requirements
      if (vars.service_requested) {
        callerInfo.message = vars.service_requested.substring(0, 500);
      } else if (vars.notes) {
        callerInfo.message = vars.notes.substring(0, 500);
      } else if (fullTranscript) {
        const lines = fullTranscript.split('\n');
        const callerLines = lines.filter(line => 
          line.toLowerCase().includes('caller:')
        ).map(line => line.replace(/^Caller:\s*/i, '').trim()).join(' ');
        
        callerInfo.message = callerLines.substring(0, 500) || 'Customer called for service';
      }
      
      // Determine call type
      if (vars.appointment_scheduled || vars.appointment_details) {
        callerInfo.call_type = 'appointment';
        callerInfo.appointment_scheduled = true;
      } else {
        callerInfo.call_type = 'inquiry';
      }
      
      console.log('Caller info extracted from variables:', callerInfo);
    } else if (fullTranscript) {
      // Only use transcript parsing as fallback if no variables are available
      console.log('No variables found, falling back to transcript parsing');
      const extracted = extractCallerInfo(fullTranscript);
      callerInfo = {
        caller_name: extracted.caller_name || 'Unknown Caller',
        phone_number: extracted.phone_number || 'Unknown',
        email: extracted.email,
        message: extracted.message ? extracted.message.substring(0, 500) : fullTranscript.substring(0, 500),
        urgency_level: extracted.urgency_level,
        call_type: extracted.call_type
      };
    }

    console.log('Extracted caller info:', callerInfo);

    // Get business_id from webhook data first, then fallback to business settings
    let businessId = webhookData.data?.conversation_initiation_client_data?.dynamic_variables?.business_id || null;
    let businessUserId = userId; // Default to webhook user_id
    
    if (businessId) {
      console.log('Found business_id in webhook data:', businessId);
      // Get the user_id for this business_id from business_settings
      const { data: businessData } = await supabase
        .from('business_settings')
        .select('user_id')
        .eq('id', businessId)
        .maybeSingle();
      
      if (businessData) {
        businessUserId = businessData.user_id;
        console.log('Found user_id from business_settings:', businessUserId);
      } else {
        console.log('No business_settings found for business_id:', businessId);
      }
    } else {
      // If no business_id in webhook data, get from business settings using webhook user_id
      console.log('No business_id in webhook data, fetching from business_settings for user:', userId);
      const { data: businessData } = await supabase
        .from('business_settings')
        .select('id, user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (businessData) {
        businessId = businessData.id;
        businessUserId = businessData.user_id;
        console.log('Found business_id from settings:', businessId);
      } else {
        console.log('No business_settings found for user:', userId);
      }
    }

    // Extract call summary from webhook data
    const callSummary = webhookData.data?.analysis?.transcript_summary || 
                       webhookData.data?.summary || 
                       '';

    // Insert or update call log with extracted data
    const { error: upsertError } = await supabase
      .from('call_logs')
      .upsert({
        call_id: call_id || crypto.randomUUID(),
        user_id: businessUserId,
        business_id: businessId,
        caller_name: callerInfo.caller_name,
        phone_number: callerInfo.phone_number,
        email: callerInfo.email,
        call_status: status || 'completed',
        call_duration: duration || 0,
        transcript: fullTranscript || '',
        call_summary: callSummary,
        recording_url: recording_url || '',
        message: callerInfo.message,
        urgency_level: callerInfo.urgency_level,
        call_type: callerInfo.call_type,
        ended_at: new Date().toISOString(),
        business_name: webhookData.data?.analysis?.data_collection_results?.business_name?.value || 
                      webhookData.variables?.business_name || '',
        business_type: webhookData.variables?.business_type || '',
        appointment_scheduled: callerInfo.appointment_scheduled,
        service_address: callerInfo.service_address,
        appointment_date_time: callerInfo.appointmentDateTime || null,
        metadata: {
          ...metadata,
          webhook_received_at: new Date().toISOString(),
          caller_address: callerInfo.service_address || '',
          caller_zip: webhookData.variables?.zip_code || '',
          appointment_scheduled: callerInfo.appointment_scheduled,
          appointment_details: callerInfo.appointment_details,
          service_requested: webhookData.data?.analysis?.data_collection_results?.service_type?.value || 
                           webhookData.variables?.service_requested || '',
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
    if (status === 'completed' && fullTranscript) {
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
              message: callerInfo.message || fullTranscript.substring(0, 500),
              urgency_level: callerInfo.urgency_level,
              best_time_to_call: callerInfo.best_time_to_call,
              call_type: callerInfo.call_type,
              status: 'new'
            });

          if (messageError) {
            console.error('Error saving message:', messageError);
          } else {
            console.log('Successfully saved call message for user:', userId);
          }

          // Check if this is an appointment request and schedule it if Google Calendar is connected
          if (callerInfo.call_type === 'appointment' && callerInfo.appointmentDateTime) {
            console.log('Attempting to schedule appointment via Google Calendar...');
            
            try {
              const bookingResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-book`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: userId,
                  startTime: callerInfo.appointmentDateTime,
                  endTime: new Date(new Date(callerInfo.appointmentDateTime).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour appointment
                  callerName: callerInfo.caller_name || 'Unknown Caller',
                  phoneNumber: callerInfo.phone_number || 'Unknown',
                  email: callerInfo.email,
                  serviceType: callerInfo.serviceType || 'Consultation',
                  notes: callerInfo.message,
                }),
              });

              const bookingResult = await bookingResponse.json();
              
              if (bookingResult.success) {
                console.log('Successfully scheduled appointment:', bookingResult.appointment);
              } else {
                console.log('Failed to schedule appointment:', bookingResult.error);
              }
            } catch (bookingError) {
              console.error('Error scheduling appointment:', bookingError);
            }
          }
        }
      } catch (extractError) {
        console.error('Error extracting caller info:', extractError);
      }
    }

    console.log('=== WEBHOOK PROCESSING COMPLETED SUCCESSFULLY ===');
    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook processed successfully",
      timestamp: new Date().toISOString(),
      webhookId: webhookId
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
    call_type: 'inquiry' as string,
    appointmentDateTime: null as string | null,
    serviceType: null as string | null
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
    
    // Try to extract appointment date/time
    const dateTimePatterns = [
      /(?:appointment|meeting|visit)\s+(?:on|for)\s+([a-zA-Z]+\s+[a-zA-Z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i,
      /(?:schedule|book)\s+(?:for|on)\s+([a-zA-Z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?)/i,
      /(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/i,
      /(\d{1,2}\/\d{1,2}\/?\d{0,4})(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/i
    ];

    for (const pattern of dateTimePatterns) {
      const match = transcript.match(pattern);
      if (match) {
        try {
          // This is a simplified extraction - in production you'd want more robust date parsing
          const dateStr = match[1];
          const timeStr = match[2] || '10:00 AM'; // Default time if not specified
          
          // Try to parse the date (this is basic - you'd want to use a proper date parsing library)
          const today = new Date();
          let appointmentDate = new Date();
          
          // Simple parsing for common formats
          if (dateStr.toLowerCase().includes('monday')) {
            appointmentDate = getNextWeekday(today, 1);
          } else if (dateStr.toLowerCase().includes('tuesday')) {
            appointmentDate = getNextWeekday(today, 2);
          } else if (dateStr.toLowerCase().includes('wednesday')) {
            appointmentDate = getNextWeekday(today, 3);
          } else if (dateStr.toLowerCase().includes('thursday')) {
            appointmentDate = getNextWeekday(today, 4);
          } else if (dateStr.toLowerCase().includes('friday')) {
            appointmentDate = getNextWeekday(today, 5);
          }
          
          // Set time (simplified)
          if (timeStr.toLowerCase().includes('pm') && !timeStr.includes('12')) {
            const hour = parseInt(timeStr) + 12;
            appointmentDate.setHours(hour, 0, 0, 0);
          } else if (timeStr.toLowerCase().includes('am')) {
            const hour = parseInt(timeStr);
            appointmentDate.setHours(hour === 12 ? 0 : hour, 0, 0, 0);
          } else {
            appointmentDate.setHours(10, 0, 0, 0); // Default to 10 AM
          }
          
          info.appointmentDateTime = appointmentDate.toISOString();
          break;
        } catch (parseError) {
          console.error('Error parsing appointment date/time:', parseError);
        }
      }
    }
    
    // Try to extract service type
    const servicePatterns = [
      /(?:for|need|want)\s+(hvac|air conditioning|ac|repair|maintenance|cleaning|inspection|installation)/i,
      /(?:service|work)\s+(?:on|for)\s+(hvac|air conditioning|ac|heating|cooling)/i
    ];
    
    for (const pattern of servicePatterns) {
      const match = transcript.match(pattern);
      if (match) {
        info.serviceType = match[1];
        break;
      }
    }
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

// Helper function to get next occurrence of a weekday
function getNextWeekday(date: Date, targetDay: number): Date {
  const currentDay = date.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  const result = new Date(date);
  result.setDate(date.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  return result;
}