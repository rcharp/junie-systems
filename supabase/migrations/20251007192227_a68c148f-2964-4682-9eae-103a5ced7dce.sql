-- Add missing metadata column to call_messages table
ALTER TABLE public.call_messages 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- Update call_logs check constraint to include 'general' as valid call_type
ALTER TABLE public.call_logs 
DROP CONSTRAINT IF EXISTS call_logs_call_type_check;

ALTER TABLE public.call_logs 
ADD CONSTRAINT call_logs_call_type_check 
CHECK (call_type IN ('inquiry', 'appointment', 'support', 'complaint', 'emergency', 'general', 'other'));