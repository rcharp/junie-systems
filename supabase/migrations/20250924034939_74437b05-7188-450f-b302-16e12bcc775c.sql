-- Check and enable pgcrypto extension in the correct schema
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- Create a simpler base64 encoding function for now
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

  -- For now, use base64 encoding with a salt prefix as a basic obfuscation
  -- In production, this should use proper encryption
  RETURN encode(('encrypted_' || token || '_' || extract(epoch from now())::text)::bytea, 'base64');
END;
$function$;

-- Update decrypt function to match
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  actual_encrypted_data text;
  json_data jsonb;
  clean_data text;
  decoded_data text;
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if the encrypted_token is in JSON format (from the old storage)
  BEGIN
    json_data := encrypted_token::jsonb;
    -- If it's JSON, extract the data field
    actual_encrypted_data := json_data->>'data';
  EXCEPTION
    WHEN OTHERS THEN
      -- If it's not JSON, use it directly
      actual_encrypted_data := encrypted_token;
  END;
  
  IF actual_encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove newlines and spaces from base64 data
  clean_data := replace(replace(actual_encrypted_data, E'\n', ''), ' ', '');
  
  -- Decode the base64 data
  BEGIN
    decoded_data := convert_from(decode(clean_data, 'base64'), 'UTF8');
    
    -- Remove our prefix and suffix to extract the original token
    IF decoded_data LIKE 'encrypted_%' THEN
      -- Extract the token between 'encrypted_' and the last '_'
      decoded_data := substring(decoded_data from 11 for position('_' in reverse(decoded_data)) - 1);
      -- Remove the timestamp suffix
      decoded_data := reverse(substring(reverse(decoded_data) from position('_' in reverse(decoded_data)) + 1));
      RETURN decoded_data;
    END IF;
    
    RETURN decoded_data;
  EXCEPTION
    WHEN OTHERS THEN
      -- If decryption fails, return null
      RAISE NOTICE 'Decryption failed: %', SQLERRM;
      RETURN NULL;
  END;
END;
$function$;