-- Fix conversation_call_mapping RLS policy to add proper restrictions
-- Replace the unrestricted service role policy with business_id/user_id based access control

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can manage conversation mappings" ON public.conversation_call_mapping;

-- Create a more secure policy that requires business_id or user_id validation
-- Service role can only insert/update mappings for valid businesses
CREATE POLICY "Service role can insert valid conversation mappings"
ON public.conversation_call_mapping
FOR INSERT
TO service_role
WITH CHECK (
  business_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.business_settings 
    WHERE id = conversation_call_mapping.business_id
  )
);

-- Service role can read mappings for valid businesses (needed for transfer lookup)
CREATE POLICY "Service role can read conversation mappings"
ON public.conversation_call_mapping
FOR SELECT
TO service_role
USING (
  business_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.business_settings 
    WHERE id = conversation_call_mapping.business_id
  )
);

-- Service role can update only valid mappings
CREATE POLICY "Service role can update valid conversation mappings"
ON public.conversation_call_mapping
FOR UPDATE
TO service_role
USING (
  business_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.business_settings 
    WHERE id = conversation_call_mapping.business_id
  )
)
WITH CHECK (
  business_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.business_settings 
    WHERE id = conversation_call_mapping.business_id
  )
);

-- Service role can delete only valid mappings
CREATE POLICY "Service role can delete valid conversation mappings"
ON public.conversation_call_mapping
FOR DELETE
TO service_role
USING (
  business_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.business_settings 
    WHERE id = conversation_call_mapping.business_id
  )
);

-- Add policy for business owners to view their own call mappings
CREATE POLICY "Business owners can view their own call mappings"
ON public.conversation_call_mapping
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.business_settings 
    WHERE id = conversation_call_mapping.business_id 
    AND user_id = auth.uid()
  )
);

-- Add policy for admins to view all mappings (for support/debugging)
CREATE POLICY "Admins can view all conversation mappings"
ON public.conversation_call_mapping
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);