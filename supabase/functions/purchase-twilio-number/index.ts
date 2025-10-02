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
    const { areaCode, businessId }: PurchaseNumberRequest = await req.json();
    console.log('Purchasing Twilio number for area code:', areaCode);

    // Get Supabase client to fetch business name
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch business name
    const { data: businessData, error: businessError } = await supabaseClient
      .from('business_settings')
      .select('business_name')
      .eq('id', businessId)
      .single();

    if (businessError || !businessData) {
      console.error('Error fetching business data:', businessError);
      throw new Error('Failed to fetch business information');
    }

    const businessName = businessData.business_name || 'Business';
    console.log('Business name:', businessName);

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
    const { error: updateError } = await supabaseClient
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