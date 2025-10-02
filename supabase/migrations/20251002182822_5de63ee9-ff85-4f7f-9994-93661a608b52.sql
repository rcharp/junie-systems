-- Add stripe_test_customer_id column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS stripe_test_customer_id TEXT;