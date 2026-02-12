const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const transferTo = url.searchParams.get('to')

    if (!transferTo) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Transfer number not provided</Say><Hangup/></Response>',
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/xml' 
          } 
        }
      )
    }

    // Validate phone number format to prevent injection
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(transferTo)) {
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Invalid transfer number</Say><Hangup/></Response>',
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/xml' } }
      )
    }

    // Generate TwiML to dial the transfer number
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Transferring your call now. Please hold.</Say>
  <Dial timeout="30" action="https://urkoxlolimjjadbdckco.supabase.co/functions/v1/twilio-transfer-status">
    <Number>${transferTo}</Number>
  </Dial>
</Response>`

    return new Response(twiml, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/xml' 
      }
    })

  } catch (error) {
    console.error('Error generating TwiML:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Transfer failed</Say><Hangup/></Response>',
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/xml' 
        } 
      }
    )
  }
})
