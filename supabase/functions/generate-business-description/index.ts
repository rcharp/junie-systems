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
    const { businessName, businessType, services, address, phone, website, businessTypesList, statesList } = await req.json();
    
    console.log('Generating business data for:', { businessName, businessType, address });

    // Build context for the AI
    const servicesText = services && services.length > 0 
      ? services.map((s: any) => s.name).join(', ')
      : 'professional services';
    
    const locationText = address ? ` located in ${address}` : '';
    
    const prompt = `You are analyzing a business to extract structured information.

Business Name: ${businessName}
Business Type: ${businessType}
Location: ${address || 'Unknown'}
Services: ${servicesText}
${phone ? `Contact: ${phone}` : ''}
${website ? `Website: ${website}` : ''}

Please provide:

1. A compelling, professional business description (2-3 sentences). Focus on quality, reliability, and customer satisfaction. Include key services naturally. Professional but approachable tone. Highlight what makes them unique in their local market. No excessive adjectives or marketing fluff. Make it sound authentic and trustworthy.

2. Match the business type to the MOST APPROPRIATE option from this list: ${businessTypesList?.join(', ') || 'restaurant, retail, healthcare, home_services, professional_services, automotive, beauty, fitness, education, entertainment, other'}

3. Extract the US state (if mentioned in the address) and match it to this list: ${statesList?.join(', ') || 'AL, AK, AZ, AR, CA, CO, CT, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY'}

Return ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "description": "your description here",
  "businessType": "matched_business_type",
  "state": "STATE_CODE or null"
}`;

    console.log('Making request to Claude API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
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
    
    const generatedText = data.content[0].text.trim();
    console.log('Generated text:', generatedText);
    
    // Parse JSON response
    let result;
    try {
      result = JSON.parse(generatedText);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', generatedText);
      // Fallback to simple description
      result = {
        description: generatedText,
        businessType: businessType || 'other',
        state: null
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-business-description function:', error);
    return new Response(JSON.stringify({ 
      error: (error instanceof Error ? error.message : 'Unknown error') || 'Failed to generate business description' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});