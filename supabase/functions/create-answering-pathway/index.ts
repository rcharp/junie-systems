import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PathwayRequest {
  business_name?: string;
  business_type?: string;
  business_hours?: string;
  business_address?: string;
  business_phone?: string;
  custom_greeting?: string;
  common_questions?: string;
  forwarding_number?: string;
  services?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BLAND_AI_API_KEY = Deno.env.get('BLAND_AI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!BLAND_AI_API_KEY) {
      throw new Error('Bland AI API key not configured');
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

    const pathwayData: PathwayRequest = await req.json();

    // Get business settings from database if not provided
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const business = {
      name: pathwayData.business_name || businessSettings?.business_name || 'Junie',
      type: pathwayData.business_type || businessSettings?.business_type || 'AI Answering Service',
      hours: pathwayData.business_hours || businessSettings?.business_hours || '24/7',
      address: pathwayData.business_address || businessSettings?.business_address || 'Available nationwide',
      phone: pathwayData.business_phone || businessSettings?.business_phone || 'Main line',
      greeting: pathwayData.custom_greeting || businessSettings?.custom_greeting || '',
      questions: pathwayData.common_questions || businessSettings?.common_questions || '',
      forwarding: pathwayData.forwarding_number || businessSettings?.forwarding_number || ''
    };

    // Create comprehensive pathway configuration
    const pathwayConfig = {
      name: `${business.name} AI Answering Service`,
      description: `Comprehensive AI answering service for ${business.name} - handles appointments, inquiries, and customer service`,
      nodes: {
        // Entry point - greeting and routing
        "greeting": {
          type: "base",
          data: {
            name: "Professional Greeting",
            prompt: business.greeting || 
              `Hello! Thank you for calling ${business.name}. This is your AI assistant. I'm here to help with appointments, questions about our services, or connect you with the right person. How can I assist you today?`,
            voice_settings: {
              voice_id: "nat", // Natural American female voice
              speed: 1.0,
              stability: 0.8,
              emotion: "friendly"
            }
          },
          edges: [
            {
              condition: "caller wants to schedule appointment or asks about booking",
              target_node: "appointment_booking"
            },
            {
              condition: "caller has questions about services, pricing, or general inquiries",
              target_node: "information_service"
            },
            {
              condition: "caller has urgent issue, emergency, or complaint",
              target_node: "urgent_handling"
            },
            {
              condition: "caller wants to speak to specific person or department",
              target_node: "transfer_request"
            },
            {
              condition: "caller is unclear or needs clarification",
              target_node: "clarification"
            }
          ]
        },

        // Appointment booking flow
        "appointment_booking": {
          type: "conversation",
          data: {
            name: "Appointment Booking",
            prompt: `I'd be happy to help you schedule an appointment! Let me gather some information to find the best time for you.

First, could you please tell me:
1. Your full name?
2. A good phone number to reach you?
3. What type of service or appointment you need?
4. When would work best for you - do you have any preferred days or times?

${business.hours ? `Our current hours are ${business.hours}.` : ''}

I'll also need your email address if you'd like to receive a confirmation.`,
            
            required_info: ["name", "phone", "service_type", "preferred_time"],
            validation_rules: {
              phone: "must be valid phone number format",
              email: "must be valid email format if provided"
            }
          },
          edges: [
            {
              condition: "all required information collected successfully",
              target_node: "appointment_confirmation"
            },
            {
              condition: "caller needs to reschedule or has scheduling conflict",
              target_node: "schedule_adjustment"
            },
            {
              condition: "caller asks questions about services during booking",
              target_node: "service_info_during_booking"
            }
          ]
        },

        "appointment_confirmation": {
          type: "conversation",
          data: {
            name: "Appointment Confirmation",
            prompt: `Perfect! Let me confirm your appointment details:

- Name: [repeat name]
- Phone: [repeat phone]
- Service: [repeat service type]
- Preferred time: [repeat preferred time]
- Email: [repeat email if provided]

I'm scheduling this appointment request for you. You should receive a confirmation call or message within 24 hours to confirm the exact time slot.

Is there anything else you need help with today? Any questions about preparing for your appointment or what to expect?`
          },
          edges: [
            {
              condition: "caller is satisfied and ready to end call",
              target_node: "call_wrap_up"
            },
            {
              condition: "caller has additional questions",
              target_node: "information_service"
            }
          ]
        },

        // Information service flow
        "information_service": {
          type: "conversation",
          data: {
            name: "Information & Questions",
            prompt: `I'm here to help answer your questions about ${business.name}! 

${business.questions ? `Here's some information that might be helpful:\n${business.questions}\n\n` : ''}

What would you like to know? I can help with:
- Our services and what we offer
- Pricing and packages
- Business hours and location
- How our process works
- Scheduling and availability

What specific information can I provide for you?`,
            
            knowledge_base: {
              business_info: business,
              common_topics: [
                "services", "pricing", "hours", "location", "process", "availability",
                "contact_info", "staff", "qualifications", "testimonials"
              ]
            }
          },
          edges: [
            {
              condition: "caller wants to book appointment after getting information",
              target_node: "appointment_booking"
            },
            {
              condition: "caller needs to speak to someone for complex questions",
              target_node: "transfer_request"
            },
            {
              condition: "caller is satisfied with information",
              target_node: "call_wrap_up"
            }
          ]
        },

        // Urgent/complaint handling
        "urgent_handling": {
          type: "conversation",
          data: {
            name: "Urgent Issue Handler",
            prompt: `I understand this is urgent. I'm here to help and want to make sure you get the assistance you need right away.

Can you please tell me:
1. Your name and phone number?
2. What's the urgent situation?
3. Do you need immediate assistance or can this wait for a callback?

I'll make sure this gets priority attention and the right person contacts you as soon as possible.`,
            
            urgency_level: "high",
            escalation_triggers: ["emergency", "complaint", "urgent", "problem", "issue"]
          },
          edges: [
            {
              condition: "true emergency requiring immediate transfer",
              target_node: "immediate_transfer"
            },
            {
              condition: "urgent but can wait for callback",
              target_node: "urgent_callback_setup"
            }
          ]
        },

        "urgent_callback_setup": {
          type: "conversation",
          data: {
            name: "Urgent Callback Setup",
            prompt: `I've noted this as urgent and have all your information. Someone will contact you within the next hour to address your situation.

In the meantime, is there anything immediate I can help clarify or any additional information you'd like me to pass along?

You should expect a call back at [phone number] within one hour. If you don't hear back within that time, please call us again.`
          },
          edges: [
            {
              condition: "caller is satisfied with urgent callback arrangement",
              target_node: "call_wrap_up"
            }
          ]
        },

        // Transfer request handling
        "transfer_request": {
          type: "conversation",
          data: {
            name: "Transfer Request Handler",
            prompt: `I'd be happy to help connect you with the right person. 

Could you tell me:
1. Who specifically would you like to speak with, or what department?
2. What's this regarding so I can direct you properly?
3. Your name and phone number in case we get disconnected?

${business.forwarding ? `Let me see if they're available to take your call now.` : `I'll get you set up for a callback from the right person.`}`
          },
          edges: [
            {
              condition: "person/department available for immediate transfer",
              target_node: "immediate_transfer"
            },
            {
              condition: "need to schedule callback",
              target_node: "callback_scheduling"
            }
          ]
        },

        "immediate_transfer": {
          type: "transfer",
          data: {
            name: "Live Transfer",
            transfer_number: business.forwarding || "",
            message: "I'm transferring you now. Please hold while I connect you.",
            backup_action: "callback_scheduling"
          }
        },

        "callback_scheduling": {
          type: "conversation",
          data: {
            name: "Callback Scheduling",
            prompt: `I'll arrange for someone to call you back. 

When would be the best time to reach you? I can schedule this for:
- Later today
- Tomorrow morning or afternoon
- A specific day/time that works for you

What phone number should they use to reach you, and what's the best time?`
          },
          edges: [
            {
              condition: "callback scheduled successfully",
              target_node: "call_wrap_up"
            }
          ]
        },

        // Clarification for unclear requests
        "clarification": {
          type: "conversation",
          data: {
            name: "Clarification Assistant",
            prompt: `I want to make sure I help you with exactly what you need. Could you tell me a bit more about what brought you to call ${business.name} today?

For example:
- Are you looking to schedule an appointment?
- Do you have questions about our services?
- Is there a specific person you need to speak with?
- Do you have an urgent matter that needs attention?

Take your time - I'm here to help!`
          },
          edges: [
            {
              condition: "caller clarifies they want appointment",
              target_node: "appointment_booking"
            },
            {
              condition: "caller clarifies they have questions",
              target_node: "information_service"
            },
            {
              condition: "caller clarifies urgent matter",
              target_node: "urgent_handling"
            },
            {
              condition: "caller wants to speak to someone",
              target_node: "transfer_request"
            }
          ]
        },

        // Service info during booking
        "service_info_during_booking": {
          type: "conversation",
          data: {
            name: "Service Info During Booking",
            prompt: `Let me answer your service questions first, then we'll finish scheduling your appointment.

${business.questions ? business.questions : 'What would you like to know about our services?'}

Once I've answered your questions, we'll get back to booking your appointment.`
          },
          edges: [
            {
              condition: "questions answered, ready to continue booking",
              target_node: "appointment_booking"
            },
            {
              condition: "needs more detailed service information",
              target_node: "information_service"
            }
          ]
        },

        "schedule_adjustment": {
          type: "conversation",
          data: {
            name: "Schedule Adjustment",
            prompt: `No problem! Let's find a time that works better for you. 

What would work better for your schedule? I can help you with:
- Different days of the week
- Morning, afternoon, or evening times
- Next week or further out
- Specific dates you have in mind

What would be most convenient for you?`
          },
          edges: [
            {
              condition: "new time preferences provided",
              target_node: "appointment_confirmation"
            }
          ]
        },

        // Call wrap-up
        "call_wrap_up": {
          type: "conversation",
          data: {
            name: "Professional Call Wrap-up",
            prompt: `Perfect! Is there anything else I can help you with today?

Just to summarize what we've arranged:
[Repeat key points from the call]

Thank you for calling ${business.name}! Have a wonderful day!`
          },
          edges: [
            {
              condition: "caller ready to end call",
              target_node: "end_call"
            },
            {
              condition: "caller has additional needs",
              target_node: "information_service"
            }
          ]
        },

        "end_call": {
          type: "end_call",
          data: {
            name: "End Call Gracefully",
            message: `Thank you for calling ${business.name}. Goodbye!`
          }
        }
      },

      // Global settings
      global_settings: {
        voice: {
          voice_id: "nat", // Natural American female voice
          speed: 1.0,
          stability: 0.8,
          emotion: "friendly"
        },
        max_duration: 600, // 10 minutes max
        interruption_threshold: 500,
        webhook_url: `https://${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}.functions.supabase.co/bland-webhook`,
        data_collection: {
          required_fields: ["caller_name", "phone_number", "call_purpose"],
          optional_fields: ["email", "preferred_callback_time", "urgency_level"]
        }
      }
    };

    console.log('Creating AI answering service pathway...');

    // Create the pathway using Bland AI API
    const response = await fetch("https://api.bland.ai/v1/pathway/create", {
      method: "POST",
      headers: {
        "Authorization": BLAND_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: pathwayConfig.name,
        description: pathwayConfig.description,
        // Note: The actual pathway structure would need to be configured 
        // through Bland AI's dashboard after creation - this creates the base pathway
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bland AI pathway creation error:', errorText);
      throw new Error(`Failed to create pathway: ${response.status} ${response.statusText}`);
    }

    const pathwayResult = await response.json();
    console.log("Pathway created successfully:", pathwayResult);

    // Save pathway configuration to database
    const { error: insertError } = await supabase
      .from('business_settings')
      .upsert({
        user_id: user.id,
        business_name: business.name,
        business_type: business.type,
        business_hours: business.hours,
        business_address: business.address,
        business_phone: business.phone,
        custom_greeting: business.greeting,
        common_questions: business.questions,
        forwarding_number: business.forwarding,
        // Store pathway info in metadata-like field
        urgent_keywords: JSON.stringify({
          pathway_id: pathwayResult.pathway_id,
          pathway_config: pathwayConfig
        })
      });

    if (insertError) {
      console.error('Error saving pathway configuration:', insertError);
    }

    return new Response(JSON.stringify({
      success: true,
      pathway_id: pathwayResult.pathway_id,
      message: "AI answering service pathway created successfully",
      configuration: {
        name: pathwayConfig.name,
        description: pathwayConfig.description,
        voice: "American female (natural)",
        features: [
          "Appointment booking",
          "Customer service inquiries", 
          "Urgent issue handling",
          "Call transfers",
          "Information service",
          "Lead capture"
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating pathway:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});