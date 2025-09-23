-- Fix the decrypt_token function to handle multiline base64 data
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  actual_encrypted_data text;
  json_data jsonb;
  clean_base64 text;
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
  
  -- Remove newlines and whitespace from base64 data
  clean_base64 := regexp_replace(actual_encrypted_data, '\s', '', 'g');
  
  RETURN pgp_sym_decrypt(decode(clean_base64, 'base64'), 'secure_encryption_key_2024');
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return null
    RETURN NULL;
END;
$function$;