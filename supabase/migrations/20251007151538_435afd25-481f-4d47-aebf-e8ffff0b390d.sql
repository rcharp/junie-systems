-- Drop the old decrypt_token function that relies on session variables
DROP FUNCTION IF EXISTS public.decrypt_token(text);

-- Drop the old encrypt_token function that relies on session variables
DROP FUNCTION IF EXISTS public.encrypt_token(text);

-- Create new decrypt_token function that gets encryption key from environment
CREATE OR REPLACE FUNCTION public.decrypt_token(encoded_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF encoded_token IS NULL OR encoded_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Get encryption key from Supabase edge function environment
  -- This will be set via the get_google_calendar_tokens function context
  encryption_key := current_setting('request.jwt.claims', true)::json->>'encryption_key';
  
  -- If not available in JWT claims, try to get from vault (Supabase secrets)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    -- In Supabase, we'll use a different approach - pass the key as parameter
    RAISE EXCEPTION 'Encryption key must be provided by the calling function';
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
      RAISE LOG 'Decryption failed: %', SQLERRM;
      RETURN NULL;
  END;
END;
$$;

-- Create new encrypt_token function that gets encryption key from environment
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF token IS NULL OR token = '' THEN
    RETURN NULL;
  END IF;

  -- Get encryption key from Supabase edge function environment
  encryption_key := current_setting('request.jwt.claims', true)::json->>'encryption_key';
  
  -- If not available in JWT claims, try to get from vault
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key must be provided by the calling function';
  END IF;

  -- Encrypt using AES-256 and encode as base64
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

-- Update get_google_calendar_tokens to use direct decryption with key parameter
-- Create a new version that accepts encryption key
CREATE OR REPLACE FUNCTION public.get_google_calendar_tokens_with_key(
  p_user_id uuid,
  p_encryption_key text
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  is_connected boolean,
  calendar_id text,
  timezone text,
  appointment_duration integer,
  availability_hours jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  expires_at timestamp with time zone,
  access_token text,
  refresh_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow users to access their own tokens or service role
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: can only access own tokens';
  END IF;

  RETURN QUERY
  SELECT 
    gcs.id,
    gcs.user_id,
    gcs.is_connected,
    gcs.calendar_id,
    gcs.timezone,
    gcs.appointment_duration,
    gcs.availability_hours,
    gcs.created_at,
    gcs.updated_at,
    gcs.expires_at,
    -- Decrypt tokens directly with the provided key
    CASE 
      WHEN gcs.encrypted_access_token IS NOT NULL AND gcs.encrypted_access_token != '' 
      THEN pgp_sym_decrypt(
        decode(regexp_replace(gcs.encrypted_access_token, '[\n\r\s]', '', 'g'), 'base64'),
        p_encryption_key,
        'cipher-algo=aes256'
      )::text
      ELSE NULL
    END,
    CASE 
      WHEN gcs.encrypted_refresh_token IS NOT NULL AND gcs.encrypted_refresh_token != ''
      THEN pgp_sym_decrypt(
        decode(regexp_replace(gcs.encrypted_refresh_token, '[\n\r\s]', '', 'g'), 'base64'),
        p_encryption_key,
        'cipher-algo=aes256'
      )::text
      ELSE NULL
    END
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = p_user_id;
END;
$$;