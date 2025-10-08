-- Add appointment_notes and service_type to call_logs
ALTER TABLE call_logs 
ADD COLUMN IF NOT EXISTS appointment_notes text,
ADD COLUMN IF NOT EXISTS service_type text;

-- Add appointment_notes and service_type to call_messages
ALTER TABLE call_messages 
ADD COLUMN IF NOT EXISTS appointment_notes text,
ADD COLUMN IF NOT EXISTS service_type text;

-- Add appointment_notes column to appointments (service_type already exists)
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS appointment_notes text;