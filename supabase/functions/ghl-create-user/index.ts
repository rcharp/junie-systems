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

    const parseJson = async (res: Response) => {
      const text = await res.text();
      try {
        return text ? JSON.parse(text) : {};
      } catch {
        return { raw: text };
      }
    };

    const mintLocationToken = async (locId: string) => {
      const res = await fetch(`${GHL_API}/oauth/locationToken`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Version: '2021-07-28',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          companyId: resolvedCompanyId,
          locationId: locId,
        }),
      });
      const data = await parseJson(res);
      return {
        ok: res.ok,
        status: res.status,
        token: data.access_token || data.locationAccessToken || data.accessToken,
        data,
      };
    };

    // Step 1: If contactId provided, fetch the contact using the source location's PIT token directly
    if (contactId) {
      const srcLoc = sourceLocationId || locationId;
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

    const userData = await parseJson(userRes);
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
