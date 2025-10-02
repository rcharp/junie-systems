-- Drop the redundant google_calendar_settings_safe view
-- The google_calendar_settings table already has proper RLS policies
-- that restrict users to viewing only their own calendar settings
DROP VIEW IF EXISTS public.google_calendar_settings_safe;