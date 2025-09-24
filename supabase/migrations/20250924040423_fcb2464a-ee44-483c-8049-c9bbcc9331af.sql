-- Fix the audit trigger to handle service role operations
-- The issue is that auth.uid() returns null when called from edge functions with service role
-- We need to modify the audit function to skip auditing when auth.uid() is null (service role operations)

CREATE OR REPLACE FUNCTION public.audit_appointments_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only log access if we have a valid user id (skip service role operations)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.user_activity (
            user_id,
            activity_type,
            activity_data
        ) VALUES (
            auth.uid(),
            'appointments_access',
            jsonb_build_object(
                'appointment_id', COALESCE(NEW.id, OLD.id),
                'operation', TG_OP,
                'timestamp', now()
            )
        );
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$function$;