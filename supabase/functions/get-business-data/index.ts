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
  console.log('get-business-data function called with method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST requests are accepted.' }),
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

    // Parse request body to get user_id
    const requestBody = await req.json();
    const userId = requestBody.user_id;

    console.log('Request body:', requestBody);
    console.log('Fetching business data for user:', userId);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id is required in the request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate that userId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user ID format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch business settings and webhook_id for the user
    const { data: businessData, error } = await supabase
      .from('business_settings')
      .select(`
        business_name,
        business_type,
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
      .eq('user_id', userId)
      .maybeSingle();

    // Fetch webhook_id from user_profiles
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('webhook_id')
      .eq('id', userId)
      .maybeSingle();

    console.log('Profile data:', profileData);
    console.log('Profile error:', profileError);

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
        JSON.stringify({ error: 'No business data found for this user' }),
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
      .eq('user_id', userId)
      .single();

    let calendarAvailability = null;
    if (calendarSettings?.is_connected) {
      try {
        const availabilityResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-availability/${userId}`);
        if (availabilityResponse.ok) {
          calendarAvailability = await availabilityResponse.json();
        }
      } catch (error) {
        console.error('Error fetching calendar availability:', error);
      }
    }

    console.log('Successfully retrieved business data for user:', userId);

    // Format business hours into a readable string
    let availableHours = '';
    if (businessData.business_hours) {
      try {
        const hours = JSON.parse(businessData.business_hours);
        if (Array.isArray(hours) && hours.length > 0) {
          availableHours = hours.join(', ');
        } else if (typeof hours === 'object') {
          // Handle object format like {"monday": "9AM-5PM", ...}
          const hoursArray = Object.entries(hours)
            .filter(([day, time]) => time && time !== 'Closed')
            .map(([day, time]) => `${day.charAt(0).toUpperCase() + day.slice(1)} ${time}`);
          availableHours = hoursArray.join(', ');
        }
      } catch (e) {
        availableHours = businessData.business_hours || '';
      }
    }

    // Format response according to the required structure
    const responseData = {
      type: "conversation_initiation_client_data",
      dynamic_variables: {
        business_name: businessData.business_name || '',
        business_phone: businessData.business_phone || '',
        business_address: businessData.business_address ? normalizeAddress(businessData.business_address) : '',
        available_hours: availableHours
      }
    };

    console.log('Final response:', JSON.stringify(responseData, null, 2));

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-business-data function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});