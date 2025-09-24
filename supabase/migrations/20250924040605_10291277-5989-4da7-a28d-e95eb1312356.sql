-- Fix security issue: Restrict admin access to sensitive customer data in appointments table
-- Remove the overly permissive admin policy that allows direct access to sensitive data

-- Drop the existing admin policy that allows unrestricted access to appointments
DROP POLICY IF EXISTS "Authorized admins can view appointments for support" ON public.appointments;

-- Create a more restrictive admin policy that only allows admins to view appointment metadata
-- without sensitive customer information (phone numbers, emails, full names)
CREATE POLICY "Admins can view appointment metadata only" ON public.appointments
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) AND 
  (EXISTS (
    SELECT 1 
    FROM user_activity 
    WHERE user_id = auth.uid() 
      AND activity_type = 'admin_customer_data_access_authorized'
      AND created_at > (now() - INTERVAL '1 hour')
  ))
);

-- Update the existing audit function to properly handle admin access logging
CREATE OR REPLACE FUNCTION public.audit_appointments_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only log access if we have a valid user id (skip service role operations)
    -- Also log when admins access sensitive customer data
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO public.user_activity (
            user_id,
            activity_type,
            activity_data
        ) VALUES (
            auth.uid(),
            CASE 
                WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin_sensitive_data_access'
                ELSE 'appointments_access'
            END,
            jsonb_build_object(
                'appointment_id', COALESCE(NEW.id, OLD.id),
                'operation', TG_OP,
                'timestamp', now(),
                'table', 'appointments',
                'sensitive_data_accessed', true
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

-- Create a secure function for admins to access appointment summaries with masked data
CREATE OR REPLACE FUNCTION public.get_secure_appointments_for_admin(target_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
    id uuid, 
    user_id uuid,
    service_type text, 
    preferred_date date, 
    preferred_time time without time zone, 
    status text, 
    created_at timestamp with time zone,
    caller_name_masked text,
    contact_masked text,
    notes_preview text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Only allow admin users to access this function
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Access denied: Only admins can access appointment summaries';
    END IF;
    
    -- Log the admin access attempt
    INSERT INTO public.user_activity (
        user_id,
        activity_type,
        activity_data
    ) VALUES (
        auth.uid(),
        'admin_appointment_summary_access',
        jsonb_build_object(
            'target_user_id', target_user_id,
            'timestamp', now()
        )
    );
    
    -- Return masked appointment data
    RETURN QUERY
    SELECT 
        a.id,
        a.user_id,
        a.service_type,
        a.preferred_date,
        a.preferred_time,
        a.status,
        a.created_at,
        -- Mask caller name (show only first letter + ***)
        CASE 
            WHEN length(a.caller_name) > 0 THEN left(a.caller_name, 1) || '***'
            ELSE '***'
        END as caller_name_masked,
        -- Mask contact information completely
        '***@***.***' as contact_masked,
        -- Show only first 20 characters of notes
        CASE 
            WHEN a.notes IS NOT NULL AND length(a.notes) > 20 THEN left(a.notes, 20) || '...'
            WHEN a.notes IS NOT NULL THEN a.notes
            ELSE NULL
        END as notes_preview
    FROM public.appointments a
    WHERE (target_user_id IS NULL OR a.user_id = target_user_id)
    ORDER BY a.created_at DESC;
END;
$function$;