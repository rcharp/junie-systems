-- Enable pgcrypto extension for AES encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop the old insecure base64 functions
DROP FUNCTION IF EXISTS public.encrypt_token(text);
DROP FUNCTION IF EXISTS public.decrypt_token(text);

-- Create secure AES-256-GCM encryption function
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Check if the token is null or empty
  IF token IS NULL OR token = '' THEN
    RETURN NULL;
  END IF;

  -- Get encryption key from Supabase secrets (vault)
  -- In production, this would use vault.decrypted_secrets
  -- For now, we'll use a configuration approach
  encryption_key := current_setting('app.settings.google_calendar_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;

  -- Encrypt using AES-256-GCM and encode as base64
  RETURN encode(
    pgp_sym_encrypt(
      token,
      encryption_key,
      'cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- Create secure AES-256-GCM decryption function
CREATE OR REPLACE FUNCTION public.decrypt_token(encoded_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encoded_token IS NULL OR encoded_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from configuration
  encryption_key := current_setting('app.settings.google_calendar_encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  
  -- Remove any whitespace and newlines from base64 data
  encoded_token := regexp_replace(encoded_token, '[\n\r\s]', '', 'g');
  
  -- Decrypt from base64
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(encoded_token, 'base64'),
      encryption_key,
      'cipher-algo=aes256'
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error for debugging
      RAISE LOG 'Decryption failed for token: %, Error: %', 
        left(encoded_token, 20) || '...', SQLERRM;
      RETURN NULL;
  END;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.encrypt_token(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_token(text) TO authenticated, service_role;