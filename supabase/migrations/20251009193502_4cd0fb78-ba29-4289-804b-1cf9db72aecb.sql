-- Rename forwarding_number to transfer_number in business_settings table
ALTER TABLE public.business_settings 
RENAME COLUMN forwarding_number TO transfer_number;