-- Simplify: return encrypted tokens and decrypt in edge function
DROP FUNCTION IF EXISTS public.get_google_calendar_tokens_with_key(uuid, text);

CREATE OR REPLACE FUNCTION public.get_google_calendar_encrypted_tokens(p_user_id uuid)
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
  encrypted_access_token text,
  encrypted_refresh_token text
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
    gcs.encrypted_access_token,
    gcs.encrypted_refresh_token
  FROM public.google_calendar_settings gcs
  WHERE gcs.user_id = p_user_id;
END;
$$;