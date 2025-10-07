import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, business_id } = await req.json();

    if (!user_id || !business_id) {
      throw new Error('user_id and business_id are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the current phone number for this business
    const { data: businessSettings, error: fetchError } = await supabase
      .from('business_settings')
      .select('twilio_phone_number')
      .eq('id', business_id)
      .single();

    if (fetchError || !businessSettings?.twilio_phone_number) {
      throw new Error('No phone number found for this business');
    }

    const phoneNumber = businessSettings.twilio_phone_number;

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      throw new Error('Missing Twilio credentials');
    }

    console.log('Releasing Twilio number:', phoneNumber);

    // Release the number in Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`;
    
    // First, find the phone number SID
    const listResponse = await fetch(
      `${twilioUrl}?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Twilio list error:', errorText);
      throw new Error(`Failed to find phone number in Twilio: ${listResponse.statusText}`);
    }

    const listData = await listResponse.json();
    
    if (!listData.incoming_phone_numbers || listData.incoming_phone_numbers.length === 0) {
      console.warn('Phone number not found in Twilio, removing from database anyway');
    } else {
      const phoneSid = listData.incoming_phone_numbers[0].sid;
      
      // Delete/release the phone number
      const deleteResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${phoneSid}.json`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Twilio delete error:', errorText);
        throw new Error(`Failed to release phone number in Twilio: ${deleteResponse.statusText}`);
      }

      console.log('Phone number released in Twilio successfully');
    }

    // Remove the phone number from the database
    const { error: updateError } = await supabase
      .from('business_settings')
      .update({ twilio_phone_number: null })
      .eq('id', business_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Phone number removed from database successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Phone number released successfully',
        released_number: phoneNumber
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error releasing Twilio number:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
