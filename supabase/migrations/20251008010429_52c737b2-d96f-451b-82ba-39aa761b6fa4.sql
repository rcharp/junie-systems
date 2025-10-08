-- Fix user_profiles security issue: Remove direct admin SELECT access
-- Admins will access user data through SECURITY DEFINER functions only
-- This provides better audit trails and controlled access to sensitive data

-- Drop the overly permissive admin view policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- The following policies remain in place:
-- 1. "Users can view their own profile" - SELECT where auth.uid() = id (SECURE)
-- 2. "Admins have full access to user_profiles" - For INSERT/UPDATE/DELETE only
-- 3. SECURITY DEFINER functions provide controlled admin read access with audit logging