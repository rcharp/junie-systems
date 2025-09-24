-- Fix the problematic RLS policy on appointments table
-- The current "Block direct admin access" policy has a logic flaw that could allow unauthorized access

-- Drop the problematic policy
DROP POLICY IF EXISTS "Block direct admin access to appointments" ON public.appointments;

-- Create a proper restrictive policy that only allows:
-- 1. Users to access their own appointments  
-- 2. Service role for system operations
-- 3. Admins to access via secure functions only (not direct table access)
CREATE POLICY "Restrict appointments access to owners and service role only" 
ON public.appointments 
FOR ALL 
USING (
  -- Only allow access if user owns the appointment OR it's service role
  (auth.uid() = user_id) OR (auth.role() = 'service_role'::text)
)
WITH CHECK (
  -- For inserts/updates, ensure user owns the appointment OR it's service role
  (auth.uid() = user_id) OR (auth.role() = 'service_role'::text)
);

-- Ensure admins can only access customer data through secure functions
-- This prevents direct table access and requires proper authorization/logging
COMMENT ON POLICY "Restrict appointments access to owners and service role only" ON public.appointments 
IS 'Prevents unauthorized access to sensitive customer data. Admins must use secure functions like get_secure_appointments_for_admin() for audited access.';