import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId } = await req.json();

    if (!placeId) {
      throw new Error('Place ID is required');
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    // Get detailed information about the business
    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.append('place_id', placeId);
    detailsUrl.searchParams.append('fields', 'name,formatted_address,formatted_phone_number,website,business_status,types,opening_hours,url');
    detailsUrl.searchParams.append('key', apiKey);

    console.log('Fetching business details for place ID:', placeId);

    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      throw new Error(`Google Places API error: ${data.status}`);
    }

    const business = data.result;
    console.log('Business details retrieved:', business.name);

    // Format the business data
    const businessData = {
      name: business.name,
      address: business.formatted_address,
      phone: business.formatted_phone_number,
      website: business.website,
      businessStatus: business.business_status,
      types: business.types,
      googleMapsUrl: business.url,
      openingHours: business.opening_hours?.weekday_text || []
    };

    return new Response(
      JSON.stringify(businessData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error getting business details:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
