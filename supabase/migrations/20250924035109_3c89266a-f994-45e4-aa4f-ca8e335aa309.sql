-- Drop and recreate the decrypt function with the correct parameter name
DROP FUNCTION IF EXISTS public.decrypt_token(text);

-- Create a simpler encryption approach that doesn't rely on pgcrypto
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
DECLARE
  actual_encoded_data text;
  json_data jsonb;
BEGIN
  IF encoded_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check if the encoded_token is in JSON format (from the old storage)
  BEGIN
    json_data := encoded_token::jsonb;
    -- If it's JSON, extract the data field
    actual_encoded_data := json_data->>'data';
  EXCEPTION
    WHEN OTHERS THEN
      -- If it's not JSON, use it directly
      actual_encoded_data := encoded_token;
  END;
  
  IF actual_encoded_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove newlines and spaces from base64 data
  actual_encoded_data := replace(replace(actual_encoded_data, E'\n', ''), ' ', '');
  
  -- Decode from base64
  BEGIN
    RETURN convert_from(decode(actual_encoded_data, 'base64'), 'UTF8');
  EXCEPTION
    WHEN OTHERS THEN
      -- If decoding fails, return null
      RAISE NOTICE 'Decoding failed: %', SQLERRM;
      RETURN NULL;
  END;
END;
$function$;