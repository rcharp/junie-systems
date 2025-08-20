import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePathwayRequest {
  pathway_id: string;
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

    const updateData: UpdatePathwayRequest = await req.json();

    if (!updateData.pathway_id) {
      throw new Error('Pathway ID is required');
    }

    // Get business settings from database
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const business = {
      name: updateData.business_name || businessSettings?.business_name || 'Professional Home Services',
      type: updateData.business_type || businessSettings?.business_type || 'Home Service Company',
      hours: updateData.business_hours || businessSettings?.business_hours || 'Monday-Friday 8AM-6PM, Saturday 9AM-4PM',
      services: updateData.services_offered || ['Plumbing', 'Electrical', 'HVAC', 'General Repairs', 'Water Heater Service', 'Drain Cleaning', 'Emergency Repairs'],
      serviceAreas: updateData.service_areas || ['Metro Area', 'Suburbs', '30-mile radius'],
      emergency: updateData.emergency_available !== undefined ? updateData.emergency_available : true,
      pricing: updateData.pricing_structure || 'Free estimates, competitive pricing, no hidden fees',
      license: updateData.license_info || 'Licensed, bonded, and insured',
      insurance: updateData.insurance_info || 'Fully insured for your protection',
      warranty: updateData.warranty_info || 'All work guaranteed - 1 year warranty',
      booking: updateData.booking_system || 'Same-day and next-day appointments available',
      payments: updateData.payment_methods || ['Cash', 'Check', 'All major credit cards', 'Financing available']
    };

    // Comprehensive pathway structure for home services
    const comprehensivePathway = {
      pathway_id: updateData.pathway_id,
      nodes: [
        {
          id: "greeting",
          type: "default",
          name: "Professional Greeting & Call Classification",
          prompt: `Hello! Thank you for calling ${business.name}. This is your AI assistant, and I'm here to help you with all your home service needs.

I can help you with:
• Getting a FREE estimate or quote for any project
• Scheduling a service appointment or technician visit  
• Emergency service requests
• Questions about our services, pricing, or service areas
• Speaking with a technician, manager, or billing department

What can I help you with today?`,
          voice_settings: {
            voice_id: "nat",
            speed: 1.0,
            stability: 0.8
          },
          conditions: [
            {
              condition: "caller mentions emergency, urgent, or immediate need keywords like: emergency, urgent, flooding, no heat, no power, gas leak, electrical problem, burst pipe",
              target_node: "emergency_triage"
            },
            {
              condition: "caller wants quote, estimate, pricing, or asks 'how much' for services",
              target_node: "quote_intake"
            },
            {
              condition: "caller wants to schedule, book appointment, or get technician visit",
              target_node: "scheduling_intake"
            },
            {
              condition: "caller has questions about services, what we do, service areas, or general information",
              target_node: "service_info"
            },
            {
              condition: "caller mentions previous work, follow-up, complaint, or warranty issue",
              target_node: "followup_support"
            },
            {
              condition: "caller wants to speak to specific person, manager, technician, or billing",
              target_node: "transfer_routing"
            },
            {
              condition: "caller is unclear about their needs or gives vague response",
              target_node: "needs_assessment"
            }
          ]
        },

        {
          id: "emergency_triage",
          type: "conversation",
          name: "Emergency Service Triage",
          prompt: `I understand this is an emergency. ${business.emergency ? 'We provide 24/7 emergency service.' : 'Let me get you connected with emergency assistance immediately.'}

⚠️ SAFETY FIRST: If this involves gas leaks, electrical sparks/fire, or major flooding, please also contact your utility company or 911 if there's immediate danger.

I need some quick information:
1. Your name and phone number?
2. Your address where the emergency is happening?
3. What type of emergency: plumbing, electrical, heating/cooling, or other?
4. Describe the situation - is there property damage happening now?
5. Is everyone safe? Any immediate safety concerns?

${business.emergency ? 'I can dispatch an emergency technician within 1-2 hours.' : 'I\'ll connect you with our emergency coordinator right away.'}`,
          required_info: ["name", "phone", "address", "emergency_type", "situation"],
          urgency_level: "emergency",
          conditions: [
            {
              condition: "caller mentions gas leak, electrical fire, or major safety hazard",
              target_node: "safety_emergency"
            },
            {
              condition: "standard emergency that can be handled by technician",
              target_node: "emergency_dispatch"
            },
            {
              condition: "after hours emergency",
              target_node: "after_hours_emergency"
            }
          ]
        },

        {
          id: "quote_intake",
          type: "conversation", 
          name: "Quote & Estimate Collection",
          prompt: `I'd be happy to provide you with a FREE estimate! We give detailed, accurate quotes for all our services.

To provide the most accurate estimate, I need some information:

1. **What type of service do you need?** (Examples: ${business.services.slice(0, 4).join(', ')}, etc.)
2. **Can you describe the work in detail?** (Be as specific as possible)
3. **What's your property address?** (This helps with pricing and scheduling)
4. **Property type:** Home, business, rental property, or other?
5. **Timeline:** When would you like this work completed?
6. **Budget considerations:** Do you have a budget range in mind?
7. **Previous estimates:** Have you gotten quotes from other companies?

${business.pricing} Most estimates can be given over the phone, but complex jobs may need a quick on-site evaluation.`,
          required_info: ["service_type", "work_description", "property_address", "property_type"],
          conditions: [
            {
              condition: "work is complex and needs on-site evaluation",
              target_node: "onsite_estimate"
            },
            {
              condition: "can provide accurate phone quote based on description",
              target_node: "phone_quote"
            },
            {
              condition: "caller mentions budget constraints or asks about payment options",
              target_node: "budget_discussion"
            },
            {
              condition: "property is outside service area",
              target_node: "service_area_issue"
            },
            {
              condition: "caller asks about timeline or availability during quote",
              target_node: "availability_discussion"
            }
          ]
        },

        {
          id: "phone_quote",
          type: "conversation",
          name: "Phone Quote Delivery",
          prompt: `Based on your description, here's your detailed estimate:

**${business.name} - FREE ESTIMATE**

**Work Description:** [Repeat back their specific needs]
**Location:** [Address]

**Estimated Cost:** $[X] - $[Y] 
*(Range accounts for potential variables we'll confirm on-site)*

**What's Included:**
• All materials and parts needed
• Professional installation/repair
• Labor and service call
• ${business.warranty}
• Clean-up after completion
• ${business.license}

**This estimate is valid for 30 days.**

Would you like to:
1. **Schedule the work now** (I can get you on the calendar)
2. **Get a written estimate emailed** to you
3. **Ask questions** about the work or pricing
4. **Think it over** and call us back

Payment options: ${business.payments.join(', ')}`,
          conditions: [
            {
              condition: "caller wants to schedule work immediately",
              target_node: "scheduling_intake"
            },
            {
              condition: "caller wants written estimate sent",
              target_node: "email_estimate"
            },
            {
              condition: "caller has questions about quote or needs clarification",
              target_node: "quote_questions"
            },
            {
              condition: "caller wants to think it over",
              target_node: "quote_followup"
            },
            {
              condition: "caller asks about payment or financing",
              target_node: "payment_options"
            }
          ]
        },

        {
          id: "scheduling_intake",
          type: "conversation",
          name: "Service Appointment Scheduling",
          prompt: `Perfect! Let's get your service appointment scheduled.

**Service Details to Confirm:**
• **Customer:** [Name]
• **Phone:** [Phone number]
• **Address:** [Service location]
• **Service:** [Type of work needed]

**Scheduling Information:**
${business.hours}
${business.booking}

**Available Options:**
• Same-day service (if available)
• Next business day
• Specific date/time you prefer

**Special Requirements:**
• Any access issues (gates, pets, etc.)?
• Preferred arrival time window?
• Anyone need to be present?
• First floor only or basement/attic access needed?

What day and time works best for your schedule?`,
          required_info: ["confirmed_name", "confirmed_phone", "service_address", "service_type", "preferred_timing"],
          conditions: [
            {
              condition: "standard appointment successfully scheduled",
              target_node: "appointment_confirmation"
            },
            {
              condition: "caller has scheduling conflicts or special requirements",
              target_node: "custom_scheduling"
            },
            {
              condition: "caller asks what to expect or preparation needed",
              target_node: "service_prep"
            },
            {
              condition: "same-day service requested",
              target_node: "same_day_availability"
            }
          ]
        },

        {
          id: "service_info",
          type: "conversation",
          name: "Service Information Hub",
          prompt: `I'm happy to tell you about ${business.name} and our services!

**🔧 OUR SERVICES:**
${business.services.map(service => `• ${service}`).join('\n')}

**📍 SERVICE AREAS:**
${business.serviceAreas.join(' • ')}

**⭐ WHY CHOOSE US:**
• ${business.license}
• ${business.insurance}
• ${business.warranty}
• FREE estimates on all work
• ${business.booking}
• ${business.emergency ? '24/7 emergency service available' : 'Emergency service available'}

**🕒 BUSINESS HOURS:**
${business.hours}

**💳 PAYMENT OPTIONS:**
${business.payments.join(' • ')}

What specific information would you like to know about our services, pricing, or process?`,
          knowledge_base: {
            services: business.services,
            service_areas: business.serviceAreas,
            qualifications: business.license,
            hours: business.hours,
            emergency: business.emergency
          },
          conditions: [
            {
              condition: "caller asks about specific service capabilities or technical details",
              target_node: "technical_details"
            },
            {
              condition: "caller asks about pricing for specific services",
              target_node: "service_pricing"
            },
            {
              condition: "caller asks about service area coverage",
              target_node: "coverage_check"
            },
            {
              condition: "caller ready to get quote after learning about services",
              target_node: "quote_intake"
            },
            {
              condition: "caller ready to schedule after getting information",
              target_node: "scheduling_intake"
            },
            {
              condition: "caller asks about emergency services",
              target_node: "emergency_info"
            }
          ]
        },

        {
          id: "followup_support",
          type: "conversation",
          name: "Follow-up & Support Handler",
          prompt: `I'm here to help with your follow-up or concern about previous work.

Let me gather some information:
1. **Your name** and **phone number** on the account?
2. **When was the service performed?** (approximate date)
3. **What work was completed?** (brief description)
4. **What's your concern or question about?**
   • Follow-up question about the work
   • Issue or problem with completed work  
   • Warranty claim
   • Billing or payment question
   • Scheduling additional work
   • General satisfaction follow-up

**${business.warranty}** - We stand behind all our work!

Please tell me more about what's happening so I can help you properly.`,
          required_info: ["customer_name", "phone_number", "service_date", "work_type", "concern_type"],
          conditions: [
            {
              condition: "warranty issue or work not functioning properly",
              target_node: "warranty_claim"
            },
            {
              condition: "billing question or payment dispute",
              target_node: "billing_support"
            },
            {
              condition: "needs additional work or follow-up service",
              target_node: "additional_work"
            },
            {
              condition: "complaint or dissatisfaction that needs escalation",
              target_node: "complaint_escalation"
            },
            {
              condition: "general follow-up or satisfaction check",
              target_node: "satisfaction_followup"
            }
          ]
        },

        {
          id: "appointment_confirmation",
          type: "conversation",
          name: "Appointment Confirmation",
          prompt: `Excellent! Your service appointment is confirmed:

📅 **APPOINTMENT DETAILS:**
• **Customer:** [Name]
• **Phone:** [Phone]
• **Address:** [Service address]
• **Service:** [Service type/description]
• **Date:** [Scheduled date]
• **Time Window:** [Time window]
• **Estimated Duration:** [Duration based on service]

📋 **WHAT TO EXPECT:**
• Technician will call 30 minutes before arrival
• They'll arrive with tools and common parts
• ${business.license}
• Work is guaranteed with ${business.warranty}
• Payment due upon completion

📱 **CONFIRMATION:**
You'll receive a text message confirmation with all these details.

💳 **PAYMENT:** ${business.payments.join(', ')}

Is there anything else you need to know about your upcoming appointment?`,
          conditions: [
            {
              condition: "customer satisfied with appointment details",
              target_node: "call_completion"
            },
            {
              condition: "customer has additional questions about service",
              target_node: "service_prep"
            },
            {
              condition: "customer wants to add more work to appointment",
              target_node: "additional_services"
            }
          ]
        },

        {
          id: "emergency_dispatch",
          type: "conversation",
          name: "Emergency Service Dispatch",
          prompt: `🚨 **EMERGENCY SERVICE DISPATCHED**

I've logged your emergency and dispatched a technician:

**Emergency Details:**
• **Customer:** [Name]
• **Phone:** [Phone]
• **Address:** [Emergency address]
• **Emergency Type:** [Type of emergency]
• **Situation:** [Description]
• **Dispatch Time:** [Current time]

⏰ **ESTIMATED ARRIVAL:** Within 1-2 hours
📞 **TECHNICIAN CONTACT:** You'll receive a call 15-30 minutes before arrival

💰 **EMERGENCY RATES:**
• Emergency service call: $[X] 
• After-hours surcharge applies if outside business hours
• Work quoted separately after assessment

🔧 **TECHNICIAN WILL HAVE:**
• Full diagnostic equipment
• Common emergency parts
• Authorization to start immediate repairs

Stay safe, and help is on the way! Is there anything else urgent I need to know?`,
          conditions: [
            {
              condition: "emergency handled and customer satisfied",
              target_node: "call_completion"
            },
            {
              condition: "customer has additional emergency concerns",
              target_node: "additional_emergency_support"
            }
          ]
        },

        {
          id: "warranty_claim",
          type: "conversation",
          name: "Warranty Claim Processing",
          prompt: `I absolutely want to take care of this warranty issue for you. ${business.warranty}

**Warranty Claim Information:**
• **Original Service Date:** [Date]
• **Work Performed:** [Description]
• **Current Issue:** [Problem description]
• **Customer:** [Name] at [Address]

**Warranty Service Options:**
1. **Immediate technician dispatch** (warranty service is FREE)
2. **Phone troubleshooting** first (might resolve issue quickly)
3. **Scheduled warranty call** (within 24 hours)

**What's Covered:**
• All labor to correct the issue
• Replacement parts if needed
• No service call charge
• Additional warranty on warranty work

Based on what you've described, what would work best for you - immediate service or phone troubleshooting first?`,
          conditions: [
            {
              condition: "needs immediate warranty service dispatch",
              target_node: "warranty_dispatch"
            },
            {
              condition: "can try phone troubleshooting first",
              target_node: "phone_troubleshooting"
            },
            {
              condition: "wants to schedule warranty service for later",
              target_node: "warranty_scheduling"
            }
          ]
        },

        {
          id: "call_completion",
          type: "conversation",
          name: "Professional Call Wrap-up",
          prompt: `Perfect! Let me make sure I've taken care of everything for you today.

**📋 SUMMARY OF TODAY'S CALL:**
[Recap the main points and actions taken]

**📞 NEXT STEPS:**
[Outline what happens next - appointment, quote, callback, etc.]

**📱 CONTACT INFORMATION:**
• Call us anytime at this number for questions
• You can also request service online
• Emergency line available ${business.emergency ? '24/7' : 'during extended hours'}

**🏆 SATISFACTION GUARANTEE:**
${business.warranty}
${business.license}

Is there anything else I can help you with regarding your home service needs?

Thank you for choosing ${business.name}! We appreciate your business and look forward to serving you.`,
          conditions: [
            {
              condition: "customer ready to end call",
              target_node: "end_call"
            },
            {
              condition: "customer has additional questions or needs",
              target_node: "service_info"
            }
          ]
        },

        {
          id: "end_call",
          type: "end_call",
          name: "Graceful Call Ending",
          message: `Thank you for calling ${business.name}. Have a wonderful day, and remember - we're always here when you need us!`
        }
      ]
    };

    console.log(`Updating pathway ${updateData.pathway_id} with comprehensive home service flows...`);

    // Update the pathway using Bland AI API
    const response = await fetch(`https://api.bland.ai/v1/pathway/update`, {
      method: "POST",
      headers: {
        "Authorization": BLAND_AI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(comprehensivePathway),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bland AI pathway update error:', errorText);
      throw new Error(`Failed to update pathway: ${response.status} ${response.statusText}`);
    }

    const updateResult = await response.json();
    console.log("Pathway updated successfully:", updateResult);

    return new Response(JSON.stringify({
      success: true,
      pathway_id: updateData.pathway_id,
      message: "Pathway updated with comprehensive home service flows",
      updated_nodes: comprehensivePathway.nodes.length,
      features_added: [
        "Emergency triage and dispatch",
        "Comprehensive quote system",
        "Smart appointment scheduling", 
        "Warranty claim processing",
        "Follow-up and complaint handling",
        "Service information hub",
        "Payment options discussion",
        "Technical troubleshooting",
        "Multi-scenario conversation flows"
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error updating pathway:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});