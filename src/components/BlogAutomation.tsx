import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const BlogAutomation = () => {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const generateBatchPosts = async () => {
    setGenerating(true);
    setProgress("Starting batch generation of 50 blog posts...");
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-batch-blog-posts', {
        body: { count: 50 }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setProgress(`Complete! Generated ${data.generated} posts. ${data.failed > 0 ? `Failed: ${data.failed}` : ''}`);
      } else {
        throw new Error(data.error || "Failed to generate posts");
      }
    } catch (error) {
      console.error("Error generating batch posts:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate posts");
      setProgress("Generation failed. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  const generateSinglePost = async () => {
    setGenerating(true);
    setProgress("Generating single blog post...");
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-blog-post', {
        body: {}
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setProgress(`Post created: ${data.post.title}`);
      } else {
        throw new Error(data.error || "Failed to generate post");
      }
    } catch (error) {
      console.error("Error generating post:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate post");
      setProgress("Generation failed. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  const spreadOutDates = async () => {
    setGenerating(true);
    setProgress("Updating blog post dates...");
    
    try {
      // Get all published posts
      const { data: posts, error: fetchError } = await supabase
        .from('blog_posts')
        .select('id, title')
        .eq('published', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!posts || posts.length === 0) {
        toast.info("No blog posts found");
        return;
      }

      // Calculate dates spread over the past year
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);

      const totalPosts = posts.length;
      const daysBetweenPosts = Math.floor(365 / totalPosts);

      // Update each post
      let successCount = 0;
      for (let i = 0; i < posts.length; i++) {
        const daysToAdd = i * daysBetweenPosts;
        const publishDate = new Date(oneYearAgo);
        publishDate.setDate(publishDate.getDate() + daysToAdd);

        const { error: updateError } = await supabase
          .from('blog_posts')
          .update({
            published_at: publishDate.toISOString(),
            created_at: publishDate.toISOString()
          })
          .eq('id', posts[i].id);

        if (!updateError) {
          successCount++;
        }
      }

      toast.success(`Updated ${successCount} blog post dates`);
      setProgress(`Complete! Updated ${successCount} out of ${totalPosts} posts.`);
    } catch (error) {
      console.error("Error updating dates:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update dates");
      setProgress("Update failed. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  const regenerateAllPosts = async () => {
    if (!confirm("This will delete all existing posts and regenerate them with proper markdown. Continue?")) {
      return;
    }

    setGenerating(true);
    setProgress("Deleting existing posts...");
    
    try {
      // Delete all existing posts
      const { error: deleteError } = await supabase
        .from('blog_posts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      setProgress("Generating 50 new blog posts with markdown...");

      const { data, error } = await supabase.functions.invoke('generate-batch-blog-posts', {
        body: { count: 50 }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Posts regenerated successfully!");
        setProgress(`Complete! Generated ${data.generated} posts with proper markdown.`);
      } else {
        throw new Error(data.error || "Failed to generate posts");
      }
    } catch (error) {
      console.error("Error regenerating posts:", error);
      toast.error(error instanceof Error ? error.message : "Failed to regenerate posts");
      setProgress("Regeneration failed. Check console for details.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blog Automation</CardTitle>
        <CardDescription>
          Automated AI-powered blog post generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Initial Setup</h3>
          <p className="text-sm text-muted-foreground">
            Generate 50 SEO-optimized blog posts about AI answering services and AI automation.
            This will take approximately 2-3 minutes.
          </p>
          <Button 
            onClick={generateBatchPosts} 
            disabled={generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate 50 Blog Posts"
            )}
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold">Manual Generation</h3>
          <p className="text-sm text-muted-foreground">
            Generate a single blog post manually
          </p>
          <Button 
            onClick={generateSinglePost} 
            disabled={generating}
            variant="outline"
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Single Post"
            )}
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold">Spread Out Dates</h3>
          <p className="text-sm text-muted-foreground">
            Distribute blog post dates evenly over the past year for better SEO
          </p>
          <Button 
            onClick={spreadOutDates} 
            disabled={generating}
            variant="outline"
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Post Dates"
            )}
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold">Regenerate All Posts</h3>
          <p className="text-sm text-muted-foreground">
            Delete all existing posts and generate 50 new ones with proper markdown formatting
          </p>
          <Button 
            onClick={regenerateAllPosts} 
            disabled={generating}
            variant="destructive"
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              "Regenerate All Posts (Delete & Recreate)"
            )}
          </Button>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <h3 className="font-semibold">Automated Daily Generation</h3>
          <p className="text-sm text-muted-foreground">
            A cron job automatically generates 1 new blog post every day at 9:00 AM UTC.
            This runs automatically in the background.
          </p>
          <div className="bg-muted p-3 rounded text-xs">
            <strong>Status:</strong> Active (Daily at 9:00 AM UTC)
          </div>
        </div>

        {progress && (
          <div className="mt-4 p-3 bg-muted rounded text-sm">
            {progress}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlogAutomation;
