-- Add issue_details column to appointments table
ALTER TABLE appointments ADD COLUMN issue_details text;

-- Drop issue_details column from call_logs table
ALTER TABLE call_logs DROP COLUMN issue_details;