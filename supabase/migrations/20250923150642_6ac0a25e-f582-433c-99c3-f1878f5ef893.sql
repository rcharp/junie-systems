-- Temporarily disconnect the calendar to test fallback
UPDATE google_calendar_settings 
SET is_connected = false 
WHERE user_id = '54b21009-f5f0-45bf-b126-d11094178719';