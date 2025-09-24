-- Clear corrupted Google Calendar tokens and reset connections
UPDATE google_calendar_settings 
SET 
  encrypted_access_token = NULL,
  encrypted_refresh_token = NULL,
  is_connected = false,
  expires_at = NULL
WHERE encrypted_access_token::text LIKE '%"data":null%' 
   OR encrypted_refresh_token::text LIKE '%"data":null%';