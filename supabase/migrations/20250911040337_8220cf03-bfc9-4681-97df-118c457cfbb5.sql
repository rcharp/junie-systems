-- Update the default appointment duration to 60 minutes (1 hour) in google_calendar_settings
ALTER TABLE google_calendar_settings 
ALTER COLUMN appointment_duration SET DEFAULT 60;