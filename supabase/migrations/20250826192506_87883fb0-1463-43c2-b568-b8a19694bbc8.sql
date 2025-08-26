-- Add unique constraint on call_id to prevent duplicate webhook entries
ALTER TABLE public.call_logs 
ADD CONSTRAINT unique_call_id UNIQUE (call_id);