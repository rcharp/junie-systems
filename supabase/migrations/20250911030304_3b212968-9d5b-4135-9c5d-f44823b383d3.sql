-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create a function to encrypt sensitive data
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text AS $$
BEGIN
  -- Use a fixed encryption key for this demo - in production, use environment variable
  RETURN encode(pgp_sym_encrypt(token, 'secure_encryption_key_2024'), 'base64');
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
  
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), 'secure_encryption_key_2024');
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

-- Remove the old plain text columns
ALTER TABLE public.google_calendar_settings 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token;

-- Create a secure function for updating tokens
CREATE OR REPLACE FUNCTION public.update_google_calendar_tokens(
  p_user_id uuid,
  p_access_token text DEFAULT NULL,
  p_refresh_token text DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  -- Only allow users to update their own tokens
  IF auth.uid() != p_user_id THEN
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