-- Update subscription plan check constraint to match pricing structure
ALTER TABLE public.user_profiles 
DROP CONSTRAINT user_profiles_subscription_plan_check;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_subscription_plan_check 
CHECK (subscription_plan = ANY (ARRAY['free'::text, 'professional'::text, 'scale'::text, 'growth'::text]));

-- Update test@getjunie.com to scale plan
UPDATE public.user_profiles 
SET subscription_plan = 'scale'
WHERE id = '8841ab64-572c-41aa-980b-8f5065c56404';