-- Drop and recreate the function with proper security invoker
DROP FUNCTION IF EXISTS public.get_users_with_business_ids_for_admin();

CREATE OR REPLACE FUNCTION public.get_users_with_business_ids_for_admin()
 RETURNS TABLE(
   id uuid, 
   email text, 
   business_id uuid, 
   full_name text, 
   company_name text, 
   created_at timestamp with time zone, 
   subscription_plan text, 
   twilio_phone_number text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  calling_user_id uuid;
  is_admin_user boolean;
BEGIN
  -- Get the calling user's ID
  calling_user_id := auth.uid();
  
  -- Check if the calling user is an admin
  is_admin_user := public.has_role(calling_user_id, 'admin'::app_role);
  
  -- Log for debugging
  RAISE NOTICE 'Calling user ID: %, Is Admin: %', calling_user_id, is_admin_user;
  
  -- Only return data if user is admin
  IF NOT is_admin_user THEN
    RAISE EXCEPTION 'Access denied: Only admins can access this function';
  END IF;
  
  -- Return all users with their business data
  RETURN QUERY
  SELECT 
    up.id,
    au.email,
    bs.id as business_id,
    up.full_name,
    up.company_name,
    up.created_at,
    up.subscription_plan,
    bs.twilio_phone_number
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN public.business_settings bs ON up.id = bs.user_id
  ORDER BY up.created_at DESC;
END;
$$;