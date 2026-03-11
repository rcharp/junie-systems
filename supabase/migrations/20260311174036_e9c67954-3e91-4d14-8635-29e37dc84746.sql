INSERT INTO storage.buckets (id, name, public) VALUES ('onboarding-logos', 'onboarding-logos', true);

CREATE POLICY "Anyone can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'onboarding-logos');

CREATE POLICY "Logos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'onboarding-logos');