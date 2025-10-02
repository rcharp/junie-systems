-- Fix the security definer view warning by recreating without SECURITY DEFINER
-- and using proper RLS policies instead

DROP VIEW IF EXISTS public.google_calendar_settings_safe;

-- Create view without SECURITY DEFINER (uses invoker's permissions)
CREATE VIEW public.google_calendar_settings_safe AS
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

-- Enable RLS on the view
ALTER VIEW public.google_calendar_settings_safe SET (security_invoker = true);

-- Grant access to authenticated users
GRANT SELECT ON public.google_calendar_settings_safe TO authenticated;

-- Update comment
COMMENT ON VIEW public.google_calendar_settings_safe IS
'Safe view of google_calendar_settings that excludes encrypted OAuth tokens.
Uses security_invoker to enforce RLS from the underlying table.
Clients should query this view instead of the table directly.';