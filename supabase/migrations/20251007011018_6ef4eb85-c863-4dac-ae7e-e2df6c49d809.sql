-- Add explicit deny policy for anonymous access to user_profiles
-- This prevents any unauthenticated access to sensitive customer data
CREATE POLICY "deny_anonymous_access" 
ON public.user_profiles 
FOR ALL 
TO anon 
USING (false);

-- Add comment explaining the security measure
COMMENT ON POLICY "deny_anonymous_access" ON public.user_profiles IS 
  'Explicitly denies all anonymous access to user profiles containing Stripe customer IDs, subscription details, and personal information. This provides defense-in-depth security.';

-- Log the security improvement
DO $$
BEGIN
  RAISE NOTICE 'Security enhancement applied: user_profiles table now has explicit anonymous access denial policy';
END $$;