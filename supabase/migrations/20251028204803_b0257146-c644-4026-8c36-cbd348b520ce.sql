-- Create appointment sync queue table
CREATE TABLE IF NOT EXISTS public.appointment_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_settings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Appointment details (required fields)
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  appointment_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  service_address TEXT NOT NULL,
  
  -- Optional fields
  customer_email TEXT,
  service_type TEXT,
  additional_notes TEXT,
  
  -- Sync status
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- Results
  calendar_event_id TEXT,
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient queue processing
CREATE INDEX idx_appointment_sync_queue_status ON public.appointment_sync_queue(sync_status, next_retry_at);
CREATE INDEX idx_appointment_sync_queue_user ON public.appointment_sync_queue(user_id);
CREATE INDEX idx_appointment_sync_queue_business ON public.appointment_sync_queue(business_id);

-- Enable RLS
ALTER TABLE public.appointment_sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins have full access to appointment_sync_queue"
  ON public.appointment_sync_queue
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business owners can view their own sync queue"
  ON public.appointment_sync_queue
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.business_settings bs
      WHERE bs.id = appointment_sync_queue.business_id 
      AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage sync queue"
  ON public.appointment_sync_queue
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_appointment_sync_queue_updated_at
  BEFORE UPDATE ON public.appointment_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();