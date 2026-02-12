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
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get ALL blog posts
    const { data: posts, error: fetchError } = await supabase
      .from("blog_posts")
      .select("*");

    if (fetchError) throw fetchError;

    console.log(`Processing ${posts?.length || 0} total posts`);

    let fixed = 0;
    let errors = 0;

    for (const post of posts || []) {
      try {
        let cleanContent = post.content;
        let cleanTitle = post.title;
        let cleanExcerpt = post.excerpt;
        let needsUpdate = false;

        // Pattern 1: Extract from ```json ... ``` wrapper
        const jsonBlockMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
          try {
            const parsed = JSON.parse(jsonBlockMatch[1]);
            if (parsed.content) {
              cleanContent = parsed.content;
              cleanTitle = parsed.title || cleanTitle;
              cleanExcerpt = parsed.excerpt || cleanExcerpt;
              needsUpdate = true;
              console.log(`Extracted from JSON block: ${cleanTitle}`);
            }
          } catch (e: unknown) {
            console.error(`Failed to parse JSON block for post ${post.id}:`, e instanceof Error ? e.message : 'Unknown error');
          }
        }

        // Pattern 2: Check excerpt for ```json wrapper
        if (cleanExcerpt && cleanExcerpt.includes('```json')) {
          const excerptMatch = cleanExcerpt.match(/```json\s*([\s\S]*?)\s*```/);
          if (excerptMatch) {
            try {
              const parsed = JSON.parse(excerptMatch[1]);
              cleanExcerpt = parsed.excerpt || parsed.content || cleanExcerpt;
              needsUpdate = true;
            } catch (e) {
              // Just remove the wrapper
              cleanExcerpt = cleanExcerpt.replace(/```json\s*/g, '').replace(/```/g, '');
              needsUpdate = true;
            }
          }
        }

        // Pattern 3: If entire content is JSON (no wrapper)
        const trimmedContent = cleanContent.trim();
        if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
          try {
            const parsed = JSON.parse(trimmedContent);
            if (parsed.content && parsed.title) {
              cleanContent = parsed.content;
              cleanTitle = parsed.title;
              cleanExcerpt = parsed.excerpt || cleanExcerpt;
              needsUpdate = true;
              console.log(`Extracted from raw JSON: ${cleanTitle}`);
            }
          } catch (e) {
            // Not JSON, just markdown
          }
        }

        // Update if we found any issues
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update({
              content: cleanContent,
              title: cleanTitle,
              excerpt: cleanExcerpt
            })
            .eq("id", post.id);

          if (updateError) {
            console.error(`Error updating post ${post.id}:`, updateError);
            errors++;
          } else {
            console.log(`✓ Fixed: ${cleanTitle}`);
            fixed++;
          }
        }
      } catch (e) {
        console.error(`Error processing post ${post.id}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fixed ${fixed} posts, ${errors} errors`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in fix-blog-json:", error);
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