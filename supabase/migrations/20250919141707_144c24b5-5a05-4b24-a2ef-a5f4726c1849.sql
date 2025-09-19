-- Create function to get users with business IDs for admin
CREATE OR REPLACE FUNCTION public.get_users_with_business_ids_for_admin()
 RETURNS TABLE(id uuid, email text, business_id uuid, full_name text, company_name text, created_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Only allow admin users to access this function
  SELECT 
    up.id,
    au.email,
    bs.id as business_id,
    up.full_name,
    up.company_name,
    up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN public.business_settings bs ON up.id = bs.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY up.created_at DESC;
$function$