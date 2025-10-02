-- Fix RLS on google_calendar_settings_safe view
-- This view is based on google_calendar_settings and should inherit its security model

-- First, ensure the view uses security_invoker (should already be set, but let's be explicit)
DROP VIEW IF EXISTS public.google_calendar_settings_safe;

CREATE VIEW public.google_calendar_settings_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  is_connected,
  calendar_id,
  timezone,
  appointment_duration,
  availability_hours,
  created_at,
  updated_at,
  expires_at
FROM public.google_calendar_settings;

-- Enable RLS on the view (even though it inherits from base table, make it explicit)
ALTER VIEW public.google_calendar_settings_safe SET (security_invoker = true);

-- Grant access to authenticated users only
REVOKE ALL ON public.google_calendar_settings_safe FROM PUBLIC;
REVOKE ALL ON public.google_calendar_settings_safe FROM anon;
GRANT SELECT ON public.google_calendar_settings_safe TO authenticated;

-- Add comprehensive comment explaining the security model
COMMENT ON VIEW public.google_calendar_settings_safe IS 
'Secure view of Google Calendar settings that excludes encrypted token columns. 
This view inherits RLS policies from the base google_calendar_settings table via security_invoker=true.
Users can only view their own calendar settings (user_id = auth.uid()).
Sensitive encrypted_access_token and encrypted_refresh_token columns are excluded and only accessible server-side via get_google_calendar_tokens() function.
Access is restricted to authenticated users only - anonymous access is explicitly denied.';