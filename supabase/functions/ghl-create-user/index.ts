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
    const token = Deno.env.get('GHL_AGENCY_API_KEY') || Deno.env.get('GHL_PRIVATE_INTEGRATION_TOKEN');
    if (!token) throw new Error('Missing GHL agency token');

    const body = await req.json();
    const {
      companyId,
      locationId,
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

    // If contactId provided, fetch the contact and use its info
    if (contactId) {
      const cRes = await fetch(`${GHL_API}/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
      });
      const cData = await cRes.json();
      if (!cRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch contact', details: cData }), {
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

    // Look up companyId if not provided
    if (!resolvedCompanyId) {
      resolvedCompanyId = Deno.env.get('GHL_COMPANY_ID');
    }

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

    const userRes = await fetch(`${GHL_API}/users/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
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
