-- Set admin account to highest subscription tier (growth) with all features
-- Admin user ID: 1566ab9f-254c-454d-9454-d6b8e4af6965

UPDATE public.user_profiles
SET 
  subscription_plan = 'growth',
  subscription_status = 'active',
  trial_ends_at = NULL  -- No trial needed for admin
WHERE id = '1566ab9f-254c-454d-9454-d6b8e4af6965';