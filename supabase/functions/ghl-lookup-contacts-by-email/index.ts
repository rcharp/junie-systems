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

    const results: Record<string, string> = {};
    await Promise.all(emails.map(async (email: string) => {
      if (!email) return;
      try {
        const url = `${GHL_API}/contacts/?query=${encodeURIComponent(email)}&limit=1`;
        const r = await fetch(url, { headers: ghHeaders });
        if (!r.ok) return;
        const d = await r.json();
        const contact = (d.contacts && d.contacts[0]) || null;
        if (contact) {
          results[email.toLowerCase()] = contact.companyName || contact.businessName || '';
        }
      } catch {}
    }));

    return jsonRes({ businesses: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
