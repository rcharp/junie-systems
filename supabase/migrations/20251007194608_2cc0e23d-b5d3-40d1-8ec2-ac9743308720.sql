-- Rename caller_id to incoming_call_phone_number in all tables
ALTER TABLE public.call_logs 
RENAME COLUMN caller_id TO incoming_call_phone_number;

ALTER TABLE public.call_messages 
RENAME COLUMN caller_id TO incoming_call_phone_number;

ALTER TABLE public.conversation_call_mapping 
RENAME COLUMN caller_id TO incoming_call_phone_number;

-- Update index name for call_logs
DROP INDEX IF EXISTS idx_call_logs_caller_id;
CREATE INDEX IF NOT EXISTS idx_call_logs_incoming_call_phone_number ON public.call_logs(incoming_call_phone_number);

-- Update index name for call_messages
DROP INDEX IF EXISTS idx_call_messages_caller_id;
CREATE INDEX IF NOT EXISTS idx_call_messages_incoming_call_phone_number ON public.call_messages(incoming_call_phone_number);