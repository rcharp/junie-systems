-- Drop ALL existing RLS policies on call_logs (old and potentially new)
DROP POLICY IF EXISTS "Users can view call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can delete call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can insert call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can create call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Business owners can view their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Business owners can delete their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Business owners can update their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role and business owners can insert call logs" ON public.call_logs;

-- Create simplified, more secure RLS policies
-- SELECT: Only business owners can view their call logs
CREATE POLICY "Business owners can view their call logs"
ON public.call_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.business_settings bs
    WHERE bs.id = call_logs.business_id
      AND bs.user_id = auth.uid()
  )
);

-- INSERT: Only service role and business owners can insert call logs
CREATE POLICY "Service role and business owners can insert call logs"
ON public.call_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'service_role' OR
  EXISTS (
    SELECT 1
    FROM public.business_settings bs
    WHERE bs.id = call_logs.business_id
      AND bs.user_id = auth.uid()
  )
);

-- UPDATE: Only business owners can update their call logs
CREATE POLICY "Business owners can update their call logs"
ON public.call_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.business_settings bs
    WHERE bs.id = call_logs.business_id
      AND bs.user_id = auth.uid()
  )
);

-- DELETE: Only business owners can delete their call logs
CREATE POLICY "Business owners can delete their call logs"
ON public.call_logs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.business_settings bs
    WHERE bs.id = call_logs.business_id
      AND bs.user_id = auth.uid()
  )
);

-- Enhance the audit trigger to fire on UPDATE and DELETE
DROP TRIGGER IF EXISTS audit_call_logs_access_trigger ON public.call_logs;
CREATE TRIGGER audit_call_logs_access_trigger
  AFTER UPDATE OR DELETE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_call_logs_access();

-- Create a secure function for admin access with mandatory audit logging
CREATE OR REPLACE FUNCTION public.get_call_logs_for_admin(
  target_business_id uuid DEFAULT NULL,
  justification text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  business_id uuid,
  caller_name text,
  phone_number text,
  email text,
  call_type text,
  urgency_level text,
  call_status text,
  call_duration integer,
  created_at timestamp with time zone,
  message_preview text,
  transcript_preview text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Only admins can access this function';
  END IF;
  
  IF justification IS NULL OR length(trim(justification)) < 10 THEN
    RAISE EXCEPTION 'Justification required: Must provide reason for accessing customer data (min 10 characters)';
  END IF;
  
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    sensitive_data_accessed,
    justification,
    ip_address
  ) VALUES (
    auth.uid(),
    'admin_call_logs_access',
    'call_logs',
    target_business_id,
    true,
    justification,
    inet_client_addr()
  );
  
  RETURN QUERY
  SELECT 
    cl.id,
    cl.business_id,
    cl.caller_name,
    cl.phone_number,
    cl.email,
    cl.call_type,
    cl.urgency_level,
    cl.call_status,
    cl.call_duration,
    cl.created_at,
    CASE 
      WHEN cl.message IS NOT NULL AND length(cl.message) > 50 
      THEN left(cl.message, 50) || '...'
      ELSE cl.message
    END as message_preview,
    CASE 
      WHEN cl.transcript IS NOT NULL AND length(cl.transcript) > 100 
      THEN left(cl.transcript, 100) || '...'
      ELSE cl.transcript
    END as transcript_preview
  FROM public.call_logs cl
  WHERE (target_business_id IS NULL OR cl.business_id = target_business_id)
  ORDER BY cl.created_at DESC;
END;
$$;