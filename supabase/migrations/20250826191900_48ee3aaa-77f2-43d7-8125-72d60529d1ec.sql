-- Create user profile for rickycharpentier@gmail.com if it doesn't exist
INSERT INTO public.user_profiles (id, webhook_id)
SELECT '54b21009-f5f0-45bf-b126-d11094178719', gen_random_uuid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles 
  WHERE id = '54b21009-f5f0-45bf-b126-d11094178719'
);

-- Get the webhook_id for rickycharpentier@gmail.com
SELECT webhook_id FROM public.user_profiles WHERE id = '54b21009-f5f0-45bf-b126-d11094178719';