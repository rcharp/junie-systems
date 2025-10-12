-- Remove service_role INSERT permission from appointments table
-- This prevents potential attacks where compromised edge functions could insert
-- appointments with arbitrary user_ids and expose customer contact information
-- All appointment creation must now go through authenticated users only

-- Drop the overly permissive service_role INSERT policy
DROP POLICY IF EXISTS "Service role can insert appointments only" ON public.appointments;

-- Ensure the user INSERT policy exists and is properly configured
-- This policy already exists but we're being explicit about the requirements
DROP POLICY IF EXISTS "Users can create appointments" ON public.appointments;

CREATE POLICY "Authenticated users can only create their own appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND user_id IS NOT NULL
  AND caller_name IS NOT NULL
  AND phone_number IS NOT NULL
  AND length(trim(caller_name)) > 0
  AND length(trim(phone_number)) >= 10
  AND service_type IS NOT NULL
  AND preferred_date IS NOT NULL
  AND preferred_time IS NOT NULL
);