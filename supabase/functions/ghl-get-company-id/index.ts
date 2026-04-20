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

    const STORED = Deno.env.get('GHL_AGENCY_COMPANY_ID');
    if (STORED) return jsonRes({ success: true, companyId: STORED, source: 'secret' });

    const PIT = Deno.env.get('GHL_AGENCY_PIT_TOKEN') || Deno.env.get('GHL_PIT_TOKEN');
    if (!PIT) return jsonRes({ error: 'GHL_AGENCY_PIT_TOKEN not configured' }, 500);

    const attempts: any[] = [];

    const tryEndpoint = async (path: string) => {
      const res = await fetch(`${GHL_API}${path}`, {
        headers: {
          Authorization: `Bearer ${PIT}`,
          Version: GHL_VERSION,
          Accept: 'application/json',
        },
      });
      const data = await res.json().catch(() => ({}));
      attempts.push({ endpoint: path, status: res.status, data });
      return data;
    };

    const findCompanyId = (obj: any): string | undefined => {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const key of ['companyId', 'companyID', 'company_id']) {
        if (typeof obj[key] === 'string') return obj[key];
      }
      for (const v of Object.values(obj)) {
        if (v && typeof v === 'object') {
          const found = findCompanyId(v);
          if (found) return found;
        }
      }
      return undefined;
    };

    let companyId: string | undefined;

    const meData = await tryEndpoint('/users/me');
    companyId = findCompanyId(meData);

    if (!companyId) {
      const locData = await tryEndpoint('/locations/search?limit=1');
      companyId = findCompanyId(locData);
    }

    if (!companyId) {
      const oauthData = await tryEndpoint('/oauth/installedLocations?limit=1');
      companyId = findCompanyId(oauthData);
    }

    if (!companyId) {
      return jsonRes({ error: 'Could not determine companyId from PIT token. See attempts for raw responses.', attempts }, 404);
    }

    return jsonRes({ success: true, companyId, attempts });
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
