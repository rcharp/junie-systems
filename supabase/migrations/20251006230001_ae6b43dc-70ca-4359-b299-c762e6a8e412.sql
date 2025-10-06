-- Create table to map ElevenLabs conversation IDs to Twilio call SIDs
CREATE TABLE IF NOT EXISTS public.conversation_call_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL UNIQUE,
  call_sid TEXT NOT NULL,
  business_id UUID,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.conversation_call_mapping ENABLE ROW LEVEL SECURITY;

-- Allow service role to access
CREATE POLICY "Service role can manage conversation mappings"
  ON public.conversation_call_mapping
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_conversation_call_mapping_conversation_id 
  ON public.conversation_call_mapping(conversation_id);

CREATE INDEX idx_conversation_call_mapping_call_sid 
  ON public.conversation_call_mapping(call_sid);