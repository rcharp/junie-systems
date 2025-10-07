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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawBody = await req.text();
    console.log('Raw body received:', rawBody.substring(0, 200));

    let webhookData;
    let isManualCall = false;
    
    // Handle empty body - check if it's a manual test call
    if (!rawBody || rawBody.trim() === '') {
      // Check if this is specifically a manual test call (e.g., from admin dashboard or testing tool)
      const userAgent = req.headers.get('user-agent') || '';
      const isManualTest = userAgent.includes('PostmanRuntime') || 
                          userAgent.includes('curl') || 
                          userAgent.includes('HTTPie') ||
                          userAgent.includes('Insomnia') ||
                          req.headers.get('x-test-call') === 'true';
      
      if (isManualTest) {
        console.log('Manual test call detected, using test data');
        isManualCall = true;
        // Use the complete test data structure
        webhookData = {
          "data": {
            "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
            "analysis": {
              "call_successful": "success",
              "call_summary_title": "Schedule A/C Appointment",
              "data_collection_results": {
                "appointment_scheduled": {
                  "data_collection_id": "appointment_scheduled",
                  "json_schema": {
                    "constant_value": "",
                    "description": "Whether or not the customer scheduled an appointment",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "boolean"
                  },
                  "rationale": "The user explicitly requested to schedule an appointment for a technician to come out and take a look at their A/C unit. The agent then proceeded to collect the necessary information and schedule the appointment for Friday, September 26th at 10 AM. The user confirmed all the details of the appointment, indicating that the appointment was successfully scheduled. Therefore, the value is true.",
                  "value": true
                },
                "appointment_time": {
                  "data_collection_id": "appointment_time",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The date and time of the appointment, if one was scheduled",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "string"
                  },
                  "rationale": "The user requested to schedule an appointment. The system will automatically find the next available slot.",
                  "value": "DYNAMIC_NEXT_AVAILABLE_SLOT"
                },
                "business_id": {
                  "data_collection_id": "business_id",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The business's ID",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "string"
                  },
                  "rationale": "The business's ID is not mentioned in the conversation. The name of the business is 'Test A/C', but not its ID.",
                  "value": "5a8a338e-d401-4a14-a109-6974859ce5b8"
                },
                "business_name": {
                  "data_collection_id": "business_name",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The business's name.",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "string"
                  },
                  "rationale": "The business's name is mentioned in the first line of the conversation: \"Thanks for calling Test A/C.\"",
                  "value": "Test A/C"
                },
                "customer_name": {
                  "data_collection_id": "customer_name",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The name of the customer who is calling",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "string"
                  },
                  "rationale": "The customer's full name is requested by the agent and provided by the user as 'Ricky Charpentier'.",
                  "value": "Ricky Charpentier"
                },
                "email_address": {
                  "data_collection_id": "email_address",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The caller's email address, if collected",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "string"
                  },
                  "rationale": "The user provided their email address as head2dasky@gmail.com, which was confirmed by the agent.",
                  "value": "head2dasky@gmail.com"
                },
                "phone_number": {
                  "data_collection_id": "phone_number",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The phone number of the caller",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "integer"
                  },
                  "rationale": "The user provided their phone number as '999-999-9999' in the conversation. This is a test number used for manual testing.",
                  "value": 9999999999
                },
                "service_address": {
                  "data_collection_id": "service_address",
                  "json_schema": {
                    "constant_value": "",
                    "description": "The address of the location where the service will be performed",
                    "dynamic_variable": "",
                    "enum": null,
                    "type": "string"
                  },
                  "rationale": "The user provided the address '5605 Trevesta Place, Palmetto, FL 34221' in their message at 2025-09-24T15:39:13+00:00, which was then confirmed by the agent and the user.",
                  "value": "5605 Trevesta Place, Palmetto, FL 34221"
                }
              },
              "evaluation_criteria_results": {},
              "transcript_summary": "The user called to schedule an A/C repair appointment. The agent collected the user's name, address, phone number, and email. An appointment was scheduled for Friday, September 26th at 10 AM. The user provided a gate code for the technician. All details were confirmed with the user before ending the call."
            },
            "transcript": [
              {
                "role": "agent",
                "message": "Thanks for calling Test A/C. My name is Sarah. How can I help you today?"
              },
              {
                "role": "user", 
                "message": "Hi, I need to schedule an appointment to have someone come take a look at my A/C unit."
              },
              {
                "role": "agent",
                "message": "I'd be happy to help you schedule an appointment for an A/C technician. Let me get some information from you. Can I get your full name please?"
              },
              {
                "role": "user",
                "message": "Ricky Charpentier"
              },
              {
                "role": "agent",
                "message": "Thank you Ricky. Can I get your phone number?"
              },
              {
                "role": "user",
                "message": "999-999-9999"
              },
              {
                "role": "agent",
                "message": "Perfect. And what's the address where you need the A/C service?"
              },
              {
                "role": "user",
                "message": "5605 Trevesta Place, Palmetto, FL 34221"
              },
              {
                "role": "agent",
                "message": "Got it. Can I also get your email address for our records?"
              },
              {
                "role": "user",
                "message": "head2dasky@gmail.com"
              },
              {
                "role": "agent",
                "message": "Perfect. I have the next available appointment slot for you. Would that work for you?"
              },
              {
                "role": "user",
                "message": "Yes, that sounds perfect."
              },
              {
                "role": "agent",
                "message": "Excellent! So to confirm, I have you scheduled for the next available time slot at 5605 Trevesta Place, Palmetto, FL 34221. The technician will call you at 999-999-9999 about thirty minutes before arrival. Is there anything else you need help with today?"
              },
              {
                "role": "user",
                "message": "No, that's everything. Thank you!"
              },
              {
                "role": "agent",
                "message": "You're welcome Ricky! Have a great day and we'll see you Friday morning."
              }
            ]
          },
          "webhook_id": "9ef6aa65-a653-41c3-83e4-50a54f2a3fc5"
        };
      } else {
        console.log('Empty body received, treating as empty webhook');
        webhookData = {
          message: "Webhook data received",
          timestamp: new Date().toISOString(),
          fullTranscript: ""
        };
      }
    } else {
      try {
        webhookData = JSON.parse(rawBody);
        // Check if this is a manual call by webhook_id
        if (webhookData.webhook_id === '9ef6aa65-a653-41c3-83e4-50a54f2a3fc5') {
          isManualCall = true;
          console.log('🧪 Detected manual test call by webhook_id');
        }
        console.log('Successfully parsed webhook JSON data');
      } catch (parseError) {
        console.error('Error parsing webhook JSON:', parseError);
        webhookData = {
          message: "Webhook data received",
          timestamp: new Date().toISOString(),
          fullTranscript: rawBody
        };
      }
    }

    // Start background processing (don't wait for it)
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (anthropicApiKey) {
      processWebhookInBackground(
        webhookData,
        isManualCall,
        supabase,
        SUPABASE_URL,
        anthropicApiKey
      ).catch(error => {
        console.error('Background processing failed:', error);
      });
    }

    // Return immediate response for faster UX
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      timestamp: new Date().toISOString(),
      webhookId: webhookData.webhook_id || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error processing webhook' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Background processing function
