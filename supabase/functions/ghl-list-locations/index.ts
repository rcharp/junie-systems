import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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
    const COMPANY_ID = Deno.env.get('GHL_AGENCY_COMPANY_ID');
    if (!PIT) return jsonRes({ error: 'GHL_PIT_TOKEN not configured' }, 500);
    if (!COMPANY_ID) return jsonRes({ error: 'GHL_AGENCY_COMPANY_ID not configured' }, 500);

    const ghHeaders = {
      Authorization: `Bearer ${PIT}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
    };

    const res = await fetch(`${GHL_API}/locations/search?companyId=${COMPANY_ID}&limit=500`, { headers: ghHeaders });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) return jsonRes({ error: 'Failed to list locations', details: data }, 500);

    const locations = (data.locations || []).map((l: any) => ({
      id: l.id || l._id,
      name: l.business?.name || l.name || '(unnamed)',
      email: l.email || l.business?.email || '',
    })).filter((l: any) => l.id);

    locations.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return jsonRes({ locations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
