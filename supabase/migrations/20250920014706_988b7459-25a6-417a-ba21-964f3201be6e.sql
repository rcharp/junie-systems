-- Add service role delete policy for call_logs (for admin dashboard access)
CREATE POLICY "Service role can delete call logs"
ON public.call_logs
FOR DELETE
USING (true);