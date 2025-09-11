-- Create a secure function to get user emails for admin dashboard
CREATE OR REPLACE FUNCTION public.get_users_with_emails_for_admin()
RETURNS TABLE(
  id uuid,
  email text,
  webhook_id uuid,
  full_name text,
  company_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admin users to access this function
  SELECT 
    up.id,
    au.email,
    up.webhook_id,
    up.full_name,
    up.company_name,
    up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON up.id = au.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY up.created_at DESC;
$$;