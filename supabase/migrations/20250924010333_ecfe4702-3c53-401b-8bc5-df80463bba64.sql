-- Add call_summary column to call_logs table if it doesn't exist
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS call_summary text;