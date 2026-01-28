-- Fix 1: Remove the overly permissive todos policies (secure ones already exist)
DROP POLICY IF EXISTS "Anyone can view todos" ON public.todos;
DROP POLICY IF EXISTS "Anyone can create todos" ON public.todos;
DROP POLICY IF EXISTS "Anyone can update todos" ON public.todos;
DROP POLICY IF EXISTS "Anyone can delete todos" ON public.todos;

-- Fix 2: Create a public view for blog_posts that excludes author_id
DROP VIEW IF EXISTS public.blog_posts_public;

CREATE VIEW public.blog_posts_public
WITH (security_invoker=on) AS
SELECT 
    id,
    title,
    slug,
    excerpt,
    content,
    hero_image,
    published,
    published_at,
    created_at,
    updated_at
FROM public.blog_posts
WHERE published = true;

-- Grant access to the view
GRANT SELECT ON public.blog_posts_public TO anon, authenticated;