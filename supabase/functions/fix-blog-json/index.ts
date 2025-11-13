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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get ALL blog posts to fix
    const { data: posts, error: fetchError } = await supabase
      .from("blog_posts")
      .select("*");

    if (fetchError) throw fetchError;

    console.log(`Processing ${posts?.length || 0} posts`);

    let fixed = 0;
    let errors = 0;

    for (const post of posts || []) {
      try {
        let cleanContent = post.content;
        let cleanTitle = post.title;
        let cleanExcerpt = post.excerpt;
        let needsUpdate = false;

        // Check for JSON code blocks (```json ... ```)
        const jsonMatch = cleanContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         cleanContent.match(/```\s*({[\s\S]*?})\s*```/);
        
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            cleanContent = parsed.content || cleanContent;
            cleanTitle = parsed.title || cleanTitle;
            cleanExcerpt = parsed.excerpt || cleanExcerpt;
            needsUpdate = true;
          } catch (e) {
            console.error(`Failed to parse JSON block for post ${post.id}:`, e);
          }
        }

        // Check if the entire content is JSON wrapped
        if (cleanContent.trim().startsWith('{') && cleanContent.trim().endsWith('}')) {
          try {
            const parsed = JSON.parse(cleanContent);
            if (parsed.content) {
              cleanContent = parsed.content;
              cleanTitle = parsed.title || cleanTitle;
              cleanExcerpt = parsed.excerpt || cleanExcerpt;
              needsUpdate = true;
            }
          } catch (e) {
            // Not valid JSON, continue
          }
        }

        // Check if title or excerpt contains JSON
        if (cleanTitle.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(cleanTitle);
            cleanTitle = parsed.title || cleanTitle;
            needsUpdate = true;
          } catch (e) {
            // Not valid JSON
          }
        }

        if (cleanExcerpt && cleanExcerpt.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(cleanExcerpt);
            cleanExcerpt = parsed.excerpt || cleanExcerpt;
            needsUpdate = true;
          } catch (e) {
            // Not valid JSON
          }
        }

        // Only update if we found issues
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
            console.log(`Fixed post: ${cleanTitle}`);
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