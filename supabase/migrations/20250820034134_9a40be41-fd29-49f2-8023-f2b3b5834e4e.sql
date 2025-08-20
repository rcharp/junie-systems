-- Create tables for AI call answering service
-- Update existing call_logs table structure if needed and create call_messages table

-- First, let's check if call_messages table exists and create it if not
CREATE TABLE IF NOT EXISTS public.call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  call_id TEXT,
  caller_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'medium',
  best_time_to_call TEXT,
  call_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'new'
);

-- Add missing columns to call_logs if they don't exist
DO $$ 
BEGIN
  -- Add columns that might be missing
  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_id TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS business_name TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS business_type TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS provider TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS metadata JSONB;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
  
  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;

  BEGIN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS call_status TEXT;
  EXCEPTION
    WHEN duplicate_column THEN NULL;
  END;
END $$;

-- Enable RLS on call_messages
ALTER TABLE public.call_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for call_messages
CREATE POLICY "Users can view their own call messages" 
ON public.call_messages 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own call messages" 
ON public.call_messages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own call messages" 
ON public.call_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own call messages" 
ON public.call_messages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_messages_user_id ON public.call_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_call_messages_created_at ON public.call_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_messages_urgency ON public.call_messages(urgency_level);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON public.call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON public.call_logs(created_at DESC);

-- Create updated_at trigger for call_messages
CREATE TRIGGER update_call_messages_updated_at
BEFORE UPDATE ON public.call_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();