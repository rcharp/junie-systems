-- First, drop the old check constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_subscription_plan_check;

-- Add new check constraint with updated plan names
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_subscription_plan_check 
CHECK (subscription_plan IN ('free', 'starter', 'growth', 'enterprise'));

-- Now update existing subscription plans to new naming convention
UPDATE user_profiles
SET subscription_plan = CASE subscription_plan
  WHEN 'professional' THEN 'starter'
  WHEN 'scale' THEN 'growth'
  ELSE subscription_plan
END
WHERE subscription_plan IN ('professional', 'scale');