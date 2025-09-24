-- Force refresh tokens by clearing the current ones so user has to reconnect
-- This will ensure we get fresh, properly encoded tokens
UPDATE google_calendar_settings 
SET 
  encrypted_access_token = NULL,
  encrypted_refresh_token = NULL,
  is_connected = false,
  expires_at = NULL
WHERE user_id = '54b21009-f5f0-45bf-b126-d11094178719';

-- Recreate the encryption functions with proper base64 encoding
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if the token is null or empty
  IF token IS NULL OR token = '' THEN
    RETURN NULL;
  END IF;

  -- Use base64 encoding for basic obfuscation
  -- This is not true encryption but provides basic protection
  -- In production, use Supabase Vault for proper encryption
  RETURN encode(token::bytea, 'base64');
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_token(encoded_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF encoded_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove newlines and spaces from base64 data
  encoded_token := replace(replace(encoded_token, E'\n', ''), ' ', '');
  
  -- Decode from base64
  BEGIN
    RETURN convert_from(decode(encoded_token, 'base64'), 'UTF8');
  EXCEPTION
    WHEN OTHERS THEN
      -- If decoding fails, return null
      RAISE NOTICE 'Base64 decoding failed: %', SQLERRM;
      RETURN NULL;
  END;
END;
$function$;