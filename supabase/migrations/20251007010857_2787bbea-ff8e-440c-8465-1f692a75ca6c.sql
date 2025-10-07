-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can insert call logs" ON public.call_logs;

-- Create a more restrictive policy that validates the data being inserted
CREATE POLICY "Service role can insert validated call logs" 
ON public.call_logs 
FOR INSERT 
TO service_role
WITH CHECK (
  -- Ensure business_id references a valid business
  business_id IN (SELECT id FROM public.business_settings)
  -- Ensure required fields are present and not empty
  AND caller_name IS NOT NULL 
  AND length(trim(caller_name)) > 0
  AND phone_number IS NOT NULL 
  AND length(trim(phone_number)) >= 10
  AND message IS NOT NULL
  AND urgency_level IN ('low', 'medium', 'high', 'emergency')
  AND call_type IN ('inquiry', 'appointment', 'support', 'complaint', 'emergency', 'other')
  AND call_status IN ('completed', 'missed', 'voicemail', 'in_progress', 'transferred')
  -- Validate call_duration is reasonable (max 2 hours = 7200 seconds)
  AND (call_duration IS NULL OR (call_duration >= 0 AND call_duration <= 7200))
  -- Validate email format if provided
  AND (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add database constraints for additional security
ALTER TABLE public.call_logs 
  DROP CONSTRAINT IF EXISTS call_logs_call_duration_check,
  ADD CONSTRAINT call_logs_call_duration_check 
    CHECK (call_duration IS NULL OR (call_duration >= 0 AND call_duration <= 7200));

ALTER TABLE public.call_logs 
  DROP CONSTRAINT IF EXISTS call_logs_urgency_level_check,
  ADD CONSTRAINT call_logs_urgency_level_check 
    CHECK (urgency_level IN ('low', 'medium', 'high', 'emergency'));

ALTER TABLE public.call_logs 
  DROP CONSTRAINT IF EXISTS call_logs_call_type_check,
  ADD CONSTRAINT call_logs_call_type_check 
    CHECK (call_type IN ('inquiry', 'appointment', 'support', 'complaint', 'emergency', 'other'));

ALTER TABLE public.call_logs 
  DROP CONSTRAINT IF EXISTS call_logs_call_status_check,
  ADD CONSTRAINT call_logs_call_status_check 
    CHECK (call_status IN ('completed', 'missed', 'voicemail', 'in_progress', 'transferred'));

-- Add comment explaining the security measures
COMMENT ON POLICY "Service role can insert validated call logs" ON public.call_logs IS 
  'Restricts service role inserts to validated data only. Ensures business_id exists, required fields are present, and values are within acceptable ranges to prevent malicious data injection.';

-- Log this security improvement
DO $$
BEGIN
  RAISE NOTICE 'Security enhancement applied: call_logs table now has strict validation policies to prevent unauthorized data injection';
END $$;