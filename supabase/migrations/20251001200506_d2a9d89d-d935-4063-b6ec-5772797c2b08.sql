-- Add column to store Twilio phone number assigned to each business
ALTER TABLE public.business_settings
ADD COLUMN twilio_phone_number text;