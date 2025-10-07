-- Add caller_id column to conversation_call_mapping table
ALTER TABLE public.conversation_call_mapping 
ADD COLUMN IF NOT EXISTS caller_id text;