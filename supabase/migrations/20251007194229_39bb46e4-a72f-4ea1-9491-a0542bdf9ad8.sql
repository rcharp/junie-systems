-- Add caller_id column to call_logs table
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS caller_id text;

-- Add caller_id column to call_messages table
ALTER TABLE public.call_messages 
ADD COLUMN IF NOT EXISTS caller_id text;

-- Add index for faster lookups by caller_id
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id ON public.call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_messages_caller_id ON public.call_messages(caller_id);