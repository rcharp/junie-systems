-- Update rickycharpentier@gmail.com to scale plan based on Stripe checkout
UPDATE user_profiles 
SET 
  subscription_plan = 'scale',
  subscription_status = 'active',
  stripe_subscription_id = 'sub_1SDr4lC6VxOVUbRGPeikgxmV'
WHERE id = '29258098-8ef4-4351-be3b-40b700e36bed';