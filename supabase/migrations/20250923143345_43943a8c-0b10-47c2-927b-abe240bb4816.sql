-- Clean up duplicate Google Calendar settings records
-- Keep only the most recent record for each user

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

-- Show how many records remain
SELECT user_id, COUNT(*) as record_count 
FROM google_calendar_settings 
GROUP BY user_id
ORDER BY user_id;