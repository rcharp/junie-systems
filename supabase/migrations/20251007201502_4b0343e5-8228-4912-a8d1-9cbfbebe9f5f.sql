-- Add foreign key column to call_messages linking to call_logs
ALTER TABLE public.call_messages
ADD COLUMN call_log_id uuid REFERENCES public.call_logs(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_call_messages_call_log_id ON public.call_messages(call_log_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN public.call_messages.call_log_id IS 'Foreign key linking to the associated call log entry';