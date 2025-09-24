-- Ensure user_id column exists and has proper foreign key constraint
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add foreign key constraint for user_id to auth.users
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_call_logs_user_id'
    ) THEN
        ALTER TABLE public.call_logs 
        ADD CONSTRAINT fk_call_logs_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop ALL existing policies on call_logs
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can create their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can insert call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete call logs through business" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can insert call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Admins can view all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Admins can delete all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role can insert call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role can update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role can delete call logs" ON public.call_logs;

-- Create new comprehensive RLS policies
CREATE POLICY "Users can view call logs" 
ON public.call_logs 
FOR SELECT 
USING (
  -- Allow if user owns the log directly
  auth.uid() = user_id 
  OR 
  -- Allow if user owns the business
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
  OR
  -- Allow admins to view all
  public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert call logs" 
ON public.call_logs 
FOR INSERT 
WITH CHECK (
  -- Allow if user owns the log directly
  auth.uid() = user_id 
  OR 
  -- Allow if user owns the business
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update call logs" 
ON public.call_logs 
FOR UPDATE 
USING (
  -- Allow if user owns the log directly
  auth.uid() = user_id 
  OR 
  -- Allow if user owns the business
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete call logs" 
ON public.call_logs 
FOR DELETE 
USING (
  -- Allow if user owns the log directly
  auth.uid() = user_id 
  OR 
  -- Allow if user owns the business
  EXISTS (
    SELECT 1 FROM public.business_settings bs 
    WHERE bs.id = call_logs.business_id 
    AND bs.user_id = auth.uid()
  )
  OR
  -- Allow admins to delete all
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow service role to insert/update call logs (for webhooks)
CREATE POLICY "Service role can manage call logs" 
ON public.call_logs 
FOR ALL
USING (true)
WITH CHECK (true);