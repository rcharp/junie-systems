-- Add DELETE policy for business_data_requests table to allow admins to delete records
CREATE POLICY "Admins can delete business data requests" 
ON business_data_requests 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));