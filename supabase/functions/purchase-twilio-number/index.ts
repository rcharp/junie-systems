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
      .select('user_id, business_name, city, state')
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

    const basicAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Function to search for available numbers by area code
    const searchForNumber = async (searchAreaCode: string) => {
      const searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/US/Local.json?AreaCode=${searchAreaCode}&Limit=1`;
      
      console.log(`Searching for available numbers in area code: ${searchAreaCode}`);
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Authorization': `Basic ${basicAuth}`,
        },
      });

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error('Twilio search error:', errorText);
        return null;
      }

      const searchData = await searchResponse.json();
      
      if (searchData.available_phone_numbers && searchData.available_phone_numbers.length > 0) {
        return searchData.available_phone_numbers[0].phone_number;
      }
      
      return null;
    };

    // Try primary area code first
    let phoneNumber = await searchForNumber(areaCode);
    
    // If no numbers found, try nearby area codes based on state
    if (!phoneNumber) {
      console.log(`No numbers found for area code ${areaCode}, trying alternatives...`);
      
      // Get state from business address to find nearby area codes
      const { data: stateData } = await serviceClient
        .from('business_settings')
        .select('business_address_state_full, business_address')
        .eq('id', businessId)
        .single();
      
      // Map of states to alternative area codes
      const stateAreaCodes: { [key: string]: string[] } = {
        'Virginia': ['571', '804', '757', '540', '276'],
        'Florida': ['305', '954', '561', '407', '813', '727', '850', '386'],
        'New York': ['212', '718', '917', '646', '347', '516', '631'],
        'California': ['310', '424', '213', '323', '818', '626', '714', '949'],
        'Texas': ['214', '469', '972', '817', '682', '281', '713', '832']
      };
      
      const stateName = stateData?.business_address_state_full || 'Virginia';
      const alternativeCodes = stateAreaCodes[stateName] || ['571', '703', '202'];
      
      // Try each alternative area code
      for (const altCode of alternativeCodes) {
        if (altCode === areaCode) continue; // Skip the one we already tried
        
        phoneNumber = await searchForNumber(altCode);
        if (phoneNumber) {
          console.log(`Found number in alternative area code: ${altCode}`);
          break;
        }
      }
    }

    if (!phoneNumber) {
      throw new Error(`No available phone numbers found for area code ${areaCode} or nearby area codes`);
    }

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

    // Import number to ElevenLabs and assign to Junie agent
    const elevenLabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const elevenLabsAgentId = Deno.env.get('ELEVENLABS_AGENT_ID');
    
    if (elevenLabsApiKey && elevenLabsAgentId && twilioAccountSid) {
      try {
        console.log('Importing phone number to ElevenLabs...');
        console.log('Phone number:', phoneNumber);
        console.log('Business name:', businessName);
        console.log('City:', businessData.city);
        console.log('State:', businessData.state);
        console.log('Agent ID:', elevenLabsAgentId);
        console.log('Twilio Account SID:', twilioAccountSid);
        console.log('Twilio Auth Token available:', !!twilioAuthToken);
        
        // Create phone label with city and state
        let phoneLabel = businessName;
        if (businessData.city && businessData.state) {
          phoneLabel = `${businessName} - ${businessData.city}, ${businessData.state}`;
        }
        
        console.log('Phone label for ElevenLabs:', phoneLabel);
        
        // Import phone number to ElevenLabs - using correct endpoint
        const importPayload = {
          phone_number: phoneNumber,
          label: phoneLabel,
          sid: twilioAccountSid,
          token: twilioAuthToken,
        };
        
        console.log('Import payload:', JSON.stringify({...importPayload, token: '[REDACTED]'}));
        
        const importNumberResponse = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(importPayload),
        });

        const responseText = await importNumberResponse.text();
        console.log('ElevenLabs response status:', importNumberResponse.status);
        console.log('ElevenLabs response:', responseText);

        if (!importNumberResponse.ok) {
          console.error('ElevenLabs import number error:', responseText);
          console.warn('Failed to import number to ElevenLabs, but Twilio purchase was successful');
        } else {
          try {
            const elevenLabsData = JSON.parse(responseText);
            console.log('Successfully imported number to ElevenLabs:', elevenLabsData);
            const phoneNumberId = elevenLabsData.phone_number_id;
            
            // Store the ElevenLabs phone number ID in the database
            if (phoneNumberId) {
              console.log('Storing ElevenLabs phone number ID in database:', phoneNumberId);
              const { error: idUpdateError } = await serviceClient
                .from('business_settings')
                .update({ elevenlabs_phone_number_id: phoneNumberId })
                .eq('id', businessId);
              
              if (idUpdateError) {
                console.error('Failed to store ElevenLabs phone number ID:', idUpdateError);
              } else {
                console.log('Successfully stored ElevenLabs phone number ID');
              }
            }
            
            // Now assign the number to the agent
            if (phoneNumberId && elevenLabsAgentId) {
              console.log('Assigning phone number to agent...');
              const assignResponse = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`, {
                method: 'PATCH',
                headers: {
                  'xi-api-key': elevenLabsApiKey,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  agent_id: elevenLabsAgentId,
                }),
              });
              
              if (assignResponse.ok) {
                console.log('Successfully assigned phone number to agent');
              } else {
                const assignError = await assignResponse.text();
                console.error('Failed to assign number to agent:', assignError);
              }
            }
          } catch (e) {
            console.log('Successfully imported number to ElevenLabs');
          }
        }
      } catch (elevenLabsError) {
        console.error('Error importing number to ElevenLabs:', elevenLabsError);
        // Don't throw - continue even if ElevenLabs fails
      }
    } else {
      console.warn('ElevenLabs credentials or Twilio SID not configured - skipping ElevenLabs import');
    }

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