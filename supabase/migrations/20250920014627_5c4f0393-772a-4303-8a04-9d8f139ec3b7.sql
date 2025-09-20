-- Add admin delete policy for call_logs
CREATE POLICY "Admins can delete all call logs"
ON public.call_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));