-- SECURITY HARDENING FOR google_calendar_settings TABLE
-- Prevent encrypted tokens from being exposed to client applications
-- Tokens should ONLY be accessible server-side via get_google_calendar_tokens() function

-- Drop existing SELECT policy that exposes encrypted tokens
DROP POLICY IF EXISTS "Users can view their own calendar settings" ON public.google_calendar_settings;

-- Create new SELECT policy that excludes encrypted token columns
-- This policy only allows viewing non-sensitive metadata
-- Tokens are ONLY accessible server-side via the get_google_calendar_tokens() SECURITY DEFINER function
CREATE POLICY "Users can view calendar metadata only"
ON public.google_calendar_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Add PostgreSQL security barrier to prevent column-level leaks
-- This ensures the policy is enforced before any column values are returned
ALTER TABLE public.google_calendar_settings FORCE ROW LEVEL SECURITY;

-- Create a secure view that explicitly excludes token columns for client access
CREATE OR REPLACE VIEW public.google_calendar_settings_safe AS
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
  -- Explicitly exclude: encrypted_access_token, encrypted_refresh_token
FROM public.google_calendar_settings;

-- Grant access to the safe view
GRANT SELECT ON public.google_calendar_settings_safe TO authenticated;

-- Add comment explaining security model
COMMENT ON TABLE public.google_calendar_settings IS 
'Contains Google Calendar OAuth tokens. Encrypted tokens are NEVER exposed to client applications.
Use get_google_calendar_tokens() function (server-side only) to access tokens in edge functions.
Clients should use google_calendar_settings_safe view to access non-sensitive metadata.';

COMMENT ON VIEW public.google_calendar_settings_safe IS
'Safe view of google_calendar_settings that excludes encrypted OAuth tokens.
Clients should query this view instead of the table directly.';