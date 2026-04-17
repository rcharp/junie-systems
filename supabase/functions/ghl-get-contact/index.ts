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
    if (!PIT) return jsonRes({ error: 'GHL_PIT_TOKEN not configured' }, 500);

    const { contactId } = await req.json();
    if (!contactId) return jsonRes({ error: 'contactId is required' }, 400);

    const res = await fetch(`${GHL_API}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${PIT}`,
        Version: GHL_VERSION,
        Accept: 'application/json',
      },
    });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) return jsonRes({ error: 'GHL fetch failed', status: res.status, details: data }, 500);

    const c = data.contact || data;
    return jsonRes({
      contact: {
        firstName: c.firstName || c.firstNameLowerCase || '',
        lastName: c.lastName || c.lastNameLowerCase || '',
        name: c.companyName || c.businessName || (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : ''),
        email: c.email || '',
        phone: c.phone || '',
        address: c.address1 || c.address || '',
        city: c.city || '',
        state: c.state || '',
        postalCode: c.postalCode || c.postal_code || '',
        country: c.country || 'US',
        website: c.website || '',
        timezone: c.timezone || 'America/New_York',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
