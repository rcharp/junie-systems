-- Add duration_ms column to client_tool_events table
ALTER TABLE client_tool_events ADD COLUMN IF NOT EXISTS duration_ms integer;