import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const SOURCE_LOCATION_ID = 'yvDlEJb1YBBk2JhD3map';

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

    const PIT = Deno.env.get('GHL_LOCATION_PIT_TOKEN');
    if (!PIT) return jsonRes({ error: 'GHL_LOCATION_PIT_TOKEN not configured' }, 500);

    const body = await req.json().catch(() => ({}));
    const query = (body.query || '').toString().trim();
    const locationId = (body.locationId || SOURCE_LOCATION_ID).toString();

    const ghHeaders = {
      Authorization: `Bearer ${PIT}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
    };

    const url = `${GHL_API}/contacts/?locationId=${locationId}&limit=25${query ? `&query=${encodeURIComponent(query)}` : ''}`;
    const res = await fetch(url, { headers: ghHeaders });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) return jsonRes({ error: 'Failed to search contacts', details: data }, 500);

    const contacts = (data.contacts || []).map((c: any) => ({
      id: c.id || c._id,
      name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.contactName || c.companyName || '(no name)',
      email: c.email || '',
      phone: c.phone || '',
      companyName: c.companyName || c.businessName || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
    })).filter((c: any) => c.id);

    return jsonRes({ contacts });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
