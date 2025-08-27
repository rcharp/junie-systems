-- Add business website field to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN business_website text;