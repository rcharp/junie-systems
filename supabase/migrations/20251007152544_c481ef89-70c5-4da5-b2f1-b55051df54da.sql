-- Fix pgp_sym_decrypt to use correct 2-parameter signature
DROP FUNCTION IF EXISTS public.get_google_calendar_tokens_with_key(uuid, text);

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
SET search_path = public
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
    -- Decrypt tokens using 2-parameter pgp_sym_decrypt
    CASE 
      WHEN gcs.encrypted_access_token IS NOT NULL AND gcs.encrypted_access_token != '' 
      THEN convert_from(
        pgp_sym_decrypt(
          decode(regexp_replace(gcs.encrypted_access_token, '[\n\r\s]', '', 'g'), 'base64'),
          p_encryption_key
        ),
        'UTF8'
      )
      ELSE NULL
    END,
    CASE 
      WHEN gcs.encrypted_refresh_token IS NOT NULL AND gcs.encrypted_refresh_token != ''
      THEN convert_from(
        pgp_sym_decrypt(
          decode(regexp_replace(gcs.encrypted_refresh_token, '[\n\r\s]', '', 'g'), 'base64'),
          p_encryption_key
        ),
        'UTF8'
      )
      ELSE NULL
    END
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = p_user_id;
END;
$$;