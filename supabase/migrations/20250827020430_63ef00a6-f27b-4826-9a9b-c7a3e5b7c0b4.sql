-- Add services and pricing fields to business_settings table
ALTER TABLE public.business_settings 
ADD COLUMN services_offered text,
ADD COLUMN pricing_structure text;