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
            request_data: requestData,
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
    
    if (req.method === 'POST') {
      // Get business_id from POST body or headers for ElevenLabs requests
      const body = await req.json();
      console.log('Request body:', body);
      
      // Check if business_id is in the body (for manual requests)
      if (body && body.business_id) {
        businessId = body.business_id;
        console.log('business_id from request body:', businessId);
      } else {
        console.log('ElevenLabs conversation initiation request detected');
        // Get business_id from headers for ElevenLabs requests
        businessId = req.headers.get('business_id');
        console.log('business_id from headers for ElevenLabs request:', businessId);
      }
    } else {
      // Get business_id from GET query parameters
      const url = new URL(req.url);
      businessId = url.searchParams.get('business_id');
      console.log('Query parameters:', Object.fromEntries(url.searchParams));
    }

    console.log('Final businessId being used:', businessId);

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
        return calendarAvailability.slots.slice(0, 15).map(slot => ({
          startTime: new Date(slot.start).toISOString(),
          endTime: new Date(slot.end).toISOString(),
          humanReadable: slot.humanReadable || `${new Date(slot.start).toLocaleDateString()} ${new Date(slot.start).toLocaleTimeString()}-${new Date(slot.end).toLocaleTimeString()}`
        }));
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
    const elevenLabsResponse = {
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        business_id: businessId,
        business_name: businessData.business_name || "Our Business",
        business_phone: businessData.business_phone || "",
        business_address: businessData.business_address ? normalizeAddress(businessData.business_address) : "",
        available_times: generateAvailableTimes(businessHours, calendarAvailability),
        services: businessData.pricing_structure || JSON.stringify(servicesOffered),
        business_description: businessData.business_description || ""
      }
    };

    console.log('ElevenLabs response being sent:', JSON.stringify(elevenLabsResponse, null, 2));
    
    // Log the ElevenLabs request
    await logBusinessDataRequest(
      businessId,
      'conversation_initiation',
      'elevenlabs',
      { 
        caller_id: req.headers.get('caller_id'), 
        agent_id: req.headers.get('agent_id'),
        business_type: businessData.business_type 
      },
      200,
      elevenLabsResponse
    );
    
    return new Response(
      JSON.stringify(elevenLabsResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
