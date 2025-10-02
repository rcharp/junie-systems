-- Enable Stripe test mode
UPDATE system_settings 
SET setting_value = 'true'::jsonb 
WHERE setting_key = 'stripe_sandbox_mode';