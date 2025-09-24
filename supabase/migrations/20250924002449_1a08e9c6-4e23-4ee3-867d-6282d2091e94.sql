-- Add missing columns to call_logs table for post-call webhook data
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS business_id UUID,
ADD COLUMN IF NOT EXISTS service_address TEXT,
ADD COLUMN IF NOT EXISTS appointment_scheduled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS appointment_date_time TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint to business_settings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_logs_business_id'
    ) THEN
        ALTER TABLE public.call_logs 
        ADD CONSTRAINT fk_call_logs_business_id 
        FOREIGN KEY (business_id) REFERENCES public.business_settings(id);
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_logs_business_id ON public.call_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON public.call_logs(user_id);

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can insert call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete call logs through business" ON public.call_logs;

-- Create new RLS policies for business_id access
CREATE POLICY "Users can view call logs through business" 
ON public.call_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert call logs through business" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update call logs through business" 
ON public.call_logs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete call logs through business" 
ON public.call_logs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
);