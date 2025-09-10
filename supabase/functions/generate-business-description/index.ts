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
    const { businessName, businessType, services, address, phone } = await req.json();
    
    console.log('Generating business description for:', { businessName, businessType, services });

    // Build context for the AI
    const servicesText = services && services.length > 0 
      ? services.map((s: any) => s.name).join(', ')
      : 'professional services';
    
    const locationText = address ? ` located in ${address}` : '';
    
    const prompt = `Write a compelling, professional business description for ${businessName}, a ${businessType} business${locationText}. 

Services offered: ${servicesText}
${phone ? `Contact: ${phone}` : ''}

Requirements:
- 2-3 sentences maximum
- Focus on quality, reliability, and customer satisfaction
- Include key services naturally
- Professional but approachable tone
- Highlight what makes them unique in their local market
- Do not use excessive adjectives or marketing fluff
- Make it sound authentic and trustworthy

Generate only the description text, no extra formatting or quotes.`;

    console.log('Making request to Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [
          { 
            role: 'user', 
            content: prompt 
          }
        ]
      }),
    });

    console.log('Claude API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', response.status, errorData);
      throw new Error(`Claude API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Claude API response:', data);
    
    const generatedDescription = data.content[0].text.trim();
    
    console.log('Generated description:', generatedDescription);

    return new Response(JSON.stringify({ description: generatedDescription }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-business-description function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate business description' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});