async function processWebhookInBackground(
  webhookData: any, 
  isManualCall: boolean, 
  supabase: any,
  supabaseUrl: string,
  anthropicApiKey: string
) {
  try {
    console.log('=== STARTING BACKGROUND PROCESSING ===');
    
    // Extract transcript from the webhook data
    let fullTranscript = "";
    const isTestData = webhookData.data && webhookData.data.analysis && webhookData.data.analysis.transcript_summary;
    
    if (isTestData) {
      console.log('Using test data transcript');
      if (webhookData.data.transcript && Array.isArray(webhookData.data.transcript)) {
        fullTranscript = webhookData.data.transcript.map((entry: any) => {
          if (entry.role && entry.message) {
            const role = entry.role === 'agent' ? 'Agent' : 'Caller';
            return `${role}: ${entry.message}`;
          }
          return entry.message || entry.text || '';
        }).join('\n\n');
      }
    } else if (webhookData.transcript) {
      // Handle transcript as array or string
      if (Array.isArray(webhookData.transcript)) {
        fullTranscript = webhookData.transcript.map((entry: any) => {
          if (entry.speaker && entry.text) {
            return `${entry.speaker}: ${entry.text}`;
          } else if (entry.role && entry.message) {
            const role = entry.role === 'agent' ? 'Agent' : 'Caller';
            return `${role}: ${entry.message}`;
          }
          return entry.text || entry.message || '';
        }).join('\n\n');
      } else if (typeof webhookData.transcript === 'string') {
        fullTranscript = webhookData.transcript;
      }
    } else if (webhookData.fullTranscript) {
      fullTranscript = webhookData.fullTranscript;
    } else if (webhookData.message) {
      fullTranscript = webhookData.message;
    } else if (webhookData.data && webhookData.data.transcript) {
      // Handle the ElevenLabs format with data.transcript array
      if (Array.isArray(webhookData.data.transcript)) {
        fullTranscript = webhookData.data.transcript.map((entry: any) => {
          if (entry.role && entry.message) {
            const role = entry.role === 'agent' ? 'Agent' : 'Caller';
            return `${role}: ${entry.message}`;
          }
          return entry.message || entry.text || '';
        }).join('\n\n');
      }
    }

    console.log(`Full transcript preview: ${fullTranscript.substring(0, 200)}...`);
    console.log(`Final full transcript length: ${fullTranscript.length}`);

    const analysisData = webhookData.data?.analysis?.data_collection_results || {};
    const { userId: businessUserId, callerId: incomingCallPhoneNumber, businessId } = await findTargetUserId(analysisData, webhookData, supabase);
    
    if (!businessUserId) {
      console.error('Could not find target user in background processing');
      return;
    }

    console.log('Background processing for user:', businessUserId);
    console.log('Incoming call phone number:', incomingCallPhoneNumber);

    // Extract caller info using the existing function
    const callerInfo = extractCallerInfo(fullTranscript);
    
    // Parse appointment time AND normalize email with Claude in one call
    const { parsedDateTime: parsedAppointmentDateTime, normalizedEmail } = await parseCallDataWithClaude(
      analysisData.appointment_time?.value,
      analysisData.email_address?.value || callerInfo.email,
      analysisData.service_address?.value || '',
      businessUserId,
      supabase,
      supabaseUrl,
      isManualCall
    );

    // Handle calendar booking if needed
    let calendarBookingResult = null;
    const isAppointmentScheduled = analysisData.appointment_scheduled?.value === true;
    
    console.log('=== CALENDAR BOOKING CHECK ===');
    console.log('appointment_scheduled flag:', analysisData.appointment_scheduled?.value);
    console.log('isAppointmentScheduled:', isAppointmentScheduled);
    console.log('parsedAppointmentDateTime:', parsedAppointmentDateTime);
    
    if (isAppointmentScheduled && parsedAppointmentDateTime) {
      console.log('✅ Conditions met - attempting calendar booking...');
      calendarBookingResult = await handleCalendarBooking({
        isAppointmentScheduled,
        parsedAppointmentDateTime, 
        businessUserId,
        callerInfo,
        analysisData,
        normalizedEmail, // Pass the pre-normalized email
        isManualCall,
        supabaseAdmin: supabase,
        supabaseUrl
      });
      
      if (calendarBookingResult) {
        console.log('✅ Calendar event created:', calendarBookingResult.event?.id);
      } else {
        console.log('⚠️ Calendar booking returned null - check logs above for errors');
      }
    } else {
      console.log('❌ Calendar booking skipped:');
      if (!isAppointmentScheduled) {
        console.log('  - Reason: appointment_scheduled is not true');
      }
      if (!parsedAppointmentDateTime) {
        console.log('  - Reason: parsedAppointmentDateTime is null');
      }
    }

    // Format appointment details 
    let formattedAppointmentDetails = null;
    let enhancedCallSummary = null;

    if (parsedAppointmentDateTime) {
      // For manual test calls, use simple formatting to avoid slow Claude API calls
      if (isManualCall) {
        console.log('Manual test call - using quick formatting');
        try {
          const date = new Date(parsedAppointmentDateTime);
          const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          };
          formattedAppointmentDetails = date.toLocaleDateString('en-US', options);
          enhancedCallSummary = `Scheduled ${analysisData.business_name?.value || 'test'} appointment for ${analysisData.customer_name?.value || 'customer'}`;
          console.log('Quick format result:', formattedAppointmentDetails);
        } catch (dateErr) {
          console.error('Error formatting date:', dateErr);
          formattedAppointmentDetails = 'Test appointment scheduled';
          enhancedCallSummary = 'Test appointment scheduled';
        }
      } else if (anthropicApiKey) {
        // For real calls, use Claude for better formatting
        console.log('=== FORMATTING APPOINTMENT WITH CLAUDE ===');
        
        const claudeFormatPrompt = `Format this appointment information for a business call log:

Date/Time: ${parsedAppointmentDateTime}
Customer: ${analysisData.customer_name?.value || 'Unknown'}
Service: ${analysisData.service_address?.value || 'Service requested'}
Business: ${analysisData.business_name?.value || 'Business'}

Please provide:
1. A human-friendly date/time format (like "Tuesday, September 30 at 9:30 AM")
2. A brief call summary (like "Scheduled A/C repair appointment for [Customer] at [Address]")

Return as JSON: {"formattedDate": "...", "callSummary": "..."}`;

        try {
          const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${anthropicApiKey}`,
              'Content-Type': 'application/json',
              'x-api-key': anthropicApiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1000,
              messages: [{ role: 'user', content: claudeFormatPrompt }]
            })
          });

          if (claudeResponse.ok) {
            const claudeData = await claudeResponse.json();
            const responseText = claudeData.content[0].text;
            console.log('Claude formatting response:', responseText);
            
            try {
              const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
              const parsed = JSON.parse(cleanText);
              formattedAppointmentDetails = parsed.formattedDate;
              enhancedCallSummary = parsed.callSummary;
              console.log('Enhanced call summary:', enhancedCallSummary);
            } catch (parseErr) {
              console.error('Failed to parse Claude formatting response:', parseErr);
            }
          }
        } catch (claudeErr) {
          console.error('Error calling Claude for formatting:', claudeErr);
        }
      }
    }

    console.log('=== PREPARING TO SAVE CALL LOG ===');
    console.log('parsedAppointmentDateTime value:', parsedAppointmentDateTime);

    // Convert to Date object if it's a string
    let appointmentDateTime = null;
    if (parsedAppointmentDateTime) {
      if (typeof parsedAppointmentDateTime === 'string') {
        appointmentDateTime = new Date(parsedAppointmentDateTime);
        console.log('Converted to Date object:', appointmentDateTime.toISOString());
      } else if (Object.prototype.toString.call(parsedAppointmentDateTime) === '[object Date]') {
        appointmentDateTime = parsedAppointmentDateTime as Date;
      }
    }

    // Save call log to database
    // Extract call duration from webhook data (in seconds)
    const callDuration = webhookData.data?.call_duration || 
                         webhookData.data?.duration || 
                         webhookData.call_duration || 
                         webhookData.duration || 
                         (fullTranscript ? Math.max(60, Math.floor(fullTranscript.length / 50)) : 60); // Estimate from transcript length
    
    // Clean up the call summary to use "caller" instead of "user"
    let cleanedSummary = (webhookData.data?.analysis?.transcript_summary || callerInfo.message || '')
      .replace(/\bthe user\b/gi, 'the caller')
      .replace(/\bUser\b/g, 'Caller');
    
    // Capitalize "The caller" if it's at the beginning of a sentence
    cleanedSummary = cleanedSummary.replace(/^the caller/i, 'The caller');
    
    // Determine the correct call_type based on whether an appointment was actually scheduled
    let finalCallType = callerInfo.call_type;
    if (finalCallType === 'appointment' && (!isAppointmentScheduled || !appointmentDateTime)) {
      // If it was marked as appointment but no appointment was actually scheduled, change to inquiry
      finalCallType = 'inquiry';
    }
    
    // Use the pre-normalized email from parseCallDataWithClaude
    const callLogData = {
      user_id: businessUserId,
      caller_name: analysisData.customer_name?.value || 'A potential customer',
      phone_number: String(analysisData.phone_number?.value || incomingCallPhoneNumber || ''),
      email: normalizedEmail, // Already normalized by Claude
      message: cleanedSummary,
      urgency_level: callerInfo.urgency_level,
      best_time_to_call: callerInfo.best_time_to_call,
      call_type: finalCallType,
      call_duration: callDuration,
      recording_url: '',
      transcript: fullTranscript,
      call_status: 'completed',
      call_id: `call_${Date.now()}`,
      business_name: analysisData.business_name?.value || 'Unknown Business',
      business_type: '',
      provider: 'elevenlabs',
      appointment_scheduled: isAppointmentScheduled,
      appointment_date_time: appointmentDateTime?.toISOString() || null,
      service_address: analysisData.service_address?.value || null,
      business_id: businessId || analysisData.business_id?.value || null,
      incoming_call_phone_number: incomingCallPhoneNumber, // The actual incoming phone number from phone system
      metadata: {
        caller_zip: '',
        caller_address: analysisData.service_address?.value || '',
        formatted_appointment_details: formattedAppointmentDetails,
        raw_webhook_data: webhookData
      }
    };

    console.log('Saving call log with data:', JSON.stringify(callLogData));

    const { data: callLogResult, error: callLogError } = await supabase
      .from('call_logs')
      .insert([callLogData])
      .select();

    let callLogId = null;
    if (callLogError) {
      console.error('Error saving call log:', callLogError);
    } else {
      console.log('Successfully saved call log:', callLogResult);
      callLogId = callLogResult?.[0]?.id;
    }

    // Save call message linked to the call log
    let callMessage = (enhancedCallSummary || webhookData.data?.analysis?.transcript_summary || 'Call completed')
      .replace(/\bthe user\b/gi, 'the caller')
      .replace(/\bUser\b/g, 'Caller');
    
    // Capitalize "The caller" if it's at the beginning of a sentence
    callMessage = callMessage.replace(/^the caller/i, 'The caller');
    
    const callMessageData = {
      user_id: businessUserId,
      caller_name: analysisData.customer_name?.value || 'A potential customer',
      phone_number: String(analysisData.phone_number?.value || incomingCallPhoneNumber || ''),
      message: callMessage,
      call_type: finalCallType, // Use the corrected call_type
      urgency_level: callerInfo.urgency_level || 'medium',
      call_id: `call_${Date.now()}`,
      call_log_id: callLogId, // Link to the call log
      incoming_call_phone_number: incomingCallPhoneNumber, // The actual incoming phone number from phone system
      metadata: {
        appointment_scheduled: isAppointmentScheduled,
        formatted_appointment_details: formattedAppointmentDetails
      }
    };

    const { error: messageError } = await supabase
      .from('call_messages')
      .insert([callMessageData]);

    if (messageError) {
      console.error('Error saving call message:', messageError);
    } else {
      console.log('Successfully saved call message');
    }

    // Send SMS notification if enabled
    if (callLogResult && callLogResult.length > 0) {
      try {
        console.log('Attempting to send SMS notification for business:', callLogData.business_id);
        
        const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            businessId: callLogData.business_id,
            callerName: analysisData.customer_name?.value || 'Unknown',
            phoneNumber: String(analysisData.phone_number?.value || ''),
            callType: callerInfo.call_type || 'general',
            urgencyLevel: callerInfo.urgency_level || 'medium',
            message: enhancedCallSummary || webhookData.data?.analysis?.transcript_summary || 'Call completed',
            email: analysisData.email_address?.value
          })
        });

        if (smsResponse.ok) {
          const smsResult = await smsResponse.json();
          console.log('SMS notification sent:', smsResult);
        } else {
          const errorText = await smsResponse.text();
          console.error('SMS notification failed:', errorText);
        }
      } catch (smsError) {
        console.error('Error sending SMS notification:', smsError);
        // Don't fail the whole process if SMS fails
      }
    }

    console.log('=== WEBHOOK PROCESSING COMPLETED SUCCESSFULLY ===');

  } catch (error) {
    console.error('Error in background processing:', error);
  }
}

// Helper function to find target user ID and incoming call phone number
async function findTargetUserId(analysisData: any, webhookData: any, supabase: any): Promise<{ userId: string | null; callerId: string | null }> {
  const conversationId = webhookData.data?.conversation_id;
  
  // ElevenLabs sends call_id in different locations depending on the webhook type
  const callSid = webhookData.data?.call_id || 
                  webhookData.data?.metadata?.phone_call?.call_sid;
  
  // Extract the actual incoming phone number from the webhook metadata
  const incomingPhoneNumber = webhookData.data?.metadata?.phone_call?.external_number || null;
  
  const businessIdFromAnalysis = analysisData?.business_id?.value;
  
  console.log('🔍 FINDING USER DEBUG:');
  console.log('  - conversation_id:', conversationId);
  console.log('  - call_sid/call_id:', callSid);
  console.log('  - incoming phone number from webhook:', incomingPhoneNumber);
  console.log('  - business_id from analysis:', businessIdFromAnalysis);
  
  // PRIMARY STRATEGY: Match by call_sid if available (most accurate)
  if (callSid) {
    console.log('🎯 PRIMARY: Looking for mapping by call_sid:', callSid);
    
    const { data: callMapping, error: callError } = await supabase
      .from('conversation_call_mapping')
      .select('*')
      .eq('call_sid', callSid)
      .maybeSingle();
    
    console.log('  - call_sid mapping found:', callMapping);
    console.log('  - call_sid mapping error:', callError);
    
    if (callMapping) {
      console.log('  - Current conversation_id in DB:', callMapping.conversation_id);
      console.log('  - New conversation_id from webhook:', conversationId);
      console.log('  - Incoming call phone number from mapping:', callMapping.incoming_call_phone_number);
      
      // Update to real conversation_id if it's still temp
      if (callMapping.conversation_id.startsWith('temp_') && conversationId) {
        console.log('  - Updating temp conversation_id to real one...');
        const { error: updateError } = await supabase
          .from('conversation_call_mapping')
          .update({ conversation_id: conversationId })
          .eq('id', callMapping.id);
        
        console.log('  - Update error:', updateError);
      }
      
      if (callMapping.user_id) {
        console.log('✅✅✅ PRIMARY SUCCESS! Found user_id via call_sid:', callMapping.user_id);
        // Prefer the incoming phone number from webhook metadata, fallback to mapping
        const finalCallerId = incomingPhoneNumber || callMapping.incoming_call_phone_number;
        console.log('  - Final incoming phone number:', finalCallerId);
        console.log('  - business_id from mapping:', callMapping.business_id);
        return { userId: callMapping.user_id, callerId: finalCallerId, businessId: callMapping.business_id };
      }
    }
  }
  
  // SECONDARY STRATEGY: Try exact conversation_id match
  if (conversationId) {
    console.log('🔍 SECONDARY: Looking for exact conversation_id match...');
    
    const { data: exactMapping, error: exactError } = await supabase
      .from('conversation_call_mapping')
      .select('*')
      .eq('conversation_id', conversationId)
      .maybeSingle();
    
    console.log('  - exact mapping result:', exactMapping);
    
    if (exactMapping?.user_id) {
      console.log('✅✅✅ SECONDARY SUCCESS! Found user_id from conversation_id:', exactMapping.user_id);
      // Prefer the incoming phone number from webhook metadata, fallback to mapping
      const finalCallerId = incomingPhoneNumber || exactMapping.incoming_call_phone_number;
      console.log('  - business_id from mapping:', exactMapping.business_id);
      return { userId: exactMapping.user_id, callerId: finalCallerId, businessId: exactMapping.business_id };
    }
  }
  
  // FALLBACK: Use most recent temp mapping (less reliable but better than nothing)
  console.log('🔄 FALLBACK: Looking for most recent temp mapping...');
  const { data: tempMappings, error: tempError } = await supabase
    .from('conversation_call_mapping')
    .select('*')
    .like('conversation_id', 'temp_%')
    .order('created_at', { ascending: false })
    .limit(1);
  
  console.log('  - temp mappings found:', tempMappings?.length || 0);
  
  if (tempMappings && tempMappings.length > 0 && conversationId) {
    const tempMapping = tempMappings[0];
    console.log('  - Using most recent temp mapping:', tempMapping.conversation_id);
    console.log('  - Updating to real conversation_id:', conversationId);
    
    const { error: updateError } = await supabase
      .from('conversation_call_mapping')
      .update({ conversation_id: conversationId })
      .eq('id', tempMapping.id);
    
    if (!updateError && tempMapping.user_id) {
      console.log('✅✅✅ FALLBACK SUCCESS! Updated temp and got user_id:', tempMapping.user_id);
      // Prefer the incoming phone number from webhook metadata, fallback to mapping
      const finalCallerId = incomingPhoneNumber || tempMapping.incoming_call_phone_number;
      console.log('  - business_id from mapping:', tempMapping.business_id);
      return { userId: tempMapping.user_id, callerId: finalCallerId, businessId: tempMapping.business_id };
    }
  }

  console.error('❌❌❌ FAILED: Could not find user_id by any method');
  console.error('  - conversation_id:', conversationId);
  console.error('  - call_sid:', callSid);
  console.error('  - business_id from analysis:', businessIdFromAnalysis);
  return { userId: null, callerId: null, businessId: null };
}

// Helper function to extract caller information
function extractCallerInfo(transcript: string) {
  const info = {
    caller_name: "A potential customer",
    phone_number: "", 
    email: null,
    message: transcript,
    urgency_level: "medium",
    best_time_to_call: null,
    call_type: "inquiry",
    appointmentDateTime: null,
    serviceType: null
  };

  if (!transcript) return info;

  // Extract caller name
  const nameMatch = transcript.match(/(?:my name is|i'm|this is)\s+([a-zA-Z\s]+)/i);
  if (nameMatch) {
    info.caller_name = nameMatch[1].trim();
  }

  // Extract phone number
  const phoneMatch = transcript.match(/(?:my (?:phone )?number is|you can reach me at|call me at)\s*([0-9\-\(\)\s\.]+)/i);
  if (phoneMatch) {
    info.phone_number = phoneMatch[1].replace(/\D/g, '').trim();
  }

  // Extract email - handle both "@" and "at" formats
  const emailMatch = transcript.match(/([a-zA-Z0-9._%+-]+(?:@| at )[a-zA-Z0-9.-]+\.(?:com|org|net|edu|gov|co))/i);
  if (emailMatch) {
    // Normalize "at" to "@"
    info.email = emailMatch[1].replace(/ at /i, '@');
  }

  // Determine urgency
  if (transcript.toLowerCase().includes('emergency') || transcript.toLowerCase().includes('urgent')) {
    info.urgency_level = 'high';
  } else if (transcript.toLowerCase().includes('whenever') || transcript.toLowerCase().includes('no rush')) {
    info.urgency_level = 'low';
  }

  // Determine call type
  if (transcript.toLowerCase().includes('appointment') || transcript.toLowerCase().includes('schedule')) {
    info.call_type = 'appointment';
  } else if (transcript.toLowerCase().includes('quote') || transcript.toLowerCase().includes('estimate')) {
    info.call_type = 'quote';
  } else if (transcript.toLowerCase().includes('complaint') || transcript.toLowerCase().includes('problem')) {
    info.call_type = 'complaint';
  } else {
    info.call_type = 'general';
  }

  return info;
}

// Helper function to get next weekday
function getNextWeekday(dayName: string): Date {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  
  if (targetDay === -1) {
    return new Date(); // Invalid day name, return today
  }
  
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  
  return targetDate;
}

// Helper function to handle calendar booking
async function handleCalendarBooking({
  isAppointmentScheduled,
  parsedAppointmentDateTime,
  businessUserId,
  callerInfo,
  analysisData,
  normalizedEmail,
  isManualCall,
  supabaseAdmin,
  supabaseUrl
}: {
  isAppointmentScheduled: boolean,
  parsedAppointmentDateTime: string | Date | null,
  businessUserId: string,
  callerInfo: any,
  analysisData: any,
  normalizedEmail: string | null,
  isManualCall: boolean,
  supabaseAdmin: any,
  supabaseUrl: string
}) {
  try {
    console.log('📅 === HANDLE CALENDAR BOOKING START ===');
    console.log('isAppointmentScheduled:', isAppointmentScheduled);
    console.log('parsedAppointmentDateTime:', parsedAppointmentDateTime);
    console.log('businessUserId:', businessUserId);
    
    if (!isAppointmentScheduled || !parsedAppointmentDateTime) {
      console.log('❌ No appointment scheduled or no date/time provided');
      return null;
    }

    // Check if calendar is connected
    console.log('Checking calendar connection for user:', businessUserId);
    const { data: calendarData, error: calendarError } = await supabaseAdmin
      .from('google_calendar_settings')
      .select('is_connected, calendar_id, timezone')
      .eq('user_id', businessUserId)
      .single();

    console.log('Calendar query result:', { calendarData, calendarError });

    if (calendarError) {
      console.error('❌ Calendar query error:', calendarError);
      return null;
    }
    
    if (!calendarData?.is_connected) {
      console.log('❌ Calendar not connected for user:', businessUserId);
      console.log('Calendar data:', calendarData);
      return null;
    }

    console.log('✅ Calendar connected, creating event...');
    console.log('Calendar ID:', calendarData.calendar_id);
    console.log('Timezone:', calendarData.timezone);

    // Use the pre-normalized email passed from parseCallDataWithClaude
    const customerEmail = normalizedEmail || analysisData.email_address?.value || callerInfo.email;
    console.log('📧 Using email for calendar booking:', customerEmail);
    
    // Call the google-calendar-book function
    const bookingPayload = {
      userId: businessUserId,
      customerName: analysisData.customer_name?.value || callerInfo.caller_name || 'Unknown Customer',
      customerEmail: customerEmail,
      customerPhone: String(analysisData.phone_number?.value || callerInfo.phone_number || ''),
      serviceType: analysisData.service_requested?.value || analysisData.service_type?.value || 'Service Appointment',
      serviceAddress: analysisData.service_address?.value || '',
      appointmentDateTime: typeof parsedAppointmentDateTime === 'string' ? parsedAppointmentDateTime : parsedAppointmentDateTime.toISOString(),
      notes: `Service requested: ${analysisData.service_requested?.value || analysisData.service_type?.value || 'Service appointment'}`
    };

    console.log('📅 Calling google-calendar-book with payload:', JSON.stringify(bookingPayload, null, 2));

    const bookingResponse = await fetch(`${supabaseUrl}/functions/v1/google-calendar-book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify(bookingPayload)
    });

    console.log('📅 Calendar booking response status:', bookingResponse.status);

    if (bookingResponse.ok) {
      const bookingResult = await bookingResponse.json();
      console.log('✅ Calendar booking completed successfully:', JSON.stringify(bookingResult, null, 2));
      return bookingResult;
    } else {
      const errorText = await bookingResponse.text();
      console.error('❌ Calendar booking failed:', bookingResponse.status);
      console.error('❌ Error details:', errorText);
      // Log to help debug - don't fail silently
      throw new Error(`Calendar booking failed: ${errorText}`);
    }

  } catch (error) {
    console.error('Error in calendar booking:', error);
    return null;
  }
}

