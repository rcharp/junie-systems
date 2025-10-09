import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PurchaseNumberRequest {
  areaCode: string;
  businessId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Verify user authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { areaCode, businessId }: PurchaseNumberRequest = await req.json();
    
    // INPUT VALIDATION: Validate area code format
    if (!areaCode || !/^\d{3}$/.test(areaCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid area code: must be 3 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // INPUT VALIDATION: Validate business ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!businessId || !uuidRegex.test(businessId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid business ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for database operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user owns this business OR is admin
    const { data: businessData, error: businessError } = await serviceClient
      .from('business_settings')
      .select('user_id, business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      console.error('Error fetching business data:', businessError);
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    console.log('User ID:', user.id);
    console.log('Business owner ID:', businessData.user_id);
    console.log('Is admin:', isAdmin);
    console.log('Role check error:', roleError);

    // Allow if user owns the business OR is admin
    if (businessData.user_id !== user.id && !isAdmin) {
      console.error('Authorization failed - user does not own business and is not admin');
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden: You can only purchase numbers for your own business',
          debug: {
            userId: user.id,
            businessOwnerId: businessData.user_id,
            isAdmin: isAdmin
          }
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessName = businessData.business_name || 'Business';
    console.log('User authorized. Purchasing Twilio number for business:', businessName);

    // Get Twilio credentials from environment
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Twilio credentials not configured');
    }

    // Search for available numbers in the area code
    const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${areaCode}&Limit=1`;
    
    const basicAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    console.log('Searching for available numbers...');
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Twilio search error:', errorText);
      throw new Error(`Failed to search for phone numbers: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    console.log('Available numbers:', searchData);

    if (!searchData.available_phone_numbers || searchData.available_phone_numbers.length === 0) {
      throw new Error(`No available phone numbers found for area code ${areaCode}`);
    }

    const phoneNumber = searchData.available_phone_numbers[0].phone_number;
    console.log('Found available number:', phoneNumber);

    // Purchase the phone number with friendly name
    const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;
    
    const formData = new URLSearchParams();
    formData.append('PhoneNumber', phoneNumber);
    formData.append('FriendlyName', `${businessName} - Junie`);
    
    // Configure with Junie TwiML App if available
    const twilioAppSid = Deno.env.get('TWILIO_TWIML_APP_SID');
    if (twilioAppSid) {
      formData.append('VoiceApplicationSid', twilioAppSid);
    }

    console.log('Purchasing number...');
    const purchaseResponse = await fetch(purchaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!purchaseResponse.ok) {
      const errorText = await purchaseResponse.text();
      console.error('Twilio purchase error:', errorText);
      throw new Error(`Failed to purchase phone number: ${purchaseResponse.statusText}`);
    }

    const purchaseData = await purchaseResponse.json();
    console.log('Successfully purchased number:', purchaseData);

    // Update business_settings with the new Twilio number
    const { error: updateError } = await serviceClient
      .from('business_settings')
      .update({ twilio_phone_number: phoneNumber })
      .eq('id', businessId);

    if (updateError) {
      console.error('Error updating business settings:', updateError);
      throw updateError;
    }

    console.log('Successfully updated business settings with new number');

    return new Response(
      JSON.stringify({
        success: true,
        phoneNumber: phoneNumber,
        twilioSid: purchaseData.sid,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in purchase-twilio-number function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});