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

    const PIT = Deno.env.get('GHL_PIT_TOKEN') || Deno.env.get('GHL_LOCATION_PIT_TOKEN');
    if (!PIT) return jsonRes({ error: 'GHL token not configured' }, 500);
    const COMPANY_ID = Deno.env.get('GHL_AGENCY_COMPANY_ID');

    const { emails } = await req.json();
    if (!Array.isArray(emails)) return jsonRes({ error: 'emails array required' }, 400);

    const ghHeaders = {
      Authorization: `Bearer ${PIT}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // 1) Get all locations (subaccounts) for the agency
    let locations: any[] = [];
    if (COMPANY_ID) {
      const locRes = await fetch(`${GHL_API}/locations/search?companyId=${COMPANY_ID}&limit=500`, { headers: ghHeaders });
      const locText = await locRes.text();
      if (locRes.ok) {
        try { locations = JSON.parse(locText).locations || []; } catch {}
      } else {
        console.log('locations/search failed', locRes.status, locText.slice(0, 300));
      }
    }
    console.log('Found locations:', locations.length);

    // Build email -> business name map by querying each location's contacts
    const results: Record<string, string> = {};
    const remaining = new Set(emails.map((e: string) => (e || '').toLowerCase()).filter(Boolean));

    for (const loc of locations) {
      if (!remaining.size) break;
      const locId = loc._id || loc.id;
      if (!locId) continue;
      // Use search endpoint with each remaining email
      await Promise.all(Array.from(remaining).map(async (email) => {
        try {
          const url = `${GHL_API}/contacts/?locationId=${encodeURIComponent(locId)}&query=${encodeURIComponent(email)}&limit=5`;
          const r = await fetch(url, { headers: ghHeaders });
          if (!r.ok) return;
          const d = await r.json();
          const list: any[] = d.contacts || [];
          const match = list.find((c) => (c.email || '').toLowerCase() === email);
          if (match) {
            const biz = match.companyName || match.businessName || loc.name || '';
            if (biz) {
              results[email] = biz;
              remaining.delete(email);
            }
          }
        } catch {}
      }));
    }
    console.log('Resolved', Object.keys(results).length, 'of', emails.length);

    return jsonRes({ businesses: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
