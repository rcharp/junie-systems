import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { count = 50 } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const results = [];
    const errors = [];

    console.log(`Starting batch generation of ${count} blog posts...`);

    // Generate posts sequentially to avoid rate limiting
    for (let i = 0; i < count; i++) {
      try {
        console.log(`Generating post ${i + 1}/${count}...`);
        
        // Call the generate-blog-post function
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-blog-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({}),
        });

        const data = await response.json();
        
        if (data.success) {
          results.push(data.post);
          console.log(`✓ Post ${i + 1} created: ${data.post.title}`);
        } else {
          errors.push({ index: i + 1, error: data.error });
          console.error(`✗ Post ${i + 1} failed:`, data.error);
        }

        // Add delay between requests to avoid rate limiting (2 seconds)
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        errors.push({ index: i + 1, error: errorMsg });
        console.error(`✗ Post ${i + 1} failed:`, errorMsg);
      }
    }

    console.log(`Batch generation complete. Success: ${results.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        generated: results.length,
        failed: errors.length,
        total: count,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully generated ${results.length} blog posts${errors.length > 0 ? ` (${errors.length} failed)` : ''}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in generate-batch-blog-posts:", error);
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
