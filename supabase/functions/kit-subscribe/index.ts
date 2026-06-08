import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: 'Invalid email' }).max(255),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { raw = {}; }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid email', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { email } = parsed.data;

    const kitApiKey = Deno.env.get('KIT_API_KEY');
    
    if (!kitApiKey) {
      console.error('KIT_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Kit API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Subscribing email to Kit form 8455844:', email);

    const response = await fetch('https://api.kit.com/v3/forms/8455844/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        api_key: kitApiKey,
      }),
    });

    const responseData = await response.json();
    console.log('Kit API response:', response.status, responseData);

    if (response.ok) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Successfully subscribed to Kit form'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('Kit API error:', responseData);
      return new Response(
        JSON.stringify({ 
          error: responseData.message || 'Failed to subscribe to Kit form'
        }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Error in kit-subscribe function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});