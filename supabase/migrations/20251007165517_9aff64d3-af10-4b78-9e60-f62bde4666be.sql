-- Add admin access policies to call_logs table
-- This allows admin users to view, update, and delete all call logs

-- Policy: Admins can view all call logs
CREATE POLICY "Admins can view all call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can update all call logs
CREATE POLICY "Admins can update all call logs"
ON public.call_logs
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can delete all call logs
CREATE POLICY "Admins can delete all call logs"
ON public.call_logs
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admins can insert call logs
CREATE POLICY "Admins can insert call logs"
ON public.call_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));