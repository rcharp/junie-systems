-- Fix user_profiles RLS policies to prevent unauthorized access to sensitive data
-- This migration ensures users can only view their own profile data

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins have full access to user_profiles" ON public.user_profiles;

-- Create secure policies that properly restrict access

-- 1. Block all anonymous access (must be authenticated)
CREATE POLICY "Require authentication for user_profiles"
ON public.user_profiles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL);

-- 2. Users can only SELECT their own profile
CREATE POLICY "Users can view only their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Users can INSERT their own profile
CREATE POLICY "Users can create only their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 4. Users can UPDATE their own profile
CREATE POLICY "Users can update only their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Users can DELETE their own profile
CREATE POLICY "Users can delete only their own profile"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 6. Admins have full access to all profiles
CREATE POLICY "Admins have full access to all user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));