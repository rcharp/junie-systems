import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  hero_image: string | null;
  published_at: string | null;
  created_at: string;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id, title, slug, content, hero_image, published_at, created_at")
      .eq("slug", slug)
      .eq("published", true)
      .single();

    if (error) {
      console.error("Error fetching blog post:", error);
      setNotFound(true);
    } else {
      setPost(data);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <Link to="/blog">
            <Button variant="ghost" className="mb-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-64 w-full mt-8" />
            </div>
          ) : notFound || !post ? (
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
              <p className="text-muted-foreground mb-8">
                The blog post you're looking for doesn't exist.
              </p>
              <Link to="/blog">
                <Button>View All Posts</Button>
              </Link>
            </div>
          ) : (
            <article>
              {post.hero_image && (
                <div className="w-full h-96 mb-8 rounded-lg overflow-hidden">
                  <img 
                    src={post.hero_image} 
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <header className="mb-8">
                <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
                <p className="text-muted-foreground">
                  Published on{" "}
                  {format(new Date(post.published_at || post.created_at), "MMMM d, yyyy")}
                </p>
              </header>
              <div className="prose prose-lg max-w-none dark:prose-invert">
                {post.content.split("\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </article>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
