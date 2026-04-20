const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API = 'https://services.leadconnectorhq.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('GHL_PIT_TOKEN') || Deno.env.get('GHL_AGENCY_API_KEY') || Deno.env.get('GHL_PRIVATE_INTEGRATION_TOKEN');
    if (!token) throw new Error('Missing GHL agency token (set GHL_PIT_TOKEN)');

    const body = await req.json();
    const {
      companyId,
      locationId,
      sourceLocationId,
      contactId,
      firstName,
      lastName,
      email,
      phone,
      password,
      type = 'account',
      role = 'admin',
    } = body || {};

    if (!locationId) {
      return new Response(JSON.stringify({ error: 'locationId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let resolvedCompanyId = companyId;
    let userPayload: any = { firstName, lastName, email, phone, password, type, role };

    // Resolve agency companyId
    if (!resolvedCompanyId) {
      resolvedCompanyId = Deno.env.get('GHL_AGENCY_COMPANY_ID') || Deno.env.get('GHL_COMPANY_ID');
    }
    if (!resolvedCompanyId) {
      return new Response(JSON.stringify({ error: 'companyId is required (set GHL_AGENCY_COMPANY_ID or pass companyId)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper: mint a location-scoped access token from the agency PIT
    const mintLocationToken = async (locId: string) => {
      const form = new URLSearchParams();
      form.set('companyId', resolvedCompanyId);
      form.set('locationId', locId);
      const res = await fetch(`${GHL_API}/oauth/locationToken`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: form.toString(),
      });
      const data = await res.json();
      return { ok: res.ok, token: data.access_token as string | undefined, data };
    };

    // Step 1: If contactId provided, mint a token for the SOURCE location to fetch the contact
    if (contactId) {
      const srcLoc = sourceLocationId || locationId;
      const src = await mintLocationToken(srcLoc);
      if (!src.ok || !src.token) {
        return new Response(JSON.stringify({ error: 'Failed to mint source location token', details: src.data }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const cRes = await fetch(`${GHL_API}/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${src.token}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
      });
      const cData = await cRes.json();
      if (!cRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch contact', details: cData, sourceLocationId: srcLoc }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const c = cData.contact || cData;
      userPayload.firstName = userPayload.firstName || c.firstName || c.firstNameLowerCase || '';
      userPayload.lastName = userPayload.lastName || c.lastName || c.lastNameLowerCase || '';
      userPayload.email = userPayload.email || c.email || '';
      userPayload.phone = userPayload.phone || c.phone || '';
    }

    if (!userPayload.email) {
      return new Response(JSON.stringify({ error: 'email is required (provide directly or via contactId)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate password if not provided
    if (!userPayload.password) {
      userPayload.password = `J${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 100)}`;
    }

    // Step 2: Mint a token for the TARGET location for user creation
    const tgt = await mintLocationToken(locationId);
    if (!tgt.ok || !tgt.token) {
      return new Response(JSON.stringify({ error: 'Failed to mint target location token', details: tgt.data }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const locationToken = tgt.token;

    const finalPayload = {
      companyId: resolvedCompanyId,
      firstName: userPayload.firstName,
      lastName: userPayload.lastName,
      email: userPayload.email,
      password: userPayload.password,
      phone: userPayload.phone || undefined,
      type: userPayload.type,
      role: userPayload.role,
      locationIds: [locationId],
      permissions: {
        campaignsEnabled: true,
        campaignsReadOnly: false,
        contactsEnabled: true,
        workflowsEnabled: true,
        workflowsReadOnly: false,
        triggersEnabled: true,
        funnelsEnabled: true,
        websitesEnabled: true,
        opportunitiesEnabled: true,
        dashboardStatsEnabled: true,
        bulkRequestsEnabled: true,
        appointmentsEnabled: true,
        reviewsEnabled: true,
        onlineListingsEnabled: true,
        phoneCallEnabled: true,
        conversationsEnabled: true,
        assignedDataOnly: false,
        adwordsReportingEnabled: false,
        membershipEnabled: true,
        facebookAdsReportingEnabled: false,
        attributionsReportingEnabled: false,
        settingsEnabled: true,
        tagsEnabled: true,
        leadValueEnabled: true,
        marketingEnabled: true,
      },
    };

    // Step 2: Create the user using the location-scoped token
    const userRes = await fetch(`${GHL_API}/users/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${locationToken}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(finalPayload),
    });

    const userData = await userRes.json();
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create user', details: userData, payload: finalPayload }), {
        status: userRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user: userData,
      generatedPassword: userPayload.password,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
