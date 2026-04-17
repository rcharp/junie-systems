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
    const SNAPSHOT_ID = Deno.env.get('GHL_SNAPSHOT_ID');
    if (!PIT) return jsonRes({ error: 'GHL_PIT_TOKEN not configured' }, 500);

    const body = await req.json();
    const {
      companyId: bodyCompanyId,
      name, email, phone,
      address, city, state, country = 'US', postalCode,
      website, timezone = 'America/New_York',
      firstName, lastName,
      snapshotId,
      customValues,
      einNumber,
    } = body;

    const companyId = bodyCompanyId || Deno.env.get('GHL_AGENCY_COMPANY_ID');
    if (!companyId) return jsonRes({ error: 'companyId is required (set GHL_AGENCY_COMPANY_ID secret or pass companyId)' }, 400);
    if (!name) return jsonRes({ error: 'name is required' }, 400);
    

    // Create sub-account (location)
    const createPayload: any = {
      name,
      companyId,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      website,
      timezone,
      email,
      prospectInfo: (firstName || lastName || email) ? { firstName, lastName, email } : undefined,
    };
    if (snapshotId || SNAPSHOT_ID) createPayload.snapshotId = snapshotId || SNAPSHOT_ID;

    console.log('GHL create payload:', JSON.stringify(createPayload));
    const createRes = await fetch(`${GHL_API}/locations/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PIT}`,
        Version: GHL_VERSION,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(createPayload),
    });
    const createData = await createRes.json();
    console.log('GHL create response:', createRes.status, JSON.stringify(createData));
    if (!createRes.ok) {
      return jsonRes({ error: 'GHL create failed', status: createRes.status, details: createData, sentPayload: createPayload }, 500);
    }

    const locationId = createData?.id || createData?.location?.id || createData?._id;

    // Optionally set custom values
    if (locationId && customValues && typeof customValues === 'object') {
      for (const [key, value] of Object.entries(customValues)) {
        await fetch(`${GHL_API}/locations/${locationId}/customValues`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${PIT}`,
            Version: GHL_VERSION,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: key, value: String(value) }),
        }).catch(() => {});
      }
    }

    // Create an Admin user on the new sub-account with scoped permissions
    let userResult: any = null;
    if (locationId && email) {
      const userPermissions = {
        campaignsEnabled: false,
        campaignsReadOnly: false,
        contactsEnabled: true,
        workflowsEnabled: false,
        workflowsReadOnly: false,
        triggersEnabled: false,
        funnelsEnabled: false,
        websitesEnabled: false,
        opportunitiesEnabled: true,
        dashboardStatsEnabled: true,
        bulkRequestsEnabled: true,
        appointmentsEnabled: false,
        reviewsEnabled: true,
        onlineListingsEnabled: true,
        phoneCallEnabled: false,
        conversationsEnabled: true,
        assignedDataOnly: false,
        adwordsReportingEnabled: false,
        membershipEnabled: false,
        facebookAdsReportingEnabled: true,
        attributionsReportingEnabled: false,
        settingsEnabled: false,
        tagsEnabled: true,
        leadValueEnabled: true,
        marketingEnabled: false,
        agentReportingEnabled: false,
        botService: false,
        socialPlanner: true,
        bloggingEnabled: false,
        invoiceEnabled: false,
        affiliateManagerEnabled: false,
        contentAiEnabled: false,
        refundsEnabled: false,
        recordPaymentEnabled: false,
        cancelSubscriptionEnabled: false,
        paymentsEnabled: false,
        communitiesEnabled: false,
        exportPaymentsEnabled: false,
        adManager: false,
        prospectingEnabled: false,
        mediaStorageEnabled: true,
        chatWithAi: false,
        sas: false,
      };

      const [uFirst, ...uRest] = (name || email).split(' ');
      const userPayload: any = {
        companyId,
        firstName: firstName || uFirst || 'Account',
        lastName: lastName || uRest.join(' ') || 'Owner',
        email,
        phone,
        type: 'account',
        role: 'admin',
        locationIds: [locationId],
        permissions: userPermissions,
      };

      console.log('GHL create user payload:', JSON.stringify(userPayload));
      const userRes = await fetch(`${GHL_API}/users/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PIT}`,
          Version: GHL_VERSION,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(userPayload),
      });
      const userData = await userRes.json();
      console.log('GHL create user response:', userRes.status, JSON.stringify(userData));
      userResult = { ok: userRes.ok, status: userRes.status, data: userData };
    }

    return jsonRes({ success: true, locationId, location: createData, user: userResult });
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
