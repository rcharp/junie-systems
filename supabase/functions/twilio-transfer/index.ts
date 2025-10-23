import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('[Transfer] Request method:', req.method)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('[Transfer] Request received:', JSON.stringify(requestBody, null, 2))

    const { callSid, businessId, userId, agentNumber } = requestBody

    // Validate required parameters
    if (!callSid || callSid === 'null' || callSid === null) {
      console.error('[Transfer] No call SID provided or found')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No active call SID found. Cannot transfer call.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!agentNumber) {
      console.error('[Transfer] No transfer number provided')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No transfer number provided' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('[Transfer] Twilio credentials not configured')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Twilio credentials not configured' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`[Transfer] Transferring call ${callSid} to ${agentNumber}`)

    // Update the call to transfer
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Calls/${callSid}.json`
    
    const twimlUrl = `https://urkoxlolimjjadbdckco.supabase.co/functions/v1/twilio-transfer-twiml?to=${encodeURIComponent(agentNumber)}`

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        Url: twimlUrl,
        Method: 'POST'
      }).toString()
    })

    const twilioData = await twilioResponse.json()
    console.log('[Transfer] Twilio response:', twilioData)

    if (!twilioResponse.ok) {
      console.error('[Transfer] Twilio API error:', twilioData)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: twilioData.message || 'Failed to transfer call' 
        }),
        { 
          status: twilioResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the transfer
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    await supabase.from('call_logs').insert({
      business_id: businessId,
      user_id: userId,
      call_id: callSid,
      call_type: 'other',
      urgency_level: 'high',
      caller_name: 'Transfer',
      phone_number: agentNumber,
      message: `Call transferred to ${agentNumber}`,
      call_status: 'transferred',
      metadata: {
        transferred_to: agentNumber,
        original_call_sid: callSid
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Call transferred to ${agentNumber}` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('[Transfer] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
