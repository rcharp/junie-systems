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

-- Update RLS policies to work with both user_id and business_id
DROP POLICY IF EXISTS "Users can view their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can create their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update their own call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete their own call logs" ON public.call_logs;

-- Create updated RLS policies that work with both user_id and business_id
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
);