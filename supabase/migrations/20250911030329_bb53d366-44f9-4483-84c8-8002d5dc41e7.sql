-- Fix security issues with functions by setting search_path

-- Update encrypt_token function with proper search_path
CREATE OR REPLACE FUNCTION public.encrypt_token(token text)
RETURNS text AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(token, current_setting('app.encryption_key', true)), 'base64');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update decrypt_token function with proper search_path  
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token text)
RETURNS text AS $$
BEGIN
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), current_setting('app.encryption_key', true));
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update the token update function with proper search_path
CREATE OR REPLACE FUNCTION public.update_google_calendar_tokens(
  p_user_id uuid,
  p_access_token text DEFAULT NULL,
  p_refresh_token text DEFAULT NULL,
  p_expires_at timestamp with time zone DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  IF auth.uid() != p_user_id AND auth.role() != 'service_role' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the SECURITY DEFINER view with a function instead
DROP VIEW IF EXISTS public.google_calendar_tokens_view;

-- Create a secure function to get decrypted tokens instead of a view
CREATE OR REPLACE FUNCTION public.get_google_calendar_tokens(p_user_id uuid)
RETURNS TABLE (
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
) AS $$
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
    public.decrypt_token(gcs.encrypted_access_token),
    public.decrypt_token(gcs.encrypted_refresh_token)
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;