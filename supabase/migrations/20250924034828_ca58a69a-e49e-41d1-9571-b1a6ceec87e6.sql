-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update the encrypt_token function to handle the case where pgcrypto might not be available
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

  -- Try to encrypt the token
  BEGIN
    RETURN encode(pgp_sym_encrypt(token, 'secure_encryption_key_2024'), 'base64');
  EXCEPTION
    WHEN OTHERS THEN
      -- If encryption fails, log the error and return null to prevent storing plain text
      RAISE NOTICE 'Encryption failed: %', SQLERRM;
      RETURN NULL;
  END;
END;
$function$;