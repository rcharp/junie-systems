-- Add issue_details column to call_logs table
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS issue_details text;

COMMENT ON COLUMN public.call_logs.issue_details IS 'Specific details about the issue mentioned by the caller during the call';