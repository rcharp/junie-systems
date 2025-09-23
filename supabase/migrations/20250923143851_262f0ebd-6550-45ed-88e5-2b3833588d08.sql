-- Clean up Google Calendar settings - delete all records and start fresh
DELETE FROM google_calendar_settings;

-- Ensure the unique constraint exists to prevent future duplicates
-- This should already exist but let's make sure
DO $$ 
BEGIN
    -- Check if constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'google_calendar_settings_user_id_unique' 
        AND table_name = 'google_calendar_settings'
    ) THEN
        ALTER TABLE google_calendar_settings 
        ADD CONSTRAINT google_calendar_settings_user_id_unique 
        UNIQUE (user_id);
    END IF;
END $$;