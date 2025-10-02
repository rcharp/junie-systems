-- SECURITY HARDENING FOR call_logs TABLE
-- This migration adds explicit protection against anonymous access
-- and ensures that sensitive customer data is properly protected

-- First, ensure RLS is enabled (should already be, but explicit is better)
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with better security
DROP POLICY IF EXISTS "Business owners can view their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Business owners can update their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Business owners can delete their call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Service role and business owners can insert call logs" ON public.call_logs;

-- 1. EXPLICIT DENY for anonymous users (most restrictive, evaluated first)
-- This is a safety net to prevent any anonymous access
CREATE POLICY "Deny all anonymous access to call logs"
ON public.call_logs
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- 2. EXPLICIT REQUIRE AUTHENTICATION for authenticated users
-- This ensures only authenticated users can even attempt access
CREATE POLICY "Require authentication for call logs access"
ON public.call_logs
AS RESTRICTIVE  
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 3. Business owners can view their call logs
-- Only business owners can see their own call logs via business_settings relationship
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

-- 4. Business owners can update their call logs
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

-- 5. Business owners can delete their call logs
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

-- 6. Service role can insert call logs (for system operations)
-- Note: Service role is trusted and bypasses RLS by default, but we keep this for explicitness
CREATE POLICY "Service role can insert call logs"
ON public.call_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- 7. Business owners can insert call logs for their own business
CREATE POLICY "Business owners can insert their call logs"
ON public.call_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.business_settings bs
    WHERE bs.id = call_logs.business_id 
      AND bs.user_id = auth.uid()
  )
);

-- Add helpful comment explaining the security model
COMMENT ON TABLE public.call_logs IS 
'Contains sensitive customer data. Protected by RLS with explicit deny for anonymous users. 
Only business owners can access their own call logs. Service role can insert for system operations.';

-- Ensure audit trigger exists for INSERT/UPDATE/DELETE
-- (SELECT operations cannot be audited via triggers in PostgreSQL)
DROP TRIGGER IF EXISTS audit_call_logs_access_trigger ON public.call_logs;
CREATE TRIGGER audit_call_logs_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.call_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_call_logs_access();