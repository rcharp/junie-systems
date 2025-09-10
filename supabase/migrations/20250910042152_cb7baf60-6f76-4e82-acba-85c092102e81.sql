-- Add column for full state name in business address
ALTER TABLE public.business_settings 
ADD COLUMN business_address_state_full text;