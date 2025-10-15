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
    // SECURITY: Verify admin authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT to verify admin role
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

    // Check if user has admin role
    const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (roleError || !isAdmin) {
      console.error('Authorization check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, business_id } = await req.json();

    // INPUT VALIDATION: Validate business_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!business_id || !uuidRegex.test(business_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid business_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id || !uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin authorized. Releasing Twilio number for business:', business_id);

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

    // Remove number from ElevenLabs
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (elevenLabsApiKey) {
      try {
        console.log('Removing phone number from ElevenLabs...');
        
        // First, get the phone number ID from ElevenLabs
        const listNumbersResponse = await fetch('https://api.elevenlabs.io/v1/convai/phone_numbers', {
          method: 'GET',
          headers: {
            'xi-api-key': elevenLabsApiKey,
          },
        });

        if (listNumbersResponse.ok) {
          const phoneNumbersList = await listNumbersResponse.json();
          const matchingNumber = phoneNumbersList.phone_numbers?.find(
            (num: any) => num.phone_number === phoneNumber
          );

          if (matchingNumber) {
            // Delete the phone number from ElevenLabs
            const deleteResponse = await fetch(
              `https://api.elevenlabs.io/v1/convai/phone_numbers/${matchingNumber.phone_number_id}`,
              {
                method: 'DELETE',
                headers: {
                  'xi-api-key': elevenLabsApiKey,
                },
              }
            );

            if (!deleteResponse.ok) {
              const errorText = await deleteResponse.text();
              console.error('ElevenLabs delete error:', errorText);
              console.warn('Failed to remove number from ElevenLabs, but Twilio release was successful');
            } else {
              console.log('Successfully removed number from ElevenLabs');
            }
          } else {
            console.log('Phone number not found in ElevenLabs, skipping removal');
          }
        } else {
          const errorText = await listNumbersResponse.text();
          console.error('ElevenLabs list error:', errorText);
          console.warn('Failed to list ElevenLabs numbers, but Twilio release was successful');
        }
      } catch (elevenLabsError) {
        console.error('Error removing number from ElevenLabs:', elevenLabsError);
        // Don't throw - continue even if ElevenLabs fails
      }
    } else {
      console.warn('ElevenLabs credentials not configured - skipping ElevenLabs removal');
    }

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
