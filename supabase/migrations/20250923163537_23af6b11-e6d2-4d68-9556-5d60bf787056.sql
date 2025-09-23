-- Add DELETE policy for business_data_requests table to allow admins to delete records
CREATE POLICY "Admins can delete business data requests" 
ON public.business_data_requests 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));