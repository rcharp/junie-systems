-- Fix the encrypt_token function to return just the encrypted string
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Use a fixed encryption key for this demo - in production, use environment variable
  RETURN encode(pgp_sym_encrypt(token, 'secure_encryption_key_2024'), 'base64');
EXCEPTION
  WHEN OTHERS THEN
    -- If encryption fails, return null to prevent storing plain text
    RETURN NULL;
END;
$function$;

-- Fix the decrypt_token function to handle the JSON format stored in the database
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  actual_encrypted_data text;
  json_data jsonb;
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
  
  RETURN pgp_sym_decrypt(decode(actual_encrypted_data, 'base64'), 'secure_encryption_key_2024');
EXCEPTION
  WHEN OTHERS THEN
    -- If decryption fails, return null
    RETURN NULL;
END;
$function$;