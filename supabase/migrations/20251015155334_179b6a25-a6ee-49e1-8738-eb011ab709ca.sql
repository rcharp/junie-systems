-- Add separate address columns to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS street_address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text;