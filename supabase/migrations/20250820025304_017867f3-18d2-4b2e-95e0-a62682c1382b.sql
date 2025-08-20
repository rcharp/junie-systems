-- Fix critical RLS security issues by enabling RLS and creating proper policies

-- Enable RLS on all tables that don't have it enabled
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trending_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Content Suggestions Policies - User-specific data
CREATE POLICY "Users can view their own content suggestions" 
ON public.content_suggestions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content suggestions" 
ON public.content_suggestions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content suggestions" 
ON public.content_suggestions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content suggestions" 
ON public.content_suggestions 
FOR DELETE 
USING (auth.uid() = user_id);

-- TikTok Accounts Policies - User-specific data with sensitive tokens
CREATE POLICY "Users can view their own tiktok accounts" 
ON public.tiktok_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tiktok accounts" 
ON public.tiktok_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tiktok accounts" 
ON public.tiktok_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tiktok accounts" 
ON public.tiktok_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- User Activity Policies - User-specific tracking data
CREATE POLICY "Users can view their own activity" 
ON public.user_activity 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity" 
ON public.user_activity 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity" 
ON public.user_activity 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity" 
ON public.user_activity 
FOR DELETE 
USING (auth.uid() = user_id);

-- User Profiles Policies - Personal user data
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can delete their own profile" 
ON public.user_profiles 
FOR DELETE 
USING (auth.uid() = id);

-- Videos Policies - User-specific through TikTok account relationship
CREATE POLICY "Users can view their own videos" 
ON public.videos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tiktok_accounts 
    WHERE tiktok_accounts.id = videos.tiktok_account_id 
    AND tiktok_accounts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own videos" 
ON public.videos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tiktok_accounts 
    WHERE tiktok_accounts.id = videos.tiktok_account_id 
    AND tiktok_accounts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own videos" 
ON public.videos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.tiktok_accounts 
    WHERE tiktok_accounts.id = videos.tiktok_account_id 
    AND tiktok_accounts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own videos" 
ON public.videos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.tiktok_accounts 
    WHERE tiktok_accounts.id = videos.tiktok_account_id 
    AND tiktok_accounts.user_id = auth.uid()
  )
);

-- Video Analytics Policies - User-specific through video relationship
CREATE POLICY "Users can view their own video analytics" 
ON public.video_analytics 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.tiktok_accounts ta ON v.tiktok_account_id = ta.id
    WHERE v.id = video_analytics.video_id 
    AND ta.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own video analytics" 
ON public.video_analytics 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.tiktok_accounts ta ON v.tiktok_account_id = ta.id
    WHERE v.id = video_analytics.video_id 
    AND ta.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own video analytics" 
ON public.video_analytics 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.tiktok_accounts ta ON v.tiktok_account_id = ta.id
    WHERE v.id = video_analytics.video_id 
    AND ta.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own video analytics" 
ON public.video_analytics 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.videos v
    JOIN public.tiktok_accounts ta ON v.tiktok_account_id = ta.id
    WHERE v.id = video_analytics.video_id 
    AND ta.user_id = auth.uid()
  )
);

-- Trending Analysis Policies - Global read-only data, but restrict modifications
CREATE POLICY "Everyone can view trending analysis" 
ON public.trending_analysis 
FOR SELECT 
USING (true);

-- Restrict insert/update/delete for trending analysis to system only
CREATE POLICY "Only system can modify trending analysis" 
ON public.trending_analysis 
FOR ALL 
USING (false)
WITH CHECK (false);