-- Add issue_details column to appointment_sync_queue table
ALTER TABLE appointment_sync_queue ADD COLUMN IF NOT EXISTS issue_details text;