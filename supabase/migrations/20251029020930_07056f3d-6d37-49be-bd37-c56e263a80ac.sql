-- Ensure admins have full access to business_data_requests
DROP POLICY IF EXISTS "Admins can delete business data requests" ON public.business_data_requests;
DROP POLICY IF EXISTS "Admins can view all business data requests" ON public.business_data_requests;

CREATE POLICY "Admins have full access to business_data_requests"
ON public.business_data_requests
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Ensure admins have full access to security_audit_log (including UPDATE and DELETE)
-- Note: This allows admins to modify audit logs - consider if this is appropriate for your security model
CREATE POLICY "Admins have full access to security_audit_log"
ON public.security_audit_log
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));