-- Add Stripe fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id 
ON public.user_profiles(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription_id 
ON public.user_profiles(stripe_subscription_id);