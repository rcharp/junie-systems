-- Add is_test_call column to client_tool_events to distinguish test calls from real calls
ALTER TABLE public.client_tool_events 
ADD COLUMN is_test_call boolean NOT NULL DEFAULT false;

-- Add index for filtering by test status
CREATE INDEX idx_client_tool_events_is_test_call ON public.client_tool_events(is_test_call);

COMMENT ON COLUMN public.client_tool_events.is_test_call IS 'True for manual test calls from UI, false for actual calls from ElevenLabs';