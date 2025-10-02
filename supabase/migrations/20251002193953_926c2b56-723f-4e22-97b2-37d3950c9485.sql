-- Disable Stripe sandbox mode to use live price IDs
UPDATE system_settings 
SET setting_value = 'false'::jsonb 
WHERE setting_key = 'stripe_sandbox_mode';