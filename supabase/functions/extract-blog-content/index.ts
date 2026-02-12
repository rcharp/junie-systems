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

    // Get all blog posts
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

        // Strategy: Find where the actual markdown content starts (usually with ##)
        // and strip everything before it
        
        const markdownStart = cleanContent.indexOf('## ');
        if (markdownStart > 0 && markdownStart < 500) {
          // There's content before the markdown that we should remove
          cleanContent = cleanContent.substring(markdownStart);
          needsUpdate = true;
          console.log(`✓ Stripped JSON prefix for: ${cleanTitle}`);
        } else if (cleanContent.startsWith('{')) {
          // Try to extract from malformed JSON by finding the content field
          const contentMatch = cleanContent.match(/"content":\s*"(## [^}]+)/);
          if (contentMatch) {
            // Extract everything from ## onwards, handling escaped characters
            const startIndex = cleanContent.indexOf('"content":');
            if (startIndex !== -1) {
              const afterContent = cleanContent.substring(startIndex + '"content":'.length).trim();
              // Remove leading quote
              const withoutQuote = afterContent.startsWith('"') ? afterContent.substring(1) : afterContent;
              // Find the markdown content
              const mdStart = withoutQuote.indexOf('##');
              if (mdStart !== -1) {
                // Take everything from ## to the end, removing trailing JSON
                cleanContent = withoutQuote.substring(mdStart).split('"}')[0];
                // Unescape newlines
                cleanContent = cleanContent.replace(/\\n/g, '\n');
                needsUpdate = true;
                console.log(`✓ Extracted from malformed JSON for: ${cleanTitle}`);
              }
            }
          }
        }

        // Clean up excerpt too
        if (cleanExcerpt && cleanExcerpt.includes('{')) {
          const excerptStart = cleanExcerpt.indexOf('{');
          if (excerptStart === 0) {
            // Try to extract
            const match = cleanExcerpt.match(/"excerpt":\s*"([^"]+)"/);
            if (match) {
              cleanExcerpt = match[1];
              needsUpdate = true;
            }
          }
        }

        // Update if needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update({
              content: cleanContent,
              excerpt: cleanExcerpt
            })
            .eq("id", post.id);

          if (updateError) {
            console.error(`Error updating post ${post.id}:`, updateError);
            errors++;
          } else {
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
        message: `Extracted content from ${fixed} posts, ${errors} errors`,
        fixed,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in extract-blog-content:", error);
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
