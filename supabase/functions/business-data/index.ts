import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Address normalization functions
const normalizeStreetTypes = (street: string): string => {
  const streetTypes = {
    'St.': 'Street', 'St': 'Street',
    'Ave.': 'Avenue', 'Ave': 'Avenue',
    'Blvd.': 'Boulevard', 'Blvd': 'Boulevard',
    'Dr.': 'Drive', 'Dr': 'Drive',
    'Rd.': 'Road', 'Rd': 'Road',
    'Ln.': 'Lane', 'Ln': 'Lane',
    'Ct.': 'Court', 'Ct': 'Court',
    'Pl.': 'Place', 'Pl': 'Place',
    'Pkwy.': 'Parkway', 'Pkwy': 'Parkway',
    'Cir.': 'Circle', 'Cir': 'Circle',
    'Ter.': 'Terrace', 'Ter': 'Terrace',
    'Way.': 'Way', 'Wy': 'Way'
  };

  const directions = {
    'N.': 'North', 'N': 'North',
    'S.': 'South', 'S': 'South',
    'E.': 'East', 'E': 'East',
    'W.': 'West', 'W': 'West',
    'NE.': 'Northeast', 'NE': 'Northeast',
    'NW.': 'Northwest', 'NW': 'Northwest',
    'SE.': 'Southeast', 'SE': 'Southeast',
    'SW.': 'Southwest', 'SW': 'Southwest'
  };

  let normalized = street;
  
  // Replace street types (with word boundaries)
  Object.entries(streetTypes).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  });

  // Replace directions (with word boundaries)
  Object.entries(directions).forEach(([abbrev, full]) => {
    const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}\\b`, 'gi');
    normalized = normalized.replace(regex, full);
  });

  return normalized;
};

const normalizeState = (state: string): string => {
  const stateMap = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
    'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
    'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
    'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
    'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
    'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
    'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
    'DC': 'District of Columbia'
  };

  return stateMap[state.toUpperCase()] || state;
};

const normalizeAddressWithFullState = (address: string, fullStateName?: string): string => {
  if (!address) return address;
  
  // Split address by commas to identify parts
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length >= 3) {
    // Normalize street (first part)
    parts[0] = normalizeStreetTypes(parts[0]);
    
    // Use full state name if available, otherwise normalize state abbreviation
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
    
    if (stateZipMatch) {
      // If we have a full state name stored, use it; otherwise normalize the abbreviation
      const stateToUse = fullStateName || normalizeState(stateZipMatch[1]);
      parts[parts.length - 1] = `${stateToUse} ${stateZipMatch[2]}`;
    } else {
      // Just state without ZIP - use full state name if available
      parts[parts.length - 1] = fullStateName || normalizeState(lastPart);
    }
  } else {
    // For simpler addresses, just normalize street types
    parts[0] = normalizeStreetTypes(parts[0] || '');
  }
  
  return parts.join(', ');
};

// Keep the original function for backward compatibility
const normalizeAddress = (address: string): string => {
  return normalizeAddressWithFullState(address);
};

serve(async (req) => {
  console.log('business-data function called with method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Allow both GET and POST requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST or GET.' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check - SUPABASE_URL exists:', !!supabaseUrl);
    console.log('Environment check - SERVICE_ROLE_KEY exists:', !!supabaseKey);
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Create Supabase client with service role key for server-side access
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Helper function to log business data requests
    const logBusinessDataRequest = async (businessId: string, requestType: string, requestSource: string, requestData: any, responseStatus: number, responseData: any) => {
      try {
        await supabase
          .from('business_data_requests')
          .insert({
            business_id: businessId,
            request_type: requestType,
            request_source: requestSource,
            request_data: {
              ...requestData,
              headers: Object.fromEntries(req.headers.entries()),
              method: req.method,
              url: req.url
            },
            response_status: responseStatus,
            response_data: responseData,
            user_agent: req.headers.get('user-agent'),
            ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
          });
      } catch (error) {
        console.error('Error logging business data request:', error);
      }
    };

    let businessId: string | undefined;
    let requestSource = 'unknown';
    
    if (req.method === 'POST') {
      // Get business_id from POST body or headers for ElevenLabs requests
      const body = await req.json();
      console.log('Request body:', body);
      console.log('Request body type:', typeof body);
      console.log('Has business_id in body:', !!body?.business_id);
      console.log('Has agent_id in body:', !!body?.agent_id);
      
      // Check if this is an ElevenLabs conversation initiation request
      if (body?.caller_id || body?.agent_id || body?.called_number || body?.call_sid) {
        console.log('ElevenLabs conversation initiation request detected');
        
        // Get business_id from headers OR body (check both locations)
        const conversationBusinessId = req.headers.get('business_id') || body?.business_id;
        console.log('ElevenLabs business_id from headers:', req.headers.get('business_id'));
        console.log('ElevenLabs business_id from body:', body?.business_id);
        console.log('Final business_id used:', conversationBusinessId);
        
        if (!conversationBusinessId) {
          console.error('No business_id found in headers OR body for ElevenLabs request');
          return new Response(
            JSON.stringify({ error: 'business_id required in headers or body for ElevenLabs requests' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Fetch actual business data for this business_id
        const { data: businessData, error } = await supabase
          .from('business_settings')
      .select(`
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
        lead_capture
      `)
          .eq('id', conversationBusinessId)
          .maybeSingle();

        console.log('Business data query result:', { businessData, error });

        if (error) {
          console.error('Database error fetching business data:', error);
          // Return basic response with business_id only if database error
          const conversationInitData = {
            "type": "conversation_initiation_client_data",
            "dynamic_variables": {
              "business_id": conversationBusinessId,
              "business_name": "Business",
              "business_phone": "Unknown",
              "business_address": "Unknown",
              "available_hours": "Please call for hours",
              "available_times": "Please call to schedule",
              "services": "Please call for services"
            }
          };
          
          await logBusinessDataRequest(conversationBusinessId, 'conversation_initiation', 'elevenlabs', body, 200, conversationInitData);
          
          return new Response(
            JSON.stringify(conversationInitData),
            { 
              headers: { 
                ...corsHeaders,
                'Content-Type': 'application/json' 
              }
            }
          );
        }

        // Parse business data
        let servicesOffered = [];
        let businessHours = [];
        
        try {
          servicesOffered = businessData?.services_offered ? JSON.parse(businessData.services_offered) : [];
        } catch (error) {
          console.error('Error parsing services_offered:', error);
          servicesOffered = [];
        }
        
        try {
          businessHours = businessData?.business_hours ? JSON.parse(businessData.business_hours) : [];
        } catch (error) {
          console.error('Error parsing business_hours:', error);
          businessHours = [];
        }

        // Format services for display to match manual response format
        const formattedServices = servicesOffered.map(service => 
          service.price ? `${service.name}: ${service.price}` : service.name
        ).join(', ') || 'Call for services';

        // Format business hours for display
        const formatBusinessHours = (hours) => {
          if (!Array.isArray(hours) || hours.length === 0) {
            return 'Please call for hours';
          }
          
          const openDays = hours.filter(day => day.isOpen || day.enabled);
          if (openDays.length === 0) {
            return 'Please call for hours';
          }
          
          // Group consecutive days with same hours
          const hourRanges = openDays.map(day => {
            const openTime = day.openTime || day.start || '09:00';
            const closeTime = day.closeTime || day.end || '17:00';
            return `${day.day}: ${openTime}-${closeTime}`;
          }).join(', ');
          
          return hourRanges || 'Please call for hours';
        };

        // Use actual business address with full state name if available (matching manual response)
        const formattedAddress = businessData?.business_address_state_full ? 
          normalizeAddressWithFullState(businessData.business_address, businessData.business_address_state_full) :
          normalizeAddress(businessData?.business_address || 'Unknown');

        // Get calendar availability data for ElevenLabs (matching manual response)
        let calendarAvailability = null;
        if (businessData) {
          try {
            console.log('Fetching calendar availability for user_id:', businessData.user_id);
            const availabilityResponse = await supabase.functions.invoke(`google-calendar-availability/${businessData.user_id}`, {
              method: 'GET'
            });
            
            if (availabilityResponse.data && !availabilityResponse.error) {
              calendarAvailability = availabilityResponse.data;
            }
          } catch (error) {
            console.error('Error fetching calendar availability for ElevenLabs:', error);
          }
        }

        // Generate available times matching manual response format
        const generateAvailableTimesForElevenLabs = () => {
          // If we have calendar availability with actual slots, use those
          if (calendarAvailability && calendarAvailability.available && Array.isArray(calendarAvailability.slots) && calendarAvailability.slots.length > 0) {
            return calendarAvailability.slots.slice(0, 5).map(slot => ({
              startTime: new Date(slot.start).toISOString(),
              endTime: new Date(slot.end).toISOString(),
              humanReadable: slot.humanReadable || `${new Date(slot.start).toLocaleDateString()} ${new Date(slot.start).toLocaleTimeString()}-${new Date(slot.end).toLocaleTimeString()}`,
              timeOfDay: slot.timeOfDay
            }));
          }
          
          // Fallback to basic slots if no calendar
          return [];
        };
        
        // Return the conversation initiation format that matches manual response exactly
        const availableTimes = generateAvailableTimesForElevenLabs();
        
        const conversationInitData = {
          "type": "conversation_initiation_client_data",
          "dynamic_variables": {
            "business_id": conversationBusinessId,
            "business_name": businessData?.business_name || "Business",
            "business_phone": businessData?.business_phone || "Unknown",
            "business_address": formattedAddress,
            "available_times": availableTimes,
            "services": formattedServices,
            "business_description": businessData?.business_description || ""
          }
        };
        
        // Log the request for monitoring
        await logBusinessDataRequest(conversationBusinessId, 'conversation_initiation', 'elevenlabs', body, 200, conversationInitData);
        
        return new Response(
          JSON.stringify(conversationInitData),
          { 
            headers: { 
              ...corsHeaders,
              'Content-Type': 'application/json' 
            }
          }
        );
      } else if (body && body.business_id) {
        // Manual request - has business_id but no agent_id
        businessId = body.business_id;
        requestSource = 'manual';
        console.log('MANUAL request detected (no agent_id) - business_id from request body:', businessId);
      } else {
        console.log('Unknown request type - checking headers for business_id');
        requestSource = 'elevenlabs';
        businessId = req.headers.get('business_id') || req.headers.get('x-business-id');
        console.log('Fallback to headers - business_id:', businessId);
      }
    } else {
      // Get business_id from GET query parameters
      const url = new URL(req.url);
      businessId = url.searchParams.get('business_id');
      requestSource = 'api';
      console.log('API request detected - Query parameters:', Object.fromEntries(url.searchParams));
    }

    console.log('Final businessId being used:', businessId);
    console.log('Final requestSource being used:', requestSource);

    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'business_id parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that businessId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid business_id format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch business settings using business_id (which is the primary key)
    const { data: businessData, error } = await supabase
      .from('business_settings')
      .select(`
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
        lead_capture
      `)
      .eq('id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch business data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!businessData) {
      return new Response(
        JSON.stringify({ error: 'No business data found for this business_id' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if Google Calendar is connected for availability
    const { data: calendarSettings } = await supabase
      .from('google_calendar_settings')
      .select('is_connected, timezone, appointment_duration')
      .eq('user_id', businessData.user_id)
      .maybeSingle();

    let calendarAvailability = null;
    if (calendarSettings?.is_connected) {
      try {
        console.log('Fetching calendar availability for user_id:', businessData.user_id);
        const availabilityResponse = await supabase.functions.invoke(`google-calendar-availability/${businessData.user_id}`, {
          method: 'GET'
        });
        
        console.log('Calendar availability response status:', availabilityResponse.error ? 'ERROR' : 'SUCCESS');
        console.log('Calendar availability response:', availabilityResponse);
        if (availabilityResponse.data && !availabilityResponse.error) {
          calendarAvailability = availabilityResponse.data;
      } else {
        console.error('Calendar availability error:', availabilityResponse.error);
        calendarAvailability = { available: false, message: 'Calendar integration error', isConnected: true };
      }
    } catch (error) {
      console.error('Error fetching calendar availability:', error);
      calendarAvailability = { available: false, message: 'Calendar integration error', isConnected: true };
    }
  } else {
    calendarAvailability = { available: false, message: 'Google Calendar not connected', isConnected: false };
  }

    console.log('Successfully retrieved business data for business_id:', businessId);

    // Normalize the business address and parse JSON fields before sending
    let servicesOffered = [];
    let businessHours = [];
    
    try {
      servicesOffered = businessData.services_offered ? JSON.parse(businessData.services_offered).map(service => ({
        name: service.name,
        price: service.price,
        description: service.description
      })) : [];
    } catch (error) {
      console.error('Error parsing services_offered:', error, businessData.services_offered);
      servicesOffered = [];
    }
    
    try {
      businessHours = businessData.business_hours ? JSON.parse(businessData.business_hours) : [];
    } catch (error) {
      console.error('Error parsing business_hours:', error, businessData.business_hours);
      businessHours = [];
    }

    // Helper function to generate available times for ElevenLabs
    const generateAvailableTimes = (hours: any[], calendarAvailability: any = null) => {
      console.log('Generating available times:', { hours, calendarAvailability });
      
      // If we have calendar availability with actual slots, prioritize those
      if (calendarAvailability && calendarAvailability.available && Array.isArray(calendarAvailability.slots) && calendarAvailability.slots.length > 0) {
        console.log('Using actual Google Calendar availability slots');
        const mappedSlots = calendarAvailability.slots.slice(0, 15).map(slot => {
          console.log('Mapping slot:', slot);
          const mapped = {
            startTime: new Date(slot.start).toISOString(),
            endTime: new Date(slot.end).toISOString(),
            humanReadable: slot.humanReadable || `${new Date(slot.start).toLocaleDateString()} ${new Date(slot.start).toLocaleTimeString()}-${new Date(slot.end).toLocaleTimeString()}`,
            timeOfDay: slot.timeOfDay
          };
          console.log('Mapped slot result:', mapped);
          return mapped;
        });
        console.log('Final mapped slots:', mappedSlots);
        return mappedSlots;
      }
      
      // If calendar is connected but has errors/no slots, don't generate fallback times
      // This prevents showing availability when the user's calendar might actually be busy
      if (calendarAvailability && calendarAvailability.isConnected && !calendarAvailability.available) {
        console.log('Calendar connected but error occurred - returning no slots to prevent false availability');
        return [];
      }
      
      // Use business hours fallback when:
      // 1. No calendar is connected (calendarAvailability.isConnected === false), OR  
      // 2. No calendar availability data at all (calendarAvailability is null)
      console.log('Using business hours fallback - calendar not connected or no calendar data');
      
      if (!Array.isArray(hours) || hours.length === 0) {
        console.log('No business hours configured');
        return [];
      }
      
      const openDays = hours.filter(day => day.isOpen || day.enabled);
      if (openDays.length === 0) {
        console.log('No open days in business hours');
        return [];
      }
      
      const availableSlots = [];
      const today = new Date();
      
      // Generate slots for the next 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        
        const dayHours = openDays.find(day => day.day === dayName);
        if (dayHours) {
          const openTime = dayHours.openTime || dayHours.start || '09:00';
          const closeTime = dayHours.closeTime || dayHours.end || '17:00';
          
          // Create start and end datetime for this day
          const [openHour, openMinute] = openTime.split(':').map(Number);
          const [closeHour, closeMinute] = closeTime.split(':').map(Number);
          
          const startDateTime = new Date(date);
          startDateTime.setHours(openHour, openMinute, 0, 0);
          
          const endDateTime = new Date(date);
          endDateTime.setHours(closeHour, closeMinute, 0, 0);
          
          // Only include future times
          if (startDateTime > new Date()) {
            availableSlots.push({
              startTime: startDateTime.toISOString(),
              endTime: endDateTime.toISOString()
            });
          }
        }
      }
      
      return availableSlots;
    };

    // Return ElevenLabs conversation initiation format
    const availableTimes = generateAvailableTimes(businessHours, calendarAvailability);
    console.log('Generated available times count:', availableTimes.length);
    console.log('Sample available time:', availableTimes[0]);
    
    // Limit available times to prevent response from being too large
    const limitedAvailableTimes = availableTimes.slice(0, 5);
    
    // Format services matching manual response (colon format, not parentheses)
    const formattedServices = servicesOffered.map(service => 
      service.price ? `${service.name}: ${service.price}` : service.name
    ).join(', ') || 'General services available';

    // Use business address with full state name to match manual response
    const formattedBusinessAddress = businessData.business_address_state_full ? 
      normalizeAddressWithFullState(businessData.business_address, businessData.business_address_state_full) :
      normalizeAddress(businessData.business_address || "");

    const elevenLabsResponse = {
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        business_id: businessId,
        business_name: businessData.business_name || "Our Business",
        business_phone: businessData.business_phone || "",
        business_address: formattedBusinessAddress,
        available_times: limitedAvailableTimes,
        services: formattedServices,
        business_description: businessData.business_description || ""
      }
    };
    
    console.log('ElevenLabs response size (chars):', JSON.stringify(elevenLabsResponse).length);

    console.log('ElevenLabs response being sent:', JSON.stringify(elevenLabsResponse, null, 2));
    
    // Validate the response format before sending
    if (!elevenLabsResponse.type || !elevenLabsResponse.dynamic_variables) {
      console.error('Invalid ElevenLabs response format:', elevenLabsResponse);
      return new Response(
        JSON.stringify({ error: 'Invalid response format generated' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Ensure all required fields are present
    const requiredFields = ['business_id', 'business_name', 'business_phone', 'business_address', 'available_times', 'services', 'business_description'];
    const missingFields = requiredFields.filter(field => !elevenLabsResponse.dynamic_variables.hasOwnProperty(field));
    
    if (missingFields.length > 0) {
      console.error('Missing required fields in ElevenLabs response:', missingFields);
      return new Response(
        JSON.stringify({ error: `Missing required fields: ${missingFields.join(', ')}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    try {
      // Log the request
      await logBusinessDataRequest(
        businessId,
        'conversation_initiation',
        requestSource,
        { 
          caller_id: req.headers.get('caller_id'), 
          agent_id: req.headers.get('agent_id'),
          business_type: businessData.business_type 
        },
        200,
        elevenLabsResponse
      );
    } catch (logError) {
      console.error('Error logging request (non-blocking):', logError);
      // Continue with response even if logging fails
    }
    
    return new Response(
      JSON.stringify(elevenLabsResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Content-Length': JSON.stringify(elevenLabsResponse).length.toString()
        } 
      }
    );

  } catch (error) {
    console.error('Error in business-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
