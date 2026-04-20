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

    const PIT = Deno.env.get('GHL_AGENCY_PIT_TOKEN') || Deno.env.get('GHL_PIT_TOKEN');
    if (!PIT) return jsonRes({ error: 'GHL_AGENCY_PIT_TOKEN not configured' }, 500);

    const body = await req.json();
    const { locationId, customValues, ...contactFields } = body;
    if (!locationId) return jsonRes({ error: 'locationId is required' }, 400);

    // Update location contact info (only include defined fields)
    const updatePayload: Record<string, unknown> = {};
    for (const k of ['name', 'phone', 'email', 'address', 'city', 'state', 'country', 'postalCode', 'website', 'timezone', 'firstName', 'lastName']) {
      if (contactFields[k] !== undefined && contactFields[k] !== '') updatePayload[k] = contactFields[k];
    }

    let updateData: any = null;
    if (Object.keys(updatePayload).length > 0) {
      const updateRes = await fetch(`${GHL_API}/locations/${locationId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${PIT}`,
          Version: GHL_VERSION,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });
      updateData = await updateRes.json();
      if (!updateRes.ok) {
        return jsonRes({ error: 'GHL update failed', status: updateRes.status, details: updateData }, 500);
      }
    }

    // Update custom values
    const cvResults: any[] = [];
    if (customValues && typeof customValues === 'object') {
      for (const [key, value] of Object.entries(customValues)) {
        const cvRes = await fetch(`${GHL_API}/locations/${locationId}/customValues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PIT}`,
            Version: GHL_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: key, value: String(value) }),
        });
        cvResults.push({ key, status: cvRes.status });
      }
    }

    return jsonRes({ success: true, location: updateData, customValues: cvResults });
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
