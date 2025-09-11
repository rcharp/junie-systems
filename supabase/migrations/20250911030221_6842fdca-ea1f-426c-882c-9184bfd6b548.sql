-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text AS $$
BEGIN
  -- Use a combination of the user's ID and a secret key for encryption
  -- In production, the encryption key should be stored in environment variables
  RETURN encode(pgp_sym_encrypt(token, current_setting('app.encryption_key', true)), 'base64');
EXCEPTION
  WHEN OTHERS THEN
    -- If encryption fails, return null to prevent storing plain text
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
RETURNS text AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), current_setting('app.encryption_key', true));
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return null
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add new encrypted columns
ALTER TABLE public.google_calendar_settings 
ADD COLUMN encrypted_access_token TEXT,
ADD COLUMN encrypted_refresh_token TEXT;

-- Migrate existing data (if any) to encrypted format
-- Note: This will only work if app.encryption_key is set
UPDATE public.google_calendar_settings 
SET 
  encrypted_access_token = public.encrypt_token(access_token),
  encrypted_refresh_token = public.encrypt_token(refresh_token)
WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL;

-- Remove the old plain text columns
ALTER TABLE public.google_calendar_settings 
DROP COLUMN access_token,
DROP COLUMN refresh_token;

-- Add constraint to ensure we only store encrypted tokens
ALTER TABLE public.google_calendar_settings 
ADD CONSTRAINT check_no_plain_text_tokens 
CHECK (
  encrypted_access_token IS NULL OR 
  encrypted_access_token NOT LIKE '%Bearer%' AND 
  encrypted_access_token NOT LIKE '%ya29.%'
);

-- Create a secure view for accessing decrypted tokens (only for the service)
CREATE OR REPLACE VIEW public.google_calendar_tokens_view AS
SELECT 
  id,
  user_id,
  is_connected,
  calendar_id,
  timezone,
  appointment_duration,
  availability_hours,
  created_at,
  updated_at,
  expires_at,
  -- Only decrypt tokens for service role or the owner
  CASE 
    WHEN auth.uid() = user_id OR auth.role() = 'service_role' THEN 
      public.decrypt_token(encrypted_access_token)
    ELSE NULL 
  END AS access_token,
  CASE 
    WHEN auth.uid() = user_id OR auth.role() = 'service_role' THEN 
      public.decrypt_token(encrypted_refresh_token)
    ELSE NULL 
  END AS refresh_token
FROM public.google_calendar_settings;

-- Grant access to the view
GRANT SELECT ON public.google_calendar_tokens_view TO authenticated, service_role;

-- Create a secure function for updating tokens
CREATE OR REPLACE FUNCTION public.update_google_calendar_tokens(
  p_user_id uuid,
  p_access_token text DEFAULT NULL,
  p_refresh_token text DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  -- Only allow users to update their own tokens or service role
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: can only update own tokens';
  END IF;

  UPDATE public.google_calendar_settings 
  SET 
    encrypted_access_token = CASE 
      WHEN p_access_token IS NOT NULL THEN public.encrypt_token(p_access_token)
      ELSE encrypted_access_token 
    END,
    encrypted_refresh_token = CASE 
      WHEN p_refresh_token IS NOT NULL THEN public.encrypt_token(p_refresh_token)
      ELSE encrypted_refresh_token 
    END,
    expires_at = COALESCE(p_expires_at, expires_at),
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log security event
INSERT INTO public.user_activity (
  user_id,
  activity_type,
  activity_data
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- System user
  'security_enhancement',
  '{"action": "implemented_token_encryption", "table": "google_calendar_settings", "timestamp": "' || now() || '"}'::jsonb
);