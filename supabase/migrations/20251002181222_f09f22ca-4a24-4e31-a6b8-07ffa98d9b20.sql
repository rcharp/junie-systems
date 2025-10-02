-- Drop and recreate get_users_with_business_ids_for_admin to include subscription_plan
DROP FUNCTION IF EXISTS public.get_users_with_business_ids_for_admin();

CREATE FUNCTION public.get_users_with_business_ids_for_admin()
RETURNS TABLE(
  id uuid,
  email text,
  business_id uuid,
  full_name text,
  company_name text,
  created_at timestamp with time zone,
  subscription_plan text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    up.id,
    au.email,
    bs.id as business_id,
    up.full_name,
    up.company_name,
    up.created_at,
    up.subscription_plan
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN public.business_settings bs ON up.id = bs.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY up.created_at DESC;
$$;