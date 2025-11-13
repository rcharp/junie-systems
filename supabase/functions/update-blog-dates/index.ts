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

    // Get all published blog posts
    const { data: posts, error: fetchError } = await supabase
      .from('blog_posts')
      .select('id, title')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No blog posts found" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate dates spread over the past year
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const totalPosts = posts.length;
    const daysBetweenPosts = Math.floor(365 / totalPosts);

    console.log(`Updating ${totalPosts} posts with dates spread over the past year`);

    // Update each post with a distributed date
    const updates = posts.map(async (post, index) => {
      // Start from one year ago and space posts evenly
      const daysToAdd = index * daysBetweenPosts;
      const publishDate = new Date(oneYearAgo);
      publishDate.setDate(publishDate.getDate() + daysToAdd);

      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          published_at: publishDate.toISOString(),
          created_at: publishDate.toISOString()
        })
        .eq('id', post.id);

      if (updateError) {
        console.error(`Error updating post ${post.id}:`, updateError);
        return { id: post.id, success: false, error: updateError.message };
      }

      console.log(`Updated "${post.title}" to ${publishDate.toISOString()}`);
      return { id: post.id, success: true, date: publishDate.toISOString() };
    });

    const results = await Promise.all(updates);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully updated ${successCount} out of ${totalPosts} blog posts`,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in update-blog-dates:", error);
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
