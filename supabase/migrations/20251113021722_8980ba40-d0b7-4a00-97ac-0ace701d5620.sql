-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT slug_length CHECK (length(slug) > 0 AND length(slug) <= 200),
  CONSTRAINT title_length CHECK (length(title) > 0 AND length(title) <= 500)
);

-- Create index for faster lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at DESC);
CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view published blog posts
CREATE POLICY "Anyone can view published blog posts"
ON public.blog_posts
FOR SELECT
USING (published = true);

-- Authenticated users can view all their own posts
CREATE POLICY "Authors can view their own posts"
ON public.blog_posts
FOR SELECT
USING (auth.uid() = author_id);

-- Authenticated users can create blog posts
CREATE POLICY "Authenticated users can create blog posts"
ON public.blog_posts
FOR INSERT
WITH CHECK (auth.uid() = author_id AND auth.uid() IS NOT NULL);

-- Authors can update their own posts
CREATE POLICY "Authors can update their own posts"
ON public.blog_posts
FOR UPDATE
USING (auth.uid() = author_id);

-- Authors can delete their own posts
CREATE POLICY "Authors can delete their own posts"
ON public.blog_posts
FOR DELETE
USING (auth.uid() = author_id);

-- Admins have full access
CREATE POLICY "Admins have full access to blog_posts"
ON public.blog_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();