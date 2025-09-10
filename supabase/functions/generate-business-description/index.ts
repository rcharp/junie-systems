import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');

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

    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

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

    console.log('Making request to Perplexity API...');

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional copywriter specializing in creating compelling business descriptions. Write concise, authentic descriptions that build trust and clearly communicate value.'
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.2
      }),
    });

    console.log('Perplexity API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Perplexity API error:', response.status, errorData);
      throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Perplexity API response:', data);
    
    const generatedDescription = data.choices[0].message.content.trim();
    
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