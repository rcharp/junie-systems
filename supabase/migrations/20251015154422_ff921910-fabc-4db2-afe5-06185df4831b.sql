-- Add elevenlabs_phone_number_id to business_settings table
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS elevenlabs_phone_number_id text;