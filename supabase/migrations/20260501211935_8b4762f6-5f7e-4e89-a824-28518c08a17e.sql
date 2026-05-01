
-- Settings table (key/value) for pipeline configuration like industry_content_map and browserless_api_key
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view settings" ON public.settings;
CREATE POLICY "Admins can view settings"
ON public.settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert settings" ON public.settings;
CREATE POLICY "Admins can insert settings"
ON public.settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete settings" ON public.settings;
CREATE POLICY "Admins can delete settings"
ON public.settings FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pipeline companies table — stores screenshot generation results.
CREATE TABLE IF NOT EXISTS public.pipeline_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  phone_number TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  audio_url TEXT,
  screen_url TEXT,
  video_url TEXT,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view pipeline_companies" ON public.pipeline_companies;
CREATE POLICY "Admins can view pipeline_companies"
ON public.pipeline_companies FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can insert pipeline_companies" ON public.pipeline_companies;
CREATE POLICY "Admins can insert pipeline_companies"
ON public.pipeline_companies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update pipeline_companies" ON public.pipeline_companies;
CREATE POLICY "Admins can update pipeline_companies"
ON public.pipeline_companies FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete pipeline_companies" ON public.pipeline_companies;
CREATE POLICY "Admins can delete pipeline_companies"
ON public.pipeline_companies FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_pipeline_companies_updated_at ON public.pipeline_companies;
CREATE TRIGGER update_pipeline_companies_updated_at
  BEFORE UPDATE ON public.pipeline_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure sites bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('sites', 'sites', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for sites bucket (drop+recreate so this is idempotent)
DROP POLICY IF EXISTS "Public can read sites bucket" ON storage.objects;
CREATE POLICY "Public can read sites bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'sites');

DROP POLICY IF EXISTS "Admins can upload to sites bucket" ON storage.objects;
CREATE POLICY "Admins can upload to sites bucket"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sites' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update sites bucket" ON storage.objects;
CREATE POLICY "Admins can update sites bucket"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sites' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete from sites bucket" ON storage.objects;
CREATE POLICY "Admins can delete from sites bucket"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sites' AND public.has_role(auth.uid(), 'admin'::app_role));
