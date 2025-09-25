-- Fix the decrypt_token function to handle token decryption properly
CREATE OR REPLACE FUNCTION public.decrypt_token(encoded_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF encoded_token IS NULL OR encoded_token = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove any whitespace and newlines from base64 data
  encoded_token := trim(replace(replace(encoded_token, E'\n', ''), ' ', ''));
  
  -- Decode from base64
  BEGIN
    RETURN convert_from(decode(encoded_token, 'base64'), 'UTF8');
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error for debugging
      RAISE LOG 'Base64 decoding failed for token: %, Error: %', 
        left(encoded_token, 20) || '...', SQLERRM;
      RETURN NULL;
  END;
END;
$function$;