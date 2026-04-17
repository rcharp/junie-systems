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

    const PIT = Deno.env.get('GHL_LOCATION_PIT_TOKEN') || Deno.env.get('GHL_PIT_TOKEN');
    if (!PIT) return jsonRes({ error: 'GHL token not configured' }, 500);

    const { emails } = await req.json();
    if (!Array.isArray(emails)) return jsonRes({ error: 'emails array required' }, 400);

    const ghHeaders = {
      Authorization: `Bearer ${PIT}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
    };

    const locationId = Deno.env.get('GHL_LOCATION_ID') || '';

    const results: Record<string, string> = {};
    const debug: any[] = [];
    await Promise.all(emails.map(async (email: string) => {
      if (!email) return;
      try {
        const params = new URLSearchParams({ query: email, limit: '5' });
        if (locationId) params.set('locationId', locationId);
        const url = `${GHL_API}/contacts/?${params.toString()}`;
        const r = await fetch(url, { headers: ghHeaders });
        const text = await r.text();
        if (!r.ok) {
          console.log('GHL search failed', email, r.status, text.slice(0, 300));
          debug.push({ email, status: r.status, error: text.slice(0, 200) });
          return;
        }
        let d: any;
        try { d = JSON.parse(text); } catch { return; }
        const list: any[] = d.contacts || [];
        const match = list.find((c) => (c.email || '').toLowerCase() === email.toLowerCase()) || list[0];
        if (match) {
          const biz = match.companyName || match.businessName || '';
          console.log('GHL match', email, '->', biz);
          if (biz) results[email.toLowerCase()] = biz;
        } else {
          console.log('GHL no match for', email, 'returned', list.length);
        }
      } catch (err) {
        console.log('lookup error', email, String(err));
      }
    }));

    return jsonRes({ businesses: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
