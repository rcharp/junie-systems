-- Add a webhook_id column to user_profiles table to give each user a unique webhook identifier
ALTER TABLE public.user_profiles 
ADD COLUMN webhook_id uuid DEFAULT gen_random_uuid() UNIQUE;

-- Create an index for faster webhook lookups
CREATE INDEX idx_user_profiles_webhook_id ON public.user_profiles(webhook_id);

-- Create a function to get user_id from webhook_id
CREATE OR REPLACE FUNCTION public.get_user_id_by_webhook_id(_webhook_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.user_profiles
  WHERE webhook_id = _webhook_id
  LIMIT 1
$$;