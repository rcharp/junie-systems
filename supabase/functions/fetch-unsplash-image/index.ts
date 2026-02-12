import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY");
    
    if (!UNSPLASH_ACCESS_KEY) {
      throw new Error("UNSPLASH_ACCESS_KEY is not configured");
    }

    const { query } = await req.json();
    
    if (!query) {
      throw new Error("Query parameter is required");
    }

    console.log('Fetching Unsplash image for query:', query);

    // Search for images on Unsplash
    const searchResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Unsplash API error:', searchResponse.status, errorText);
      throw new Error(`Unsplash API error: ${searchResponse.status}`);
    }

    const data = await searchResponse.json();
    
    if (!data.results || data.results.length === 0) {
      // Fallback to a generic business/technology image
      const fallbackResponse = await fetch(
        'https://api.unsplash.com/search/photos?query=business technology&per_page=1&orientation=landscape',
        {
          headers: {
            'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        }
      );
      const fallbackData = await fallbackResponse.json();
      
      return new Response(
        JSON.stringify({ 
          success: true,
          imageUrl: fallbackData.results[0]?.urls?.regular || null,
          photographer: fallbackData.results[0]?.user?.name || 'Unknown',
          photographerUrl: fallbackData.results[0]?.user?.links?.html || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const image = data.results[0];
    
    return new Response(
      JSON.stringify({ 
        success: true,
        imageUrl: image.urls.regular,
        photographer: image.user.name,
        photographerUrl: image.user.links.html,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in fetch-unsplash-image:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});