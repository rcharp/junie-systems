-- Drop and recreate the get_users_with_business_ids_for_admin function with trial information
DROP FUNCTION IF EXISTS public.get_users_with_business_ids_for_admin();

CREATE FUNCTION public.get_users_with_business_ids_for_admin()
RETURNS TABLE(
  id uuid,
  email text,
  business_id uuid,
  full_name text,
  company_name text,
  created_at timestamp with time zone,
  subscription_plan text,
  twilio_phone_number text,
  is_admin boolean,
  trial_ends_at timestamp with time zone,
  trial_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calling_user_id uuid;
  is_admin_user boolean;
BEGIN
  calling_user_id := auth.uid();
  is_admin_user := public.has_role(calling_user_id, 'admin'::app_role);
  
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Access denied: Only admins can access this function';
  END IF;
  
  RETURN QUERY
  SELECT 
    up.id,
    au.email::text,
    bs.id as business_id,
    up.full_name,
    up.company_name,
    up.created_at,
    up.subscription_plan,
    bs.twilio_phone_number,
    EXISTS(
      SELECT 1 
      FROM public.user_roles ur 
      WHERE ur.user_id = up.id AND ur.role = 'admin'::app_role
    ) as is_admin,
    up.trial_ends_at,
    CASE 
      WHEN up.subscription_plan != 'free' THEN 'subscribed'
      WHEN up.trial_ends_at IS NULL THEN 'no_trial'
      WHEN up.trial_ends_at > now() THEN 'active'
      ELSE 'expired'
    END as trial_status
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN public.business_settings bs ON up.id = bs.user_id
  ORDER BY up.created_at DESC;
END;
$function$;