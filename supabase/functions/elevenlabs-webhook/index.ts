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

    // Webhook signature verification (optional for testing)
    const ELEVENLABS_WEBHOOK_SIGNATURE = Deno.env.get('ELEVENLABS_WEBHOOK_SIGNATURE');
    const providedSignature = req.headers.get('x-signature') || req.headers.get('signature');
    
    console.log('Expected signature:', ELEVENLABS_WEBHOOK_SIGNATURE);
    console.log('Provided signature:', providedSignature);

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

    // Extract webhook_id from URL query params or header
    const url = new URL(req.url);
    const webhookId = url.searchParams.get('webhook_id') || req.headers.get('x-webhook-id');
    console.log('Webhook ID from URL/header:', webhookId);
    
    // Parse JSON with better error handling
    let webhookData;
    
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
        console.log('Manual test call detected, using test data from test-data.ts');
        // Use the complete test data structure
        webhookData = {
          "data": {
            "status": "done",
            "user_id": "o3zdIqYwDYfKPw2KrSE2Tbi9kxX2",
            "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
            "analysis": {
              "call_successful": "success",
              "call_summary_title": "Schedule A/C Appointment",
              "transcript_summary": "The user called to schedule an A/C repair appointment. The agent collected the user's name, address, phone number, and email. An appointment was scheduled for Friday, September 26th at 10 AM. The user provided a gate code for the technician. All details were confirmed with the user before ending the call.\n",
              "data_collection_results": {
                "business_id": {
                  "value": null,
                  "rationale": "The business's ID is not mentioned in the conversation. The name of the business is 'Test A/C', but not its ID.",
                  "json_schema": {
                    "enum": null,
                    "type": "string",
                    "description": "The business's ID",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "business_id"
                },
                "phone_number": {
                  "value": 7278714862,
                  "rationale": "The user provided their phone number as '7278714862' in the conversation. This is a ten-digit number, so it can be extracted as the phone number of the caller.",
                  "json_schema": {
                    "enum": null,
                    "type": "integer",
                    "description": "The phone number of the caller",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "phone_number"
                },
                "business_name": {
                  "value": "Test A/C",
                  "rationale": "The business's name is mentioned in the first line of the conversation: \"Thanks for calling Test A/C.\"",
                  "json_schema": {
                    "enum": null,
                    "type": "string",
                    "description": "The business's name.",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "business_name"
                },
                "customer_name": {
                  "value": "Ricky Charpentier",
                  "rationale": "The customer's full name is requested by the agent and provided by the user as 'Ricky Charpentier'.",
                  "json_schema": {
                    "enum": null,
                    "type": "string",
                    "description": "The name of the customer who is calling",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "customer_name"
                },
                "email_address": {
                  "value": "head2dasky@gmail.com",
                  "rationale": "The user provided their email address as head2dasky@gmail.com, which was confirmed by the agent.",
                  "json_schema": {
                    "enum": null,
                    "type": "string",
                    "description": "The caller's email address, if collected",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "email_address"
                },
                "service_address": {
                  "value": "5605 Trevesta Place, Palmetto, FL 34221",
                  "rationale": "The user provided the address '5605 Trevesta Place, Palmetto, FL 34221' in their message at 2025-09-24T15:39:13+00:00, which was then confirmed by the agent and the user.",
                  "json_schema": {
                    "enum": null,
                    "type": "string",
                    "description": "The address of the location where the service will be performed",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "service_address"
                },
                "appointment_time": {
                  "value": "Friday, September twenty-sixth, at ten in the morning",
                  "rationale": "The user scheduled an appointment for Friday, September twenty-sixth, at ten in the morning. This information is extracted from the agent's confirmation message at 2025-09-24T15:40:20+00:00.",
                  "json_schema": {
                    "enum": null,
                    "type": "string",
                    "description": "The date and time of the appointment, if one was scheduled",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "appointment_time"
                },
                "appointment_scheduled": {
                  "value": true,
                  "rationale": "The user explicitly requested to schedule an appointment for a technician to come out and take a look at their A/C unit. The agent then proceeded to collect the necessary information and schedule the appointment for Friday, September 26th at 10 AM. The user confirmed all the details of the appointment, indicating that the appointment was successfully scheduled. Therefore, the value is true.",
                  "json_schema": {
                    "enum": null,
                    "type": "boolean",
                    "description": "Whether or not the customer scheduled an appointment",
                    "constant_value": "",
                    "dynamic_variable": ""
                  },
                  "data_collection_id": "appointment_scheduled"
                }
              },
              "evaluation_criteria_results": {}
            },
            "metadata": {
              "cost": 567,
              "error": null,
              "call_duration_secs": 133,
              "termination_reason": "end_call tool was called.",
              "authorization_method": "authorization_header",
              "start_time_unix_secs": 1758728314,
              "accepted_time_unix_secs": 1758728314,
              "conversation_initiation_source": "react_sdk",
              "conversation_initiation_source_version": "0.5.0"
            },
            "transcript": [
              {
                "role": "agent",
                "message": "Thanks for calling Test A/C. How can I help you today?",
                "feedback": null,
                "llm_usage": null,
                "tool_calls": [],
                "interrupted": false,
                "llm_override": null,
                "tool_results": [],
                "source_medium": null,
                "agent_metadata": {
                  "agent_id": "agent_1601k5fak9jsfrzsk06455d9f98j",
                  "workflow_node_id": "node_main_routing"
                },
                "original_message": null,
                "time_in_call_secs": 0,
                "multivoice_message": null,
                "rag_retrieval_info": null,
                "conversation_turn_metrics": null
              },
              {
                "role": "user",
                "message": "hi, my a/c isn't working, can i schedule an appointment for a technician to come out and take a look at it?",
                "feedback": null,
                "llm_usage": null,
                "tool_calls": [],
                "interrupted": false,
                "llm_override": null,
                "tool_results": [],
                "source_medium": "text",
                "agent_metadata": null,
                "original_message": null,
                "time_in_call_secs": 0,
                "multivoice_message": null,
                "rag_retrieval_info": null,
                "conversation_turn_metrics": null
              }
            ]
          },
          "type": "post_call_transcription",
          "event_timestamp": new Date().toISOString()
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
    
    // Extract transcript from the webhook data (only if not using test data)
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
    console.log(`fullTranscript exists: ${!!fullTranscript}`);

    // Find the user by webhook_id first
    const { data: webhookUser, error: webhookUserError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('webhook_id', webhookId)
      .single();

    let businessUserId = null;
    if (webhookUser) {
      businessUserId = webhookUser.id;
      console.log('Found user via webhook_id:', businessUserId);
    } else {
      console.error('Error finding user by webhook_id:', webhookUserError);
      console.log('No user found with webhook_id:', webhookId);
    }

    // Extract caller information from the webhook data
    const callerInfo = extractCallerInfo(fullTranscript);
    console.log(`Extracted caller info:`, JSON.stringify(callerInfo, null, 2));

    // Get business_id - first check webhook data, then fallback to business_settings
    let businessId = null;
    if (webhookData.business_id) {
      businessId = webhookData.business_id;
      console.log('Using business_id from webhook data:', businessId);
    } else if (businessUserId) {
      console.log('No business_id in webhook data, fetching from business_settings for user:', businessUserId);
      
      const { data: settingsData, error: settingsError } = await supabase
        .from('business_settings')
        .select('business_id')
        .eq('user_id', businessUserId)
        .single();

      if (settingsData?.business_id) {
        businessId = settingsData.business_id;
        console.log('Found business_id from settings:', businessId);
      } else {
        console.error('Error fetching business_id from settings:', settingsError);
        console.log('No business_id found in settings for user:', businessUserId);
      }
    }

    // Get user settings for timezone and appointment booking settings
    let userTimezone = 'America/New_York'; // Default timezone
    let appointmentBookingEnabled = false;
    
    if (businessUserId) {
      const { data: userSettings, error: userSettingsError } = await supabase
        .from('user_profiles')
        .select('timezone, appointment_booking_enabled')
        .eq('id', businessUserId)
        .single();

      if (userSettings) {
        if (userSettings.timezone) {
          userTimezone = userSettings.timezone;
        }
        appointmentBookingEnabled = userSettings.appointment_booking_enabled || false;
      } else {
        console.error('Error fetching user settings:', userSettingsError);
      }
    }

    console.log('Using user timezone:', userTimezone);
    console.log('Appointment booking enabled:', appointmentBookingEnabled);

    // Parse appointment time from extracted data and check if appointment booking should be triggered
    let parsedAppointmentDateTime = null;
    let isAppointmentScheduled = false;

    // Extract from the new structure first
    if (webhookData.data && webhookData.data.analysis && webhookData.data.analysis.data_collection_results) {
      const results = webhookData.data.analysis.data_collection_results;
      
      // Check if appointment was scheduled
      if (results.appointment_scheduled && results.appointment_scheduled.value === true) {
        isAppointmentScheduled = true;
        
        // Get appointment time
        if (results.appointment_time && results.appointment_time.value) {
          parsedAppointmentDateTime = parseAppointmentTime(results.appointment_time.value, userTimezone);
        }
      }
    }

    // Fallback to legacy variable extraction
    if (!isAppointmentScheduled && webhookData.variables) {
      if (webhookData.variables.appointment_scheduled === true || 
          webhookData.variables.appointment_scheduled === 'true' ||
          webhookData.variables.appointment_scheduled === 'yes') {
        isAppointmentScheduled = true;
        
        if (webhookData.variables.appointment_details) {
          parsedAppointmentDateTime = parseAppointmentTime(webhookData.variables.appointment_details, userTimezone);
        }
      }
    }

    console.log('parsedAppointmentDateTime:', parsedAppointmentDateTime);
    console.log('isAppointmentScheduled:', isAppointmentScheduled);

    // Determine business data based on availability
    let businessName = 'N/A';
    let customerName = callerInfo.caller_name || 'Unknown Caller';
    let customerPhone = callerInfo.phone_number || 'Unknown';
    let customerEmail = null;
    let serviceAddress = null;
    let serviceRequested = callerInfo.message || 'Webhook data received';
    let appointmentDetails = null;

    // Extract data from the new nested structure: data.analysis.data_collection_results
    if (webhookData.data && webhookData.data.analysis && webhookData.data.analysis.data_collection_results) {
      const results = webhookData.data.analysis.data_collection_results;
      
      if (results.business_name && results.business_name.value) {
        businessName = results.business_name.value;
      }
      
      if (results.customer_name && results.customer_name.value) {
        customerName = results.customer_name.value;
      }
      
      if (results.phone_number && results.phone_number.value) {
        customerPhone = String(results.phone_number.value);
      }
      
      if (results.email_address && results.email_address.value) {
        customerEmail = results.email_address.value;
      }
      
      if (results.service_address && results.service_address.value) {
        serviceAddress = results.service_address.value;
      }
      
      if (results.appointment_time && results.appointment_time.value) {
        appointmentDetails = results.appointment_time.value;
      }

      // Use transcript summary as service requested if available
      if (webhookData.data.analysis.transcript_summary) {
        serviceRequested = webhookData.data.analysis.transcript_summary;
      }
    }

    // Fallback to old variable structure if new structure is not available
    if (webhookData.variables && (!webhookData.data || !webhookData.data.analysis)) {
      const vars = webhookData.variables;
      
      if (vars.name) customerName = vars.name;
      if (vars.phone_number) customerPhone = String(vars.phone_number);
      if (vars.email) customerEmail = vars.email;
      if (vars.address) serviceAddress = vars.address;
      if (vars.appointment_details) appointmentDetails = vars.appointment_details;
      if (vars.service_requested) serviceRequested = vars.service_requested;
      if (vars.notes) serviceRequested = vars.notes;
    }

    console.log('=== CHECKING APPOINTMENT BOOKING CONDITIONS ===');
    console.log('businessUserId:', businessUserId);
    console.log('appointmentBookingEnabled:', appointmentBookingEnabled);
    console.log('isAppointmentScheduled:', isAppointmentScheduled);
    console.log('parsedAppointmentDateTime:', parsedAppointmentDateTime);
    console.log('status:', webhookData.data?.status);

    // Check appointment booking conditions
    console.log('=== CHECKING AUTOMATIC CALENDAR BOOKING ===');
    console.log('businessUserId:', businessUserId);
    console.log('appointmentBookingEnabled:', appointmentBookingEnabled);
    console.log('isAppointmentScheduled:', isAppointmentScheduled);
    console.log('parsedAppointmentDateTime:', parsedAppointmentDateTime);

    // Automatic calendar booking logic - works for both manual test calls and real webhooks
    // Only requires: appointment scheduled, valid date/time, and either business user OR manual test scenario
    const shouldCreateCalendarEvent = isAppointmentScheduled && parsedAppointmentDateTime && (
      (businessUserId && appointmentBookingEnabled) || // Real business user with booking enabled
      (!businessUserId) // Manual test call scenario
    );

    if (shouldCreateCalendarEvent) {
      console.log('✅ Creating automatic calendar event...');
      
      try {
        // For manual test calls, check if there's any connected Google Calendar
        let targetUserId = businessUserId;
        
        if (!businessUserId) {
          // For manual test calls, find a user with Google Calendar connected
          console.log('Manual test call - looking for connected Google Calendar user...');
          const { data: calendarUsers, error: calendarError } = await supabase
            .from('google_calendar_settings')
            .select('user_id')
            .eq('is_connected', true)
            .limit(1);
          
          if (calendarError) {
            console.error('Error checking calendar connections:', calendarError);
          } else if (calendarUsers && calendarUsers.length > 0) {
            targetUserId = calendarUsers[0].user_id;
            console.log('Found connected calendar user:', targetUserId);
          } else {
            console.log('No connected Google Calendar found for manual test call');
          }
        }

        if (targetUserId) {
          const bookingResult = await supabase.functions.invoke('google-calendar-book', {
            body: {
              userId: targetUserId,
              startTime: parsedAppointmentDateTime,
              endTime: parsedAppointmentDateTime, // The function will add duration
              callerName: customerName,
              phoneNumber: customerPhone,
              email: customerEmail,
              serviceAddress: serviceAddress,
              serviceType: serviceRequested,
              notes: `Service requested: ${serviceRequested}`
            }
          });

          if (bookingResult.error) {
            console.error('❌ Automatic calendar booking failed:', bookingResult.error);
          } else {
            console.log('✅ Automatic calendar appointment created successfully:', bookingResult.data);
          }
        }
      } catch (bookingError) {
        console.error('❌ Error during automatic calendar booking:', bookingError);
      }
    } else {
      console.log('❌ Automatic calendar booking conditions not met:');
      console.log('  - isAppointmentScheduled:', isAppointmentScheduled);
      console.log('  - parsedAppointmentDateTime:', parsedAppointmentDateTime ? 'present' : 'null/empty');
      console.log('  - businessUserId:', businessUserId ? 'present' : 'missing');
      console.log('  - appointmentBookingEnabled:', appointmentBookingEnabled);
    }

    // Save the call log to the database
    const callLogData = {
      user_id: businessUserId,
      caller_name: customerName,
      phone_number: customerPhone,
      email: customerEmail,
      message: serviceRequested,
      urgency_level: callerInfo.urgency_level,
      best_time_to_call: callerInfo.best_time_to_call,
      call_type: callerInfo.call_type,
      call_duration: 0, // Default duration since not provided
      recording_url: '',
      transcript: fullTranscript,
      call_status: 'completed',
      call_id: webhookData.data?.call_id || `call_${Date.now()}`,
      business_name: businessName,
      business_type: '',
      provider: 'elevenlabs',
      appointment_scheduled: isAppointmentScheduled,
      appointment_date_time: parsedAppointmentDateTime,
      service_address: serviceAddress,
      // Set business_id for manual test calls when no businessUserId is found
      business_id: businessUserId ? null : '5a8a338e-d401-4a14-a109-6974859ce5b8',
      metadata: {
        caller_zip: '',
        caller_address: serviceAddress || '',
        raw_webhook_data: webhookData
      }
    };

    console.log('Saving call log with data:', JSON.stringify(callLogData, null, 2));

    const { data: insertData, error: insertError } = await supabase
      .from('call_logs')
      .upsert(callLogData, { onConflict: 'call_id' })
      .select();

    if (insertError) {
      console.error('Error saving call log:', insertError);
      throw insertError;
    }

    console.log('Successfully saved call log:', insertData);

    // Also save to call_messages table for additional tracking
    if (fullTranscript && businessUserId) {
      const messageData = {
        user_id: businessUserId,
        caller_name: customerName,
        phone_number: customerPhone,
        message: serviceRequested,
        urgency_level: callerInfo.urgency_level,
        best_time_to_call: callerInfo.best_time_to_call,
        call_type: callerInfo.call_type
      };

      const { error: messageError } = await supabase
        .from('call_messages')
        .insert(messageData);

      if (messageError) {
        console.error('Error saving call message:', messageError);
      } else {
        console.log('Successfully saved call message');
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
    console.error("Webhook error:", (error as Error).message);
    return new Response(JSON.stringify({ 
      success: false,
      error: (error as Error).message || 'Unknown error'
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
    /(?:number)\s*[:,]?\s*([\d\s\-\(\)\+\.]{7,20})/i,
    /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/
  ];

  for (const pattern of phonePatterns) {
    const match = transcript.match(pattern);
    if (match) {
      const cleanNumber = match[1].replace(/[^\d]/g, '');
      if (cleanNumber.length >= 10) {
        info.phone_number = cleanNumber;
        break;
      }
    }
  }

  // Enhanced email extraction
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
  const emailMatch = transcript.match(emailPattern);
  if (emailMatch) {
    info.email = emailMatch[1];
  }

  // Determine urgency level
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediate', 'critical', 'broken', 'not working'];
  const lowUrgencyKeywords = ['when you can', 'no rush', 'whenever', 'convenient'];
  
  const lowerTranscript = transcript.toLowerCase();
  
  if (urgentKeywords.some(keyword => lowerTranscript.includes(keyword))) {
    info.urgency_level = 'high';
  } else if (lowUrgencyKeywords.some(keyword => lowerTranscript.includes(keyword))) {
    info.urgency_level = 'low';
  }

  // Determine call type
  if (lowerTranscript.includes('quote') || lowerTranscript.includes('estimate') || lowerTranscript.includes('price')) {
    info.call_type = 'quote_request';
  } else if (lowerTranscript.includes('schedule') || lowerTranscript.includes('appointment') || lowerTranscript.includes('book')) {
    info.call_type = 'appointment';
  } else if (lowerTranscript.includes('complaint') || lowerTranscript.includes('problem') || lowerTranscript.includes('issue')) {
    info.call_type = 'complaint';
  } else if (lowerTranscript.includes('information') || lowerTranscript.includes('hours') || lowerTranscript.includes('location')) {
    info.call_type = 'inquiry';
  } else {
    info.call_type = 'other';
  }

  return info;
}

function getNextWeekday(date: Date, targetDay: number): Date {
  const result = new Date(date);
  const currentDay = result.getDay();
  const daysUntilTarget = (targetDay + 7 - currentDay) % 7;
  result.setDate(result.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
  return result;
}

function parseAppointmentTime(appointmentTimeString: string, userTimezone: string): string | null {
  if (!appointmentTimeString || typeof appointmentTimeString !== 'string') {
    console.log('Invalid appointment time string:', appointmentTimeString);
    return null;
  }

  try {
    const now = new Date();
    const lowerStr = appointmentTimeString.toLowerCase().trim();
    
    // Day mapping
    const dayMap: { [key: string]: number } = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    // Time extraction patterns
    const timePatterns = [
      /(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /(\d{1,2})\s*(am|pm)/i,
      /(\d{1,2})\s*o'?clock/i
    ];

    // Time word mapping
    const timeWords: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
      'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12,
      'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
      'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
      'thirty': 30, 'forty': 40, 'fifty': 50
    };

    let hour = 9, minute = 0; // Default time
    let appointmentDate = new Date(now);

    // Extract time - try word patterns first
    const wordTimeMatch = lowerStr.match(/(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(thirty|fifteen|forty-five|o'?clock)?.*?(morning|afternoon|evening|am|pm)/i);
    if (wordTimeMatch) {
      hour = timeWords[wordTimeMatch[1]];
      
      if (wordTimeMatch[2]) {
        if (wordTimeMatch[2].includes('thirty')) {
          minute = 30;
        } else if (wordTimeMatch[2].includes('fifteen')) {
          minute = 15;
        } else if (wordTimeMatch[2].includes('forty-five')) {
          minute = 45;
        }
      }
      
      const period = wordTimeMatch[3];
      if (period && (period.includes('afternoon') || period.includes('evening') || period.includes('pm')) && hour !== 12) {
        hour += 12;
      } else if (period && (period.includes('morning') || period.includes('am')) && hour === 12) {
        hour = 0;
      }
    } else {
      // Extract time using numeric patterns
      for (const pattern of timePatterns) {
        const timeMatch = lowerStr.match(pattern);
        if (timeMatch) {
          hour = parseInt(timeMatch[1]);
          minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          
          if (timeMatch[3] && timeMatch[3].toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
          } else if (timeMatch[3] && timeMatch[3].toLowerCase() === 'am' && hour === 12) {
            hour = 0;
          }
          break;
        }
      }
    }

    // Convert words to numbers for dates
    const numberWords: { [key: string]: string } = {
      'first': '1', 'second': '2', 'third': '3', 'fourth': '4', 'fifth': '5',
      'sixth': '6', 'seventh': '7', 'eighth': '8', 'ninth': '9', 'tenth': '10',
      'eleventh': '11', 'twelfth': '12', 'thirteenth': '13', 'fourteenth': '14',
      'fifteenth': '15', 'sixteenth': '16', 'seventeenth': '17', 'eighteenth': '18',
      'nineteenth': '19', 'twentieth': '20', 'twenty-first': '21', 'twenty-second': '22',
      'twenty-third': '23', 'twenty-fourth': '24', 'twenty-fifth': '25', 'twenty-sixth': '26',
      'twenty-seventh': '27', 'twenty-eighth': '28', 'twenty-ninth': '29', 'thirtieth': '30',
      'thirty-first': '31'
    };

    let processedStr = lowerStr;
    for (const [word, num] of Object.entries(numberWords)) {
      processedStr = processedStr.replace(new RegExp(word, 'g'), num);
    }

    // Extract day of week
    for (const [day, dayNum] of Object.entries(dayMap)) {
      if (processedStr.includes(day)) {
        appointmentDate = getNextWeekday(now, dayNum);
        break;
      }
    }

    // Check for specific date patterns (month day format)
    const monthMap: { [key: string]: number } = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
      'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    for (const [month, monthNum] of Object.entries(monthMap)) {
      if (processedStr.includes(month)) {
        const dayMatch = processedStr.match(new RegExp(`${month}\\s*(\\d{1,2})`, 'i'));
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          appointmentDate = new Date(now.getFullYear(), monthNum, day);
          
          // If the date has passed this year, set it for next year
          if (appointmentDate < now) {
            appointmentDate.setFullYear(now.getFullYear() + 1);
          }
          break;
        }
      }
    }

    // Check for relative days
    if (processedStr.includes('tomorrow')) {
      appointmentDate = new Date(now);
      appointmentDate.setDate(now.getDate() + 1);
    } else if (processedStr.includes('today')) {
      appointmentDate = new Date(now);
    } else if (processedStr.includes('next week')) {
      appointmentDate = new Date(now);
      appointmentDate.setDate(now.getDate() + 7);
    }

    // Set the time
    appointmentDate.setHours(hour, minute, 0, 0);

    // Ensure the appointment is in the future
    if (appointmentDate <= now) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }

    // Convert to timezone-aware ISO string
    // The appointmentDate is treated as being in the user's timezone
    // We need to adjust for timezone offset to get the correct UTC time
    const timezoneOffset = getTimezoneOffset(userTimezone);
    const utcDate = new Date(appointmentDate.getTime() - (timezoneOffset * 60 * 1000));
    const isoString = utcDate.toISOString();
    
    console.log(`Parsed appointment time: "${appointmentTimeString}" -> ${isoString} (user timezone: ${userTimezone}, offset: ${timezoneOffset})`);
    return isoString;

  } catch (error) {
    console.error('Error parsing appointment time:', error);
    return null;
  }
}

function getTimezoneOffset(timezone: string): number {
  // Map common timezone names to their UTC offsets (in minutes)
  const timezoneOffsets: { [key: string]: number } = {
    'America/New_York': -240, // EDT (UTC-4) during summer, -300 (UTC-5) during winter
    'America/Chicago': -300,   // CDT (UTC-5) during summer, -360 (UTC-6) during winter  
    'America/Denver': -360,    // MDT (UTC-6) during summer, -420 (UTC-7) during winter
    'America/Los_Angeles': -420, // PDT (UTC-7) during summer, -480 (UTC-8) during winter
    'America/Phoenix': -420,   // MST (UTC-7) year round
    'America/Anchorage': -480, // AKDT (UTC-8) during summer, -540 (UTC-9) during winter
    'Pacific/Honolulu': -600   // HST (UTC-10) year round
  };
  
  // Default to Eastern Time if timezone not found
  return timezoneOffsets[timezone] || -240;
}