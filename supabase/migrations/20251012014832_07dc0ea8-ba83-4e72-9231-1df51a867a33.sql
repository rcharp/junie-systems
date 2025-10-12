-- Fix appointments table RLS policies to prevent unauthorized access to customer data
-- Remove overly permissive service_role exceptions and ensure proper user ownership validation

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Block anonymous access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Restrict appointments access to owners and service role only" ON public.appointments;

-- Create improved policies that properly validate ownership
-- Service role can only INSERT appointments (for edge functions creating appointments on behalf of users)
-- All other operations require user ownership verification
CREATE POLICY "Service role can insert appointments only"
ON public.appointments
FOR INSERT
TO service_role
WITH CHECK (
  user_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM auth.users WHERE id = user_id)
);

-- Ensure all SELECT, UPDATE, DELETE operations validate user ownership (no service_role bypass)
CREATE POLICY "Authenticated users must own appointments to access"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users must own appointments to update"
ON public.appointments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users must own appointments to delete"
ON public.appointments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);