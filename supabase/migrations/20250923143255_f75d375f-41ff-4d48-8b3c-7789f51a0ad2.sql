-- Clean up duplicate Google Calendar settings
-- First, create a temporary table with the latest record for each user
CREATE TEMP TABLE latest_calendar_settings AS
SELECT DISTINCT ON (user_id) 
  id, user_id, created_at
FROM google_calendar_settings
ORDER BY user_id, created_at DESC;

-- Delete all records except the latest ones
DELETE FROM google_calendar_settings 
WHERE id NOT IN (
  SELECT id FROM latest_calendar_settings
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE google_calendar_settings 
ADD CONSTRAINT google_calendar_settings_user_id_unique 
UNIQUE (user_id);