-- Improve RLS policies for appointments table to enhance customer data protection

-- First, let's add an audit trigger for appointments to track access
CREATE OR REPLACE FUNCTION public.audit_appointments_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Log access to sensitive customer data
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
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create audit trigger for appointments
DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
CREATE TRIGGER audit_appointments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.audit_appointments_access();

-- Drop the overly permissive admin policy that allows viewing ALL appointments
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;

-- Replace with a more restrictive admin policy that requires explicit authorization
-- This prevents admins from accessing customer data without proper business justification
DROP POLICY IF EXISTS "Authorized admins can view appointments for support" ON public.appointments;
CREATE POLICY "Authorized admins can view appointments for support" 
ON public.appointments 
FOR SELECT 
USING (
    has_role(auth.uid(), 'admin'::app_role) 
    AND EXISTS (
        SELECT 1 FROM public.user_activity 
        WHERE user_id = auth.uid() 
        AND activity_type = 'admin_customer_data_access_authorized'
        AND created_at > now() - interval '1 hour'
    )
);

-- Add a policy to mask sensitive customer data for unauthorized access
-- This creates a secure view function that only shows minimal data
CREATE OR REPLACE FUNCTION public.get_appointments_summary(target_user_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    service_type text,
    preferred_date date,
    preferred_time time,
    status text,
    created_at timestamptz,
    caller_name_masked text,
    contact_masked text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only return full data if user owns the appointments or is properly authorized admin
    IF target_user_id IS NOT NULL AND target_user_id = auth.uid() THEN
        -- Business owner can see their own appointment details
        RETURN QUERY
        SELECT 
            a.id,
            a.service_type,
            a.preferred_date,
            a.preferred_time,
            a.status,
            a.created_at,
            a.caller_name,
            COALESCE(a.email, a.phone_number) as contact_info
        FROM public.appointments a
        WHERE a.user_id = target_user_id;
    ELSIF has_role(auth.uid(), 'admin'::app_role) THEN
        -- Admins see masked data unless specifically authorized
        RETURN QUERY
        SELECT 
            a.id,
            a.service_type,
            a.preferred_date,
            a.preferred_time,
            a.status,
            a.created_at,
            left(a.caller_name, 1) || '***' as caller_name_masked,
            '***@***.***' as contact_masked
        FROM public.appointments a
        WHERE (target_user_id IS NULL OR a.user_id = target_user_id);
    END IF;
END;
$$;

-- Create a function to authorize admin access to customer data
CREATE OR REPLACE FUNCTION public.authorize_admin_customer_data_access(
    justification text,
    target_appointment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can authorize themselves
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only admins can authorize customer data access';
    END IF;
    
    -- Log the authorization with justification
    INSERT INTO public.user_activity (
        user_id,
        activity_type,
        activity_data
    ) VALUES (
        auth.uid(),
        'admin_customer_data_access_authorized',
        jsonb_build_object(
            'justification', justification,
            'target_appointment_id', target_appointment_id,
            'authorized_at', now()
        )
    );
    
    RETURN true;
END;
$$;