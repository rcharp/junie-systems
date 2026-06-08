
-- 1. Onboarding logos: require auth to upload
DROP POLICY IF EXISTS "Anyone can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload onboarding logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'onboarding-logos');

-- 2. Remove broad SELECT policies on public buckets to prevent bucket listing.
--    Public buckets still serve files via the /object/public/ URL without a SELECT policy.
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND qual ILIKE '%bucket_id = ''sites''%'
      AND qual NOT ILIKE '%has_role%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
  END LOOP;
END$$;

-- 3. Lock down has_role so the anonymous public role cannot enumerate it via the API.
--    RLS policies referencing public.has_role still work for authenticated users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