// Helper function to parse appointment time and normalize email using Claude in one call
async function parseCallDataWithClaude(
  appointmentTimeValue: string | undefined,
  emailValue: string | undefined,
  serviceAddress: string,
  businessUserId: string,
  supabaseAdmin: any,
  supabaseUrl: string,
  isManualCall: boolean
): Promise<{ parsedDateTime: string | null; normalizedEmail: string | null }> {
  console.log('=== PARSING CALL DATA WITH CLAUDE ===');
  console.log('Appointment time value:', appointmentTimeValue);
  console.log('Email value:', emailValue);
  
  // If no data to parse, return nulls
  if (!appointmentTimeValue && !emailValue) {
    return { parsedDateTime: null, normalizedEmail: null };
  }

  // Try to parse datetime if it's already a valid ISO date string
  let parsedDateTime: string | null = null;
  if (appointmentTimeValue && appointmentTimeValue !== 'DYNAMIC_NEXT_AVAILABLE_SLOT') {
    try {
      const parsedDate = new Date(appointmentTimeValue);
      if (!isNaN(parsedDate.getTime())) {
        console.log('✅ Datetime already valid ISO format:', parsedDate.toISOString());
        parsedDateTime = parsedDate.toISOString();
      }
    } catch (e) {
      console.log('Not a valid ISO date string, will use Claude...');
    }
  }

  // Simple email normalization first
  let normalizedEmail: string | null = emailValue || null;
  if (emailValue && typeof emailValue === 'string') {
    const simpleNormalized = emailValue
      .replace(/\s*at\s*/gi, '@')
      .replace(/\s*dot\s*/gi, '.')
      .trim();
    
    // Check if it looks like a valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(simpleNormalized)) {
      normalizedEmail = simpleNormalized;
      console.log('✅ Email normalized with simple replacement:', normalizedEmail);
    } else {
      console.log('Email may need Claude parsing...');
      normalizedEmail = null; // Will let Claude handle it
    }
  }

  // If both are already parsed successfully, return early
  if (parsedDateTime && normalizedEmail) {
    console.log('✅ Both datetime and email parsed without Claude');
    return { parsedDateTime, normalizedEmail };
  }

  // Handle DYNAMIC_NEXT_AVAILABLE_SLOT
  if (appointmentTimeValue === 'DYNAMIC_NEXT_AVAILABLE_SLOT' && !parsedDateTime) {
    console.log('Fetching next available calendar slot...');
    
    const { data: calendarUser, error: calendarError } = await supabaseAdmin
      .from('google_calendar_settings')
      .select('user_id')
      .eq('is_connected', true)
      .eq('user_id', businessUserId)
      .single();

    if (!calendarError && calendarUser) {
      console.log('Found connected calendar user:', calendarUser.user_id);
      try {
        const availabilityResponse = await fetch(`${supabaseUrl}/functions/v1/google-calendar-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({ user_id: calendarUser.user_id })
        });

        if (availabilityResponse.ok) {
          const availabilityData = await availabilityResponse.json();
          if (availabilityData.available && availabilityData.slots?.length > 0) {
            parsedDateTime = availabilityData.slots[0].startTime;
            console.log('✅ Using next available slot:', parsedDateTime);
          }
        }
      } catch (error) {
        console.error('Error calling availability function:', error);
      }
    }
  }

  // If either still needs parsing, use Claude
  if (!parsedDateTime || !normalizedEmail) {
    try {
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!anthropicApiKey) {
        console.error('ANTHROPIC_API_KEY not found');
        return { parsedDateTime, normalizedEmail };
      }

      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0];
      
      console.log('Calling Claude to parse remaining call data...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 1024,
          tools: [{
            name: 'parse_call_data',
            description: 'Parse appointment datetime and/or normalize email address from call data',
            input_schema: {
              type: 'object',
              properties: {
                appointment_datetime: {
                  type: 'string',
                  description: 'The parsed datetime in ISO 8601 format (YYYY-MM-DDTHH:MM:SS.000Z) in UTC timezone. Return null if no datetime to parse.'
                },
                normalized_email: {
                  type: 'string',
                  description: 'The normalized email address in proper format (e.g., user@domain.com). Return null if no email to parse.'
                }
              }
            }
          }],
          tool_choice: { type: 'tool', name: 'parse_call_data' },
          messages: [{
            role: 'user',
            content: `Current date and time: ${currentDate} ${currentTime} (timezone: America/New_York, UTC-4)

${!parsedDateTime && appointmentTimeValue ? `Appointment time to parse: "${appointmentTimeValue}"
Instructions for datetime:
- If only a time range is given (like "from nine forty-five to twelve fifteen"), use the START time
- If the date seems to be in the past, assume it's meant for the future (next occurrence)
- Convert to UTC timezone (subtract 4 hours from Eastern Time)
- Return as ISO 8601 string (YYYY-MM-DDTHH:MM:SS.000Z)
` : ''}
${!normalizedEmail && emailValue ? `Email to normalize: "${emailValue}"
Instructions for email:
- Convert spoken words like "at" to "@" and "dot" to "."
- Ensure proper email format: user@domain.com
- Common patterns: "john at gmail dot com" becomes "john@gmail.com"
` : ''}
Parse and return the data in the specified format.`
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API error:', response.status, errorText);
        return { parsedDateTime, normalizedEmail };
      }

      const result = await response.json();
      console.log('Claude parse_call_data response:', JSON.stringify(result, null, 2));
      
      const toolUse = result.content?.find((c: any) => c.type === 'tool_use');
      if (toolUse?.input) {
        if (!parsedDateTime && toolUse.input.appointment_datetime) {
          const dtValue = toolUse.input.appointment_datetime;
          const validatedDate = new Date(dtValue);
          if (!isNaN(validatedDate.getTime())) {
            parsedDateTime = validatedDate.toISOString();
            console.log('✅ Claude parsed datetime:', parsedDateTime);
          }
        }
        if (!normalizedEmail && toolUse.input.normalized_email) {
          normalizedEmail = toolUse.input.normalized_email;
          console.log('✅ Claude normalized email:', normalizedEmail);
        }
      }
    } catch (claudeError) {
      console.error('Error calling Claude API:', claudeError);
    }
  }

  return { parsedDateTime, normalizedEmail };
}
