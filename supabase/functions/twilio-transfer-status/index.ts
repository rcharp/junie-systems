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
    // Parse form data from Twilio
    const formData = await req.formData()
    const dialCallStatus = formData.get('DialCallStatus')

    console.log('[Transfer Status] Dial status:', dialCallStatus)

    // If the transfer failed, provide fallback
    if (dialCallStatus === 'no-answer' || dialCallStatus === 'busy' || dialCallStatus === 'failed') {
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>The transfer was unsuccessful. The line is ${dialCallStatus === 'busy' ? 'busy' : 'not available'}. Goodbye.</Say>
  <Hangup/>
</Response>`

      return new Response(twiml, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/xml' 
        }
      })
    }

    // Transfer was successful, just hang up
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`

    return new Response(twiml, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/xml' 
      }
    })

  } catch (error) {
    console.error('[Transfer Status] Error:', error)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>',
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
