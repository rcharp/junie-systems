import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to add 1 country code to US phone numbers and convert to integer
const addUSCountryCode = (phoneNumber: string): number => {
  if (!phoneNumber || phoneNumber.trim() === "") return 0;

  const cleaned = phoneNumber.replace(/\D/g, ""); // Remove all non-digits

  // If it's already an 11-digit number starting with 1, return as integer
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return parseInt(cleaned, 10);
  }

  // If it's a 10-digit US number, add 1 and return as integer
  if (cleaned.length === 10) {
    return parseInt(`1${cleaned}`, 10);
  }

  // For other formats, return the cleaned digits as integer
  return parseInt(cleaned, 10) || 0;
};

serve(async (req) => {
  console.log("=== BUSINESS-DATA FUNCTION CALLED ===");
  console.log("business-data function called with method:", req.method);
  console.log("Request URL:", req.url);
  console.log("Request headers:", Object.fromEntries(req.headers.entries()));
  console.log("Timestamp:", new Date().toISOString());

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow both GET and POST requests
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST or GET." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("Environment check - SUPABASE_URL exists:", !!supabaseUrl);
    console.log("Environment check - SERVICE_ROLE_KEY exists:", !!supabaseKey);

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing environment variables");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let businessId: string | undefined;
    let requestSource = "unknown";
    let parsedBody: any = {};

    if (req.method === "POST") {
      parsedBody = await req.json();
      console.log("Request body:", parsedBody);
      console.log("Request body type:", typeof parsedBody);
      console.log("Has business_id in body:", !!parsedBody?.business_id);
      console.log("Has agent_id in body:", !!parsedBody?.agent_id);

      // Check if this is an ElevenLabs conversation initiation request
      if (parsedBody?.caller_id || parsedBody?.agent_id || parsedBody?.called_number || parsedBody?.call_sid) {
        console.log("ElevenLabs conversation initiation request detected");

        // SECURITY: Validate ElevenLabs agent_id matches expected value
        const expectedAgentId = Deno.env.get("ELEVENLABS_AGENT_ID");
        if (expectedAgentId && parsedBody?.agent_id !== expectedAgentId) {
          console.error("Invalid agent_id. Expected:", expectedAgentId, "Got:", parsedBody?.agent_id);
          return new Response(JSON.stringify({ error: "Unauthorized: Invalid agent credentials" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get business_id from headers OR body (check both locations)
        const conversationBusinessId = req.headers.get("business_id") || parsedBody?.business_id;
        console.log("ElevenLabs business_id from headers:", req.headers.get("business_id"));
        console.log("ElevenLabs business_id from body:", parsedBody?.business_id);
        console.log("Final business_id used:", conversationBusinessId);

        // Store call_sid for transfer - use a temporary mapping with just business_id since we don't have conversation_id yet
        if (parsedBody?.call_sid && conversationBusinessId) {
          const { data: businessSettings } = await supabase
            .from("business_settings")
            .select("user_id")
            .eq("id", conversationBusinessId)
            .single();

          // Store most recent call for this business (will be used for transfer lookup)
          // Also capture the incoming_call_phone_number (From number) from the call_sid data
          const incomingCallPhoneNumber = parsedBody.from || parsedBody.From || null;
          const { error: mappingError } = await supabase.from("conversation_call_mapping").upsert({
            conversation_id: `temp_${conversationBusinessId}_${Date.now()}`,
            call_sid: parsedBody.call_sid,
            business_id: conversationBusinessId,
            user_id: businessSettings?.user_id,
            incoming_call_phone_number: incomingCallPhoneNumber,
          });

          if (mappingError) {
            console.error("Error storing call mapping:", mappingError);
          } else {
            console.log("Stored call mapping for business:", conversationBusinessId, "call_sid:", parsedBody.call_sid);
          }
        }

        // Get actual business data and available times for conversation initiation
        const { data: businessDataForInit, error: businessError } = await supabase
          .from("business_settings")
          .select(
            `
            user_id,
            business_name,
            business_type,
            business_type_full_name,
            business_phone,
            business_address,
            business_address_state_full,
            business_website,
            business_hours,
            business_description,
            common_questions,
            pricing_structure,
            appointment_booking,
            services_offered,
            forwarding_number,
            urgent_keywords,
            auto_forward
          `,
          )
          .eq("id", conversationBusinessId)
          .maybeSingle();

        // Fetch calendar settings and available times if appointment booking is enabled
        let dynamicAvailableTimes = businessDataForInit?.business_hours || "Monday-Friday: 9:00 AM - 5:00 PM";
        if (businessDataForInit?.appointment_booking) {
          const { data: calendarSettings } = await supabase
            .from("google_calendar_settings")
            .select("*")
            .eq("user_id", businessDataForInit.user_id)
            .single();

          if (calendarSettings && calendarSettings.is_connected) {
            try {
              console.log("Fetching calendar availability for conversation initiation");
              const availabilityResponse = await supabase.functions.invoke("google-calendar-availability", {
                body: { user_id: businessDataForInit.user_id },
              });

              console.log(
                "Availability response for conversation initiation:",
                JSON.stringify(availabilityResponse, null, 2),
              );

              if (
                availabilityResponse.data &&
                !availabilityResponse.error &&
                availabilityResponse.data.slots?.length > 0
              ) {
                const slots = availabilityResponse.data.slots.slice(0, 5); // Show first 5 available slots
                // Format as JSON string similar to business_hours format
                const timeSlots = slots.map((slot: any) => {
                  // Use the humanReadable field which should already be properly formatted
                  return slot.humanReadable || `${slot.startTime} - ${slot.endTime}`;
                });
                dynamicAvailableTimes = JSON.stringify(timeSlots);
              }
            } catch (error) {
              console.error("Error fetching calendar availability for conversation initiation:", error);
            }
          }
        }

        // Parse common_questions from text format to structured Q&A pairs
        const parseCommonQuestions = (questionsText: string): Array<{ question: string; answer: string }> => {
          if (!questionsText) return [];

          const pairs: Array<{ question: string; answer: string }> = [];
          const lines = questionsText.split("\n").filter((line) => line.trim());

          let currentQuestion = "";
          let currentAnswer = "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("Q:")) {
              // If we have a previous Q&A pair, save it
              if (currentQuestion && currentAnswer) {
                pairs.push({ question: currentQuestion, answer: currentAnswer });
              }
              currentQuestion = trimmedLine.substring(2).trim();
              currentAnswer = "";
            } else if (trimmedLine.startsWith("A:")) {
              currentAnswer = trimmedLine.substring(2).trim();
            } else if (currentAnswer && trimmedLine) {
              // Continue building the answer if there are multiple lines
              currentAnswer += " " + trimmedLine;
            }
          }

          // Don't forget the last pair
          if (currentQuestion && currentAnswer) {
            pairs.push({ question: currentQuestion, answer: currentAnswer });
          }

          return pairs;
        };

        const parsedCommonQuestions = parseCommonQuestions(businessDataForInit?.common_questions || "");

        // Return the conversation initiation format that ElevenLabs expects
        const conversationInitData = {
          type: "conversation_initiation_client_data",
          dynamic_variables: {
            business_id: conversationBusinessId,
            business_name: businessDataForInit?.business_name || "Charpentier Air Conditioning",
            business_type: businessDataForInit?.business_type || "hvac",
            business_type_full_name: businessDataForInit?.business_type_full_name || "HVAC & Air Conditioning",
            business_phone: businessDataForInit?.business_phone || "7278714862",
            business_address: businessDataForInit?.business_address || "5605 Trevesta Place, Palmetto, Florida, 34221",
            business_address_state_full: businessDataForInit?.business_address_state_full || "Florida",
            business_website: businessDataForInit?.business_website || "",
            business_hours: businessDataForInit?.business_hours || "Monday-Friday 9am-5pm",
            business_description: businessDataForInit?.business_description || "",
            common_questions: businessDataForInit?.common_questions || "",
            pricing_structure: businessDataForInit?.pricing_structure || "",
            appointment_booking: String(businessDataForInit?.appointment_booking || false),
            available_times: dynamicAvailableTimes,
            services:
              businessDataForInit?.services_offered || "HVAC service, A/C repair, thermostat fix, refrigerant refill",
            forwarding_number: addUSCountryCode(businessDataForInit?.forwarding_number || ""),
            urgent_keywords: businessDataForInit?.urgent_keywords || "emergency, urgent, asap, immediately",
            auto_forward_urgent: String(businessDataForInit?.auto_forward || false),
            callback_timeframe: "within 24 hours",
            pronunciations: "HVAC: H vac, hvac: H vac",
          },
        };

        // Log the ElevenLabs conversation initiation request
        try {
          const requestHeaders = Object.fromEntries(req.headers.entries());

          await supabase.from("business_data_requests").insert({
            business_id: conversationBusinessId,
            request_type: "conversation_initiation",
            request_source: "elevenlabs",
            request_data: {
              url: req.url,
              method: req.method,
              headers: requestHeaders,
              ...parsedBody,
            },
            response_status: 200,
            response_data: conversationInitData,
            user_agent: req.headers.get("user-agent") || "",
            ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "",
          });

          console.log("Successfully logged ElevenLabs conversation initiation request");
        } catch (logError) {
          console.error("Error logging ElevenLabs request:", logError);
          // Don't fail the main response if logging fails
        }

        return new Response(JSON.stringify(conversationInitData), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      // Check if this is an ElevenLabs post-call transcription with nested business_id
      if (parsedBody?.conversation_initiation_client_data?.dynamic_variables?.business_id) {
        console.log("ElevenLabs post-call transcription request detected");
        businessId = parsedBody.conversation_initiation_client_data.dynamic_variables.business_id;
        requestSource = "elevenlabs_transcription";
        console.log("ElevenLabs transcription business_id:", businessId);
      } else if (parsedBody && parsedBody.business_id) {
        // Manual request with business_id in body
        businessId = parsedBody.business_id;
        requestSource = "manual";
        console.log("MANUAL request detected - business_id from request body:", businessId);
      } else {
        console.log("Unknown request type - checking headers for business_id");
        requestSource = "elevenlabs";
        businessId = req.headers.get("business_id") || req.headers.get("x-business-id") || undefined;
        console.log("Fallback to headers - business_id:", businessId);
      }
    } else {
      // GET request
      const url = new URL(req.url);
      businessId = url.searchParams.get("business_id") || undefined;
      requestSource = "api";
      console.log("API request detected - Query parameters:", Object.fromEntries(url.searchParams));
    }

    console.log("Final businessId being used:", businessId);
    console.log("Final requestSource being used:", requestSource);

    if (!businessId) {
      return new Response(JSON.stringify({ error: "business_id parameter is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate that businessId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      return new Response(JSON.stringify({ error: "Invalid business_id format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch business settings
    const { data: businessData, error } = await supabase
      .from("business_settings")
      .select(
        `
        user_id,
        business_name,
        business_type,
        business_type_full_name,
        business_phone,
        business_address,
        business_address_state_full,
        business_hours,
        business_description,
        business_website,
        services_offered,
        pricing_structure,
        custom_greeting,
        common_questions,
        ai_personality,
        appointment_booking,
        lead_capture,
        forwarding_number,
        urgent_keywords
      `,
      )
      .eq("id", businessId)
      .maybeSingle();

    console.log("Business data query result:", { businessData, error });

    if (error) {
      console.error("Database error fetching business data:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch business data", details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!businessData) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Google Calendar settings if available
    const { data: calendarSettings } = await supabase
      .from("google_calendar_settings")
      .select("*")
      .eq("user_id", businessData.user_id)
      .single();

    // Generate available times based on business hours or calendar availability
    let availableTimes = businessData.business_hours || "Monday-Friday: 9:00 AM - 5:00 PM"; // Default fallback

    if (calendarSettings && calendarSettings.is_connected) {
      try {
        console.log("Fetching calendar availability for user_id:", businessData.user_id);
        const availabilityResponse = await supabase.functions.invoke("google-calendar-availability", {
          body: { user_id: businessData.user_id },
        });

        console.log("Full availability response:", JSON.stringify(availabilityResponse, null, 2));

        if (availabilityResponse.data && !availabilityResponse.error && availabilityResponse.data.available) {
          const slots = availabilityResponse.data.slots || [];
          console.log("Calendar slots received:", slots);
          console.log("Number of slots:", slots.length);
          console.log("First slot sample:", slots[0]);

          if (slots.length > 0) {
            // Format the slots exactly as requested in your example
            const formattedSlots = slots.map((slot: any) => ({
              startTime: slot.startTime,
              endTime: slot.endTime,
              timeOfDay: slot.timeOfDay,
              humanReadable: slot.humanReadable,
            }));

            console.log("Formatted slots:", formattedSlots);
            availableTimes = formattedSlots;
          } else {
            console.log("No slots returned from calendar");
          }
        } else {
          console.log("Calendar not available or error:", {
            hasData: !!availabilityResponse.data,
            error: availabilityResponse.error,
            available: availabilityResponse.data?.available,
          });
        }
      } catch (error) {
        console.error("Error fetching calendar availability:", error);
      }
    } else {
      console.log("Calendar not connected or settings not found");
    }

    // Format the response
    const responseData = {
      businessData: {
        business_id: businessId, // Include the business_id that was requested
        business_name: businessData.business_name || "N/A",
        business_type: businessData.business_type || "N/A",
        business_type_full_name: businessData.business_type_full_name || "N/A",
        business_hours: businessData.business_hours || "N/A",
        business_phone: businessData.business_phone || "N/A",
        business_address: businessData.business_address || "N/A",
        business_address_state_full: businessData.business_address_state_full || "N/A",
        business_website: businessData.business_website || "N/A",
        common_questions: businessData.common_questions || "",
        services_offered: businessData.services_offered || "N/A",
        pricing_structure: businessData.pricing_structure || "N/A",
        appointment_booking: businessData.appointment_booking || false,
        business_description: businessData.business_description || "N/A",
        forwarding_number: addUSCountryCode(businessData.forwarding_number || "N/A"),
        urgent_keywords: businessData.urgent_keywords || "emergency, urgent, asap, immediately",
        callback_timeframe: "within 24 hours",
      },
      available_times: availableTimes,
      error: null,
    };

    // Log the request to business_data_requests table
    try {
      let requestData = {};
      if (req.method === "POST") {
        // Use the already parsed body
        requestData = parsedBody;
      } else {
        const url = new URL(req.url);
        requestData = Object.fromEntries(url.searchParams);
      }

      const requestHeaders = Object.fromEntries(req.headers.entries());

      const insertResult = await supabase.from("business_data_requests").insert({
        business_id: businessId,
        request_type: requestSource === "elevenlabs" ? "conversation_initiation" : "data_request",
        request_source: requestSource,
        request_data: {
          url: req.url,
          method: req.method,
          headers: requestHeaders,
          ...requestData,
        },
        response_status: 200,
        response_data: responseData,
        user_agent: req.headers.get("user-agent") || "",
        ip_address: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "",
      });

      console.log("Insert result:", insertResult);
      console.log("Successfully logged request to business_data_requests table");
    } catch (logError) {
      console.error("Error logging request to business_data_requests table:", logError);
      // Don't fail the main response if logging fails
    }

    return new Response(JSON.stringify(responseData), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in business-data function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
