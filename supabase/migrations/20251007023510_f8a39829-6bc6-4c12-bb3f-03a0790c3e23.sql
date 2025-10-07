-- Complete security fix for appointments table - Create all necessary functions and protections

-- 1. Create validation function to prevent cross-user data access
CREATE OR REPLACE FUNCTION public.validate_appointment_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure user_id is not null
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Appointment must have a valid user_id';
  END IF;
  
  -- Verify the user_id exists in auth.users (only if not service role)
  IF auth.role() != 'service_role' THEN
    IF NOT EXISTS (
      SELECT 1 FROM auth.users WHERE id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Invalid user_id: user does not exist';
    END IF;
    
    -- Ensure the user_id matches the authenticated user (prevent creating appointments for others)
    IF auth.uid() != NEW.user_id THEN
      RAISE EXCEPTION 'Cannot create/update appointments for other users';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create triggers for INSERT and UPDATE validation
DROP TRIGGER IF EXISTS validate_appointment_user_insert ON public.appointments;
CREATE TRIGGER validate_appointment_user_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_user();

DROP TRIGGER IF EXISTS validate_appointment_user_update ON public.appointments;
CREATE TRIGGER validate_appointment_user_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_user();

-- 3. Add restrictive RLS policy to block anonymous access
DROP POLICY IF EXISTS "Block anonymous access to appointments" ON public.appointments;
CREATE POLICY "Block anonymous access to appointments"
  ON public.appointments
  AS RESTRICTIVE
  FOR ALL
  USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- 4. Ensure user_id column is NOT NULL at database level
ALTER TABLE public.appointments 
  ALTER COLUMN user_id SET NOT NULL;

-- 5. Add performance index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);

-- 6. Add comments to mark PII fields
COMMENT ON COLUMN public.appointments.phone_number IS 'PII: Customer phone number - highly sensitive';
COMMENT ON COLUMN public.appointments.email IS 'PII: Customer email - highly sensitive';
COMMENT ON COLUMN public.appointments.caller_name IS 'PII: Customer name - highly sensitive';