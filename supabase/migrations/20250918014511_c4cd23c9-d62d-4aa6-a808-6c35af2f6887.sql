-- Add policy to allow service role to insert call logs (for webhook processing)
CREATE POLICY "Service role can insert call logs" 
ON public.call_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Add policy to allow service role to update call logs (for webhook processing)
CREATE POLICY "Service role can update call logs" 
ON public.call_logs 
FOR UPDATE 
TO service_role
USING (true);