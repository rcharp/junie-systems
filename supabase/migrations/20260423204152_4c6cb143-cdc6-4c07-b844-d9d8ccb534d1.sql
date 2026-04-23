-- Create public storage bucket for screenshot pipeline (logos + final screenshots)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sites', 'sites', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public can read sites bucket"
ON storage.objects
FOR SELECT
USING (bucket_id = 'sites');

-- Admins can upload/update/delete
CREATE POLICY "Admins can upload to sites bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sites' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sites bucket"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'sites' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete from sites bucket"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'sites' AND has_role(auth.uid(), 'admin'::app_role));