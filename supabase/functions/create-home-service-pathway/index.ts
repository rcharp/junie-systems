import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HomeServicePathwayRequest {
  business_name?: string;
  business_type?: string;
  service_areas?: string[];
  services_offered?: string[];
  business_hours?: string;
  emergency_available?: boolean;
  pricing_structure?: string;
  license_info?: string;
  insurance_info?: string;
  warranty_info?: string;
  booking_system?: string;
  payment_methods?: string[];
  technician_availability?: string;
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

    const pathwayData: HomeServicePathwayRequest = await req.json();

    // Get business settings from database if not provided
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const business = {
      name: pathwayData.business_name || businessSettings?.business_name || 'Professional Home Services',
      type: pathwayData.business_type || businessSettings?.business_type || 'Home Service Company',
      hours: pathwayData.business_hours || businessSettings?.business_hours || 'Monday-Friday 8AM-6PM, Saturday 9AM-4PM',
      services: pathwayData.services_offered || ['Plumbing', 'Electrical', 'HVAC', 'General Repairs'],
      serviceAreas: pathwayData.service_areas || ['Local service area'],
      emergency: pathwayData.emergency_available || true,
      pricing: pathwayData.pricing_structure || 'Free estimates, competitive pricing',
      license: pathwayData.license_info || 'Licensed and insured',
      insurance: pathwayData.insurance_info || 'Fully insured',
      warranty: pathwayData.warranty_info || 'All work guaranteed',
      booking: pathwayData.booking_system || 'Flexible scheduling',
      payments: pathwayData.payment_methods || ['Cash', 'Check', 'Credit Cards'],
      techAvailability: pathwayData.technician_availability || 'Same-day and next-day appointments available'
    };

    // Create comprehensive home service pathway configuration
    const homeServicePathwayConfig = {
      name: `${business.name} - Home Service Answering System`,
      description: `Comprehensive AI answering service for ${business.name} - handles quotes, scheduling, emergencies, and all customer service`,
      nodes: {
        // Entry point - professional greeting and call classification
        "greeting": {
          type: "base",
          data: {
            name: "Professional Home Service Greeting",
            prompt: `Hello! Thank you for calling ${business.name}. This is your AI assistant, and I'm here to help you with all your home service needs. 

I can help you with:
• Getting a free estimate or quote
• Scheduling a service appointment
• Emergency service requests
• Questions about our services
• Speaking with a technician or manager

What can I help you with today?`,
            voice_settings: {
              voice_id: "nat", // Natural American female voice
              speed: 1.0,
              stability: 0.8,
              emotion: "professional_friendly"
            }
          },
          edges: [
            {
              condition: "caller needs emergency service or has urgent repair issue",
              target_node: "emergency_handling"
            },
            {
              condition: "caller wants quote, estimate, or pricing information",
              target_node: "quote_request"
            },
            {
              condition: "caller wants to schedule service or technician visit",
              target_node: "service_scheduling"
            },
            {
              condition: "caller has questions about services, capabilities, or general inquiry",
              target_node: "service_information"
            },
            {
              condition: "caller is following up on previous work or has complaint",
              target_node: "followup_complaint"
            },
            {
              condition: "caller wants to speak to specific person or department",
              target_node: "transfer_request"
            },
            {
              condition: "caller is unclear about their needs",
              target_node: "needs_clarification"
            }
          ]
        },

        // Emergency handling - highest priority
        "emergency_handling": {
          type: "conversation",
          data: {
            name: "Emergency Service Handler",
            prompt: `I understand this is an emergency situation. ${business.emergency ? 'We do provide emergency services.' : 'Let me help you get urgent assistance.'}

For your safety, if this is a gas leak, electrical hazard, or flooding emergency, please also contact your utility company or emergency services if needed.

Can you tell me:
1. Your name and phone number?
2. Your address where the emergency is located?
3. What type of emergency - plumbing, electrical, heating/cooling, or other?
4. Describe what's happening - is there immediate danger or property damage?
5. Is this a safe situation or do you need to leave the area?

${business.emergency ? 'I\'ll get an emergency technician dispatched to you right away.' : 'I\'ll connect you with our emergency service coordinator immediately.'}`,
            
            urgency_level: "emergency",
            required_info: ["name", "phone", "address", "emergency_type", "situation_description"],
            escalation_triggers: ["gas leak", "electrical fire", "flooding", "no heat", "no power", "burst pipe"]
          },
          edges: [
            {
              condition: "life-threatening emergency requiring immediate 911",
              target_node: "direct_911_emergency"
            },
            {
              condition: "emergency service available and can dispatch",
              target_node: "emergency_dispatch"
            },
            {
              condition: "emergency outside service hours, needs emergency contact",
              target_node: "after_hours_emergency"
            }
          ]
        },

        "emergency_dispatch": {
          type: "conversation",
          data: {
            name: "Emergency Dispatch Confirmation",
            prompt: `I've logged your emergency service request:

• Name: [repeat name]
• Address: [repeat address] 
• Emergency: [repeat emergency type]
• Phone: [repeat phone]

An emergency technician will be dispatched to your location within the next hour. You'll receive a call from the technician 15-30 minutes before they arrive.

Emergency service rate: Our emergency rate applies for after-hours calls. The technician will provide you with the exact pricing when they assess the situation.

Is there anything else urgent I need to know about this emergency? Stay safe, and help is on the way!`
          },
          edges: [
            {
              condition: "caller satisfied with emergency response",
              target_node: "call_wrap_up"
            }
          ]
        },

        // Quote and estimate requests
        "quote_request": {
          type: "conversation",
          data: {
            name: "Quote & Estimate Handler",
            prompt: `I'd be happy to help you get a free estimate! We provide detailed quotes for all our services.

To give you the most accurate estimate, I need to gather some information:

1. What type of service do you need? (For example: ${business.services.join(', ')})
2. Can you describe the work you need done?
3. What's your property address?
4. Is this for a home, business, or other type of property?
5. When would you like the work completed?
6. Have you had any estimates from other companies?
7. What's your preferred contact method - phone or email?

${business.pricing}. Most estimates can be provided over the phone, but for complex jobs we may need to schedule a brief on-site evaluation.`,
            
            required_info: ["service_type", "work_description", "property_address", "contact_preference"],
            knowledge_base: {
              services: business.services,
              pricing_structure: business.pricing,
              service_areas: business.serviceAreas
            }
          },
          edges: [
            {
              condition: "needs on-site evaluation for accurate quote",
              target_node: "onsite_evaluation_scheduling"
            },
            {
              condition: "can provide quote over phone immediately",
              target_node: "phone_quote_delivery"
            },
            {
              condition: "job is outside service area",
              target_node: "outside_service_area"
            },
            {
              condition: "caller asks about financing or payment options during quote",
              target_node: "payment_options_discussion"
            }
          ]
        },

        "phone_quote_delivery": {
          type: "conversation",
          data: {
            name: "Phone Quote Delivery",
            prompt: `Based on what you've described, here's your estimate:

[Provide detailed breakdown based on the service type and work description]

This estimate includes:
• All materials needed
• Labor and installation
• ${business.warranty}
• Clean-up after completion

Your total estimated cost is: $[X] - $[Y]

This quote is valid for 30 days. 

Would you like to:
1. Schedule the work now?
2. Think it over and call us back?
3. Have me email you a written estimate?
4. Answer any questions about the work or pricing?

Remember, we're ${business.license} and all work comes with our satisfaction guarantee.`
          },
          edges: [
            {
              condition: "caller wants to schedule work immediately",
              target_node: "service_scheduling"
            },
            {
              condition: "caller wants written estimate emailed",
              target_node: "email_estimate_setup"
            },
            {
              condition: "caller has questions about the quote",
              target_node: "quote_questions"
            },
            {
              condition: "caller wants to think it over",
              target_node: "quote_followup_setup"
            }
          ]
        },

        // Service scheduling
        "service_scheduling": {
          type: "conversation",
          data: {
            name: "Service Appointment Scheduler",
            prompt: `Great! Let's get your service appointment scheduled. 

I need to confirm a few details:
1. Your full name and best phone number?
2. Service address where we'll be working?
3. What service are we scheduling? [confirm from previous conversation]
4. Any preferred days or times that work best for you?

${business.techAvailability}

Our current availability:
• ${business.hours}
• ${business.emergency ? 'Emergency services available 24/7' : 'Standard business hours'}

Do you have any specific requirements:
• First floor only or will we need attic/basement access?
• Any pets that need to be secured?
• Preferred technician if you've worked with us before?
• Any access issues we should know about?`,
            
            required_info: ["full_name", "phone", "service_address", "service_type", "preferred_timing"],
            scheduling_info: {
              availability: business.techAvailability,
              hours: business.hours,
              lead_time: "Usually same-day or next-day appointments"
            }
          },
          edges: [
            {
              condition: "standard scheduling completed successfully",
              target_node: "appointment_confirmation"
            },
            {
              condition: "caller needs specific timing or has scheduling conflicts",
              target_node: "custom_scheduling"
            },
            {
              condition: "caller asks about preparation or what to expect",
              target_node: "service_preparation_info"
            }
          ]
        },

        "appointment_confirmation": {
          type: "conversation",
          data: {
            name: "Appointment Confirmation",
            prompt: `Perfect! I have your appointment scheduled:

📅 **Service Details:**
• Customer: [name]
• Phone: [phone]  
• Address: [service address]
• Service: [service type]
• Date: [scheduled date]
• Time Window: [time window]

**What to expect:**
• Our technician will call 30 minutes before arriving
• They'll have all necessary tools and common parts
• ${business.license}
• Payment due upon completion: ${business.payments.join(', ')}

**Confirmation:** You'll receive a text confirmation with all these details.

Is there anything else you need to know about your upcoming appointment?`
          },
          edges: [
            {
              condition: "caller satisfied with appointment details",
              target_node: "call_wrap_up"
            },
            {
              condition: "caller has additional questions",
              target_node: "service_information"
            }
          ]
        },

        // Service information and general inquiries
        "service_information": {
          type: "conversation",
          data: {
            name: "Service Information Provider",
            prompt: `I'm happy to answer your questions about ${business.name}!

**Our Services:**
${business.services.map(service => `• ${service}`).join('\n')}

**Service Areas:** ${business.serviceAreas.join(', ')}

**What makes us different:**
• ${business.license}
• ${business.insurance}  
• ${business.warranty}
• Free estimates
• ${business.techAvailability}

**Business Hours:** ${business.hours}

What specific information can I provide about our services, pricing, or process?`,
            
            knowledge_base: {
              services: business.services,
              coverage_areas: business.serviceAreas,
              qualifications: [business.license, business.insurance],
              guarantees: business.warranty,
              hours: business.hours
            }
          },
          edges: [
            {
              condition: "caller wants pricing information",
              target_node: "pricing_information"
            },
            {
              condition: "caller asks about specific service capabilities",
              target_node: "specific_service_details"
            },
            {
              condition: "caller ready to get quote or schedule",
              target_node: "quote_request"
            },
            {
              condition: "caller asks about service area coverage",
              target_node: "service_area_check"
            }
          ]
        },

        // Follow-up and complaint handling
        "followup_complaint": {
          type: "conversation",
          data: {
            name: "Follow-up & Complaint Handler",
            prompt: `I'm here to help with your follow-up or concern. Let me get some information so I can assist you properly:

1. Can you provide your name and the phone number on your account?
2. What date was the service performed?
3. What type of work was done?
4. Are you calling about:
   • A follow-up question about the work?
   • An issue or problem with the completed work?
   • Scheduling additional work?
   • A billing question?
   • Warranty claim?

I want to make sure we address your concern completely. Can you tell me more about what's happening?`,
            
            required_info: ["customer_name", "phone", "service_date", "work_type", "issue_type"],
            escalation_triggers: ["not working", "damaged", "warranty", "unsatisfied", "billing error"]
          },
          edges: [
            {
              condition: "warranty issue or work not performing correctly",
              target_node: "warranty_claim"
            },
            {
              condition: "billing or payment dispute",
              target_node: "billing_dispute"
            },
            {
              condition: "general follow-up or additional work needed",
              target_node: "followup_service"
            },
            {
              condition: "serious complaint requiring manager",
              target_node: "escalate_to_manager"
            }
          ]
        },

        // Transfer requests
        "transfer_request": {
          type: "conversation",
          data: {
            name: "Transfer Request Handler",
            prompt: `I'd be happy to connect you with the right person. 

Who would you like to speak with?
• A technician about technical questions
• The owner/manager about business matters
• Billing department about payments
• A supervisor about service issues

Your name and what this is regarding?

Let me check their availability. ${business.hours}`,
            
            transfer_options: ["technician", "manager", "billing", "supervisor"]
          },
          edges: [
            {
              condition: "person available for immediate transfer",
              target_node: "immediate_transfer"
            },
            {
              condition: "person not available, needs callback",
              target_node: "callback_scheduling"
            }
          ]
        },

        // Edge cases and special situations
        "needs_clarification": {
          type: "conversation", 
          data: {
            name: "Needs Clarification",
            prompt: `I want to make sure I help you with exactly what you need. Let me ask a few questions to point you in the right direction:

Are you calling about:
1. **Emergency repair** - something that needs immediate attention?
2. **Getting a quote** - for work you're planning to have done?
3. **Scheduling service** - you're ready to book an appointment?
4. **Questions about our services** - what we do, our pricing, service areas?
5. **Following up** - on previous work we've done?
6. **Speaking to someone specific** - a technician, manager, etc.?

Take your time - I'm here to help guide you to the right solution!`
          },
          edges: [
            {
              condition: "caller clarifies emergency need",
              target_node: "emergency_handling"
            },
            {
              condition: "caller clarifies quote need",
              target_node: "quote_request"
            },
            {
              condition: "caller clarifies scheduling need",
              target_node: "service_scheduling"
            },
            {
              condition: "caller clarifies information need",
              target_node: "service_information"
            },
            {
              condition: "caller clarifies follow-up need",
              target_node: "followup_complaint"
            },
            {
              condition: "caller clarifies transfer need",
              target_node: "transfer_request"
            }
          ]
        },

        "outside_service_area": {
          type: "conversation",
          data: {
            name: "Outside Service Area Handler",
            prompt: `I appreciate your interest in ${business.name}! Unfortunately, your location is outside our current service area.

We currently service: ${business.serviceAreas.join(', ')}

However, I can help you in a couple of ways:
1. **Referrals**: I can refer you to trusted companies in your area
2. **Future expansion**: If we expand to your area, would you like us to contact you?
3. **Large projects**: For significant projects, we sometimes make exceptions

What's your zip code? Let me see if there are any possibilities or if I can provide referrals.`
          },
          edges: [
            {
              condition: "caller wants referral to other companies",
              target_node: "referral_assistance"
            },
            {
              condition: "large project that might qualify for exception",
              target_node: "large_project_evaluation"
            },
            {
              condition: "caller wants to be contacted for future expansion",
              target_node: "future_contact_signup"
            }
          ]
        },

        "payment_options_discussion": {
          type: "conversation",
          data: {
            name: "Payment Options Discussion",
            prompt: `Great question about payment options! We want to make our services accessible to everyone.

**Payment Methods We Accept:**
${business.payments.map(method => `• ${method}`).join('\n')}

**Payment Options:**
• Pay upon completion (most common)
• For larger projects: 50% down, 50% upon completion
• Senior citizen discounts available
• Military discounts available

**Financing:** For larger projects ($1,000+), we work with financing companies that offer:
• 12-month same-as-cash options
• Extended payment plans
• Quick approval process

Would you like me to:
1. Continue with your estimate?
2. Get you information about financing?
3. Apply any available discounts?`
          },
          edges: [
            {
              condition: "caller wants to continue with estimate",
              target_node: "quote_request"
            },
            {
              condition: "caller interested in financing information",
              target_node: "financing_information"
            },
            {
              condition: "caller qualifies for discounts",
              target_node: "discount_application"
            }
          ]
        },

        // Additional specialized nodes for complex scenarios
        "warranty_claim": {
          type: "conversation",
          data: {
            name: "Warranty Claim Processor",
            prompt: `I understand you're having an issue with recent work. We absolutely stand behind our work with ${business.warranty}.

Let me gather details for your warranty claim:
1. Your name and service address?
2. Date the original work was completed?
3. What specific issue are you experiencing?
4. Has this issue gotten worse over time?
5. Have you tried anything to fix it yourself?

Based on what you describe, I can either:
• Schedule a technician to come out immediately (warranty service is free)
• Walk you through some simple troubleshooting steps
• Connect you directly with the original technician if available

What would work best for you?`
          },
          edges: [
            {
              condition: "needs immediate warranty service call",
              target_node: "warranty_service_scheduling"
            },
            {
              condition: "can potentially resolve with phone troubleshooting",
              target_node: "phone_troubleshooting"
            }
          ]
        },

        "onsite_evaluation_scheduling": {
          type: "conversation",
          data: {
            name: "On-site Evaluation Scheduler",
            prompt: `For this type of project, we'll need to do a brief on-site evaluation to give you an accurate quote.

**Free On-site Estimate:**
• Usually takes 15-30 minutes
• No obligation
• Written quote provided
• All measurements and specifications included

Available times for your free estimate:
${business.hours}

What day and time would work best for you? I can usually schedule within 24-48 hours.

The technician will:
• Assess the work needed
• Take measurements
• Explain the process
• Provide written estimate on the spot
• Answer all your questions

What's your preferred date and time?`
          },
          edges: [
            {
              condition: "evaluation appointment scheduled successfully",
              target_node: "evaluation_confirmation"
            }
          ]
        },

        // Call wrap-up
        "call_wrap_up": {
          type: "conversation",
          data: {
            name: "Professional Call Wrap-up",
            prompt: `Is there anything else I can help you with today regarding your service needs?

**Summary of today's call:**
[Recap the main points discussed and any actions taken]

**Next steps:**
[Outline what happens next - appointment, quote, callback, etc.]

Thank you for choosing ${business.name}! We appreciate your business and look forward to serving you.

**Remember:** 
• We're ${business.license}
• ${business.warranty}
• Call us anytime at this number for questions

Have a great day!`
          },
          edges: [
            {
              condition: "caller ready to end call",
              target_node: "end_call"
            },
            {
              condition: "caller has additional needs",
              target_node: "service_information"
            }
          ]
        },

        "end_call": {
          type: "end_call",
          data: {
            name: "End Call Gracefully",
            message: `Thank you for calling ${business.name}. Have a wonderful day!`
          }
        }
      },

      // Global settings optimized for home service businesses
      global_settings: {
        voice: {
          voice_id: "nat", // Natural American female voice
          speed: 0.95, // Slightly slower for technical information
          stability: 0.85,
          emotion: "professional_helpful"
        },
        max_duration: 900, // 15 minutes max for complex service calls
        interruption_threshold: 400,
        webhook_url: `https://${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}.functions.supabase.co/bland-webhook`,
        data_collection: {
          required_fields: ["caller_name", "phone_number", "service_address", "service_type"],
          optional_fields: ["email", "preferred_timing", "budget_range", "urgency_level", "property_type"]
        },
        business_context: {
          industry: "home_services",
          specialization: business.services,
          service_model: "on_site_service",
          pricing_model: "estimate_based"
        }
      }
    };

    console.log('Creating comprehensive home service pathway...');

    // Create the updated pathway using Bland AI API
    const response = await fetch("https://api.bland.ai/v1/pathway/create", {
      method: "POST",
      headers: {
        "Authorization": BLAND_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: homeServicePathwayConfig.name,
        description: homeServicePathwayConfig.description,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bland AI pathway creation error:', errorText);
      throw new Error(`Failed to create pathway: ${response.status} ${response.statusText}`);
    }

    const pathwayResult = await response.json();
    console.log("Home service pathway created successfully:", pathwayResult);

    // Update business settings with home service configuration
    const { error: updateError } = await supabase
      .from('business_settings')
      .upsert({
        user_id: user.id,
        business_name: business.name,
        business_type: business.type,
        business_hours: business.hours,
        // Store comprehensive pathway config in urgent_keywords as JSON
        urgent_keywords: JSON.stringify({
          pathway_id: pathwayResult.pathway_id,
          pathway_type: "home_service_comprehensive",
          services: business.services,
          service_areas: business.serviceAreas,
          pathway_config: homeServicePathwayConfig
        })
      });

    if (updateError) {
      console.error('Error updating business settings:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      pathway_id: pathwayResult.pathway_id,
      message: "Comprehensive home service pathway created successfully",
      configuration: {
        name: homeServicePathwayConfig.name,
        description: homeServicePathwayConfig.description,
        voice: "American female (natural, professional)",
        industry: "Home Services",
        features: [
          "Emergency service handling",
          "Quote and estimate requests", 
          "Service appointment scheduling",
          "Follow-up and complaint resolution",
          "Service area coverage checking",
          "Payment options discussion",
          "Warranty claim processing",
          "Technical information support",
          "Multi-scenario conversation flow",
          "Professional call transfers"
        ],
        edge_cases_covered: [
          "Emergency vs non-emergency triage",
          "Outside service area handling",
          "Complex project evaluation needs",
          "Payment and financing discussions",
          "Warranty and follow-up issues",
          "Multiple property situations",
          "Scheduling conflicts and preferences",
          "Technical troubleshooting",
          "Competitor comparison questions",
          "Budget constraint discussions"
        ]
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error creating home service pathway:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});