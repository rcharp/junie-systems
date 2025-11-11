-- Add sms_number column to business_settings table
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS sms_number text;