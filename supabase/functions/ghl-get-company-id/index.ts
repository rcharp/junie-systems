import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonRes({ error: 'Unauthorized' }, 401);

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return jsonRes({ error: 'Forbidden' }, 403);

    const PIT = Deno.env.get('GHL_PIT_TOKEN');
    if (!PIT) return jsonRes({ error: 'GHL_PIT_TOKEN not configured' }, 500);

    // Try /users/me first
    const attempts: any[] = [];
    const meRes = await fetch(`${GHL_API}/users/me`, {
      headers: {
        Authorization: `Bearer ${PIT}`,
        Version: GHL_VERSION,
        Accept: 'application/json',
      },
    });
    const meData = await meRes.json().catch(() => ({}));
    attempts.push({ endpoint: '/users/me', status: meRes.status, data: meData });

    let companyId =
      meData?.companyId ||
      meData?.user?.companyId ||
      meData?.company?.id ||
      meData?.companyID;

    // Fallback: /oauth/installedLocations or /companies/me
    if (!companyId) {
      const compRes = await fetch(`${GHL_API}/companies/me`, {
        headers: {
          Authorization: `Bearer ${PIT}`,
          Version: GHL_VERSION,
          Accept: 'application/json',
        },
      });
      const compData = await compRes.json().catch(() => ({}));
      attempts.push({ endpoint: '/companies/me', status: compRes.status, data: compData });
      companyId = compData?.id || compData?.company?.id || compData?.companyId;
    }

    if (!companyId) {
      return jsonRes({ error: 'Could not determine companyId from PIT token', attempts }, 404);
    }

    return jsonRes({ success: true, companyId, raw: meData });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return jsonRes({ error: msg }, 500);
  }
});

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
