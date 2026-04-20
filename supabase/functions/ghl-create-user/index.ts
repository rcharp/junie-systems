const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// Source user to copy permissions/scopes from
const SOURCE_USER_ID = 'kBUD7tgg9CxF3Sz3mpUj';

// Fallback admin permissions if source user fetch fails
const FALLBACK_ADMIN_PERMISSIONS = {
  campaignsEnabled: true, campaignsReadOnly: false, contactsEnabled: true,
  workflowsEnabled: true, workflowsReadOnly: false, triggersEnabled: true,
  funnelsEnabled: true, websitesEnabled: true, opportunitiesEnabled: true,
  dashboardStatsEnabled: true, bulkRequestsEnabled: true, appointmentsEnabled: true,
  reviewsEnabled: true, onlineListingsEnabled: true, phoneCallEnabled: true,
  conversationsEnabled: true, assignedDataOnly: false, adwordsReportingEnabled: true,
  membershipEnabled: true, facebookAdsReportingEnabled: true, attributionsReportingEnabled: true,
  settingsEnabled: true, tagsEnabled: true, leadValueEnabled: true,
  marketingEnabled: true, agentReportingEnabled: true, botService: true,
  socialPlanner: true, bloggingEnabled: true, invoiceEnabled: true,
  affiliateManagerEnabled: true, contentAiEnabled: true, refundsEnabled: true,
  recordPaymentEnabled: true, cancelSubscriptionEnabled: true, paymentsEnabled: true,
  communitiesEnabled: true, exportPaymentsEnabled: true,
};

const parseJson = async (res: Response) => {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get('GHL_AGENCY_PIT_TOKEN') || Deno.env.get('GHL_PIT_TOKEN');
    if (!token) throw new Error('Missing GHL agency token (set GHL_AGENCY_PIT_TOKEN)');

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

    let resolvedCompanyId = companyId
      || Deno.env.get('GHL_AGENCY_COMPANY_ID')
      || Deno.env.get('GHL_COMPANY_ID');
    if (!resolvedCompanyId) {
      return new Response(JSON.stringify({ error: 'companyId is required (set GHL_AGENCY_COMPANY_ID or pass companyId)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPayload: any = { firstName, lastName, email, phone, password, type, role };

    // Optionally hydrate from contact
    if (contactId) {
      const sourceToken = Deno.env.get('GHL_LOCATION_PIT_TOKEN');
      if (!sourceToken) {
        return new Response(JSON.stringify({ error: 'Missing GHL_LOCATION_PIT_TOKEN for source location' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const cRes = await fetch(`${GHL_API}/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${sourceToken}`,
          Version: GHL_VERSION,
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

    if (!userPayload.password) {
      userPayload.password = `J${Math.random().toString(36).slice(2, 10)}!${Math.floor(Math.random() * 100)}`;
    }

    const agencyHeaders = {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // ========== STEP 1: Try to create user at agency level ==========
    const createPayload = {
      companyId: resolvedCompanyId,
      firstName: userPayload.firstName,
      lastName: userPayload.lastName,
      email: userPayload.email,
      password: userPayload.password,
      phone: userPayload.phone || undefined,
      type: userPayload.type,
      role: userPayload.role,
      locationIds: [locationId],
      permissions: ADMIN_PERMISSIONS,
    };

    const userRes = await fetch(`${GHL_API}/users/`, {
      method: 'POST',
      headers: agencyHeaders,
      body: JSON.stringify(createPayload),
    });
    const userData = await parseJson(userRes);

    if (userRes.ok) {
      return new Response(JSON.stringify({
        success: true,
        action: 'created',
        user: userData,
        generatedPassword: userPayload.password,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ========== STEP 2: If user already exists, find them and add location ==========
    const errMsg = JSON.stringify(userData).toLowerCase();
    const isDuplicate = userRes.status === 400 || userRes.status === 409 ||
      errMsg.includes('already') || errMsg.includes('exist') || errMsg.includes('duplicate');

    if (!isDuplicate) {
      return new Response(JSON.stringify({ error: 'Failed to create user', details: userData, payload: createPayload }), {
        status: userRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search agency users by email to find existing user
    const searchRes = await fetch(`${GHL_API}/users/search?companyId=${resolvedCompanyId}&query=${encodeURIComponent(userPayload.email)}`, {
      headers: agencyHeaders,
    });
    const searchData = await parseJson(searchRes);
    if (!searchRes.ok) {
      return new Response(JSON.stringify({ error: 'User exists but search failed', details: searchData, createError: userData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const usersList: any[] = searchData.users || searchData.data || [];
    const existing = usersList.find((u: any) =>
      (u.email || '').toLowerCase() === userPayload.email.toLowerCase()
    );

    if (!existing?.id) {
      return new Response(JSON.stringify({
        error: 'User exists but could not be located via search',
        createError: userData,
        searchResult: searchData,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Merge location into existing user's locationIds
    const currentLocationIds: string[] = Array.isArray(existing.roles?.locationIds)
      ? existing.roles.locationIds
      : Array.isArray(existing.locationIds) ? existing.locationIds : [];
    const mergedLocationIds = Array.from(new Set([...currentLocationIds, locationId]));

    const updatePayload = {
      firstName: existing.firstName || userPayload.firstName,
      lastName: existing.lastName || userPayload.lastName,
      email: existing.email,
      phone: existing.phone || userPayload.phone || undefined,
      type: 'account',
      role: 'admin',
      locationIds: mergedLocationIds,
      permissions: ADMIN_PERMISSIONS,
    };

    const updateRes = await fetch(`${GHL_API}/users/${existing.id}`, {
      method: 'PUT',
      headers: agencyHeaders,
      body: JSON.stringify(updatePayload),
    });
    const updateData = await parseJson(updateRes);

    if (!updateRes.ok) {
      return new Response(JSON.stringify({
        error: 'User exists but failed to add location',
        details: updateData,
        userId: existing.id,
        attemptedLocationIds: mergedLocationIds,
      }), { status: updateRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      action: 'added_location_to_existing_user',
      user: updateData,
      userId: existing.id,
      locationIds: mergedLocationIds,
      message: 'User already existed; added new location and granted admin permissions.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
