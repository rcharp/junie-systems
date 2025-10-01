-- Set default value for urgent_keywords in business_settings
ALTER TABLE public.business_settings 
ALTER COLUMN urgent_keywords SET DEFAULT 'emergency, urgent, asap, immediately';