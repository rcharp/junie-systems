import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BLAND_AI_API_KEY = Deno.env.get('BLAND_AI_API_KEY');
    if (!BLAND_AI_API_KEY) {
      throw new Error('BLAND_AI_API_KEY is not set');
    }

    const url = new URL(req.url);
    let action = url.searchParams.get('action');
    
    // If no action in URL params and it's POST, check body
    if (!action && req.method === 'POST') {
      const body = await req.json();
      action = body.action || 'send-call';
    } else if (!action) {
      action = 'list-calls';
    }

    switch (action) {
      case 'list-calls': {
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const completed = url.searchParams.get('completed');
        const limit = url.searchParams.get('limit') || '50';

        let apiUrl = `https://api.bland.ai/v1/calls?limit=${limit}`;
        
        if (startDate) apiUrl += `&start_date=${startDate}`;
        if (endDate) apiUrl += `&end_date=${endDate}`;
        if (completed) apiUrl += `&completed=${completed}`;

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'authorization': BLAND_AI_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bland AI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Fetched calls:', data.count);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-call': {
        let callId = url.searchParams.get('call_id');
        if (!callId && req.method === 'POST') {
          const body = await req.json();
          callId = body.call_id;
        }
        if (!callId) {
          throw new Error('call_id parameter is required');
        }

        const response = await fetch(`https://api.bland.ai/v1/calls/${callId}`, {
          method: 'GET',
          headers: {
            'authorization': BLAND_AI_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bland AI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Fetched call details for:', callId);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-transcript': {
        let callId = url.searchParams.get('call_id');
        if (!callId && req.method === 'POST') {
          const body = await req.json();
          callId = body.call_id;
        }
        if (!callId) {
          throw new Error('call_id parameter is required');
        }

        const response = await fetch(`https://api.bland.ai/v1/calls/${callId}/transcript`, {
          method: 'GET',
          headers: {
            'authorization': BLAND_AI_API_KEY,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bland AI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Fetched transcript for:', callId);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send-call': {
        const { phone_number, pathway_id } = await req.json();
        
        if (!phone_number || !pathway_id) {
          throw new Error('phone_number and pathway_id are required');
        }

        const response = await fetch('https://api.bland.ai/v1/calls', {
          method: 'POST',
          headers: {
            'authorization': BLAND_AI_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone_number,
            pathway_id
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Bland AI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Call initiated:', data.call_id);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error('Invalid action parameter. Supported actions: list-calls, get-call, get-transcript, send-call');
    }

  } catch (error) {
    console.error('Error in bland-ai-calls function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      action: new URL(req.url).searchParams.get('action')
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});