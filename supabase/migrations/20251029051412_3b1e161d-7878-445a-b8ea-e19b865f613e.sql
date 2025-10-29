-- Allow business owners to view their own client tool events
CREATE POLICY "Business owners can view their own client tool events"
ON public.client_tool_events
FOR SELECT
USING (
  user_id = auth.uid() 
  OR business_id IN (
    SELECT id FROM public.business_settings WHERE user_id = auth.uid()
  )
);