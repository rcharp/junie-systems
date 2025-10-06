-- Create table to track client tool call events
CREATE TABLE public.client_tool_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  tool_call_id TEXT NOT NULL,
  parameters JSONB,
  result TEXT,
  is_error BOOLEAN DEFAULT false,
  business_id UUID,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_tool_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all events
CREATE POLICY "Admins can view all client tool events"
  ON public.client_tool_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert events
CREATE POLICY "Service role can insert client tool events"
  ON public.client_tool_events
  FOR INSERT
  WITH CHECK (true);

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_tool_events;

-- Create index for faster queries
CREATE INDEX idx_client_tool_events_created_at ON public.client_tool_events(created_at DESC);
CREATE INDEX idx_client_tool_events_call_sid ON public.client_tool_events(call_sid);