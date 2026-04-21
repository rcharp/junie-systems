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
    if (!PIT) return jsonRes({ error: 'GHL_LOCATION_PIT_TOKEN not configured' }, 500);

    const { contactId } = await req.json();
    if (!contactId) return jsonRes({ error: 'contactId is required' }, 400);

    const ghHeaders = {
      Authorization: `Bearer ${PIT}`,
      Version: GHL_VERSION,
      Accept: 'application/json',
    };

    const res = await fetch(`${GHL_API}/contacts/${contactId}`, { headers: ghHeaders });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) return jsonRes({ error: 'GHL fetch failed', status: res.status, details: data }, 500);

    const c = data.contact || data;
    const locationId = c.locationId;

    // Build map of custom field id -> field name by fetching location custom fields
    const customFieldMap: Record<string, string> = {};
    if (locationId) {
      const cfRes = await fetch(`${GHL_API}/locations/${locationId}/customFields`, { headers: ghHeaders });
      if (cfRes.ok) {
        const cfData = await cfRes.json();
        const fields = cfData.customFields || cfData.fields || [];
        for (const f of fields) {
          if (f.id) customFieldMap[f.id] = (f.name || f.fieldKey || '').toString();
        }
      }
    }

    // Match contact customFields by normalized field name
    const customFields: any[] = c.customFields || c.customField || [];
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const findField = (keywords: string[], excludeKeywords: string[] = []) => {
      for (const cf of customFields) {
        const fieldName = customFieldMap[cf.id] || cf.name || cf.fieldKey || '';
        const n = norm(fieldName);
        if (excludeKeywords.some((k) => n.includes(k))) continue;
        if (keywords.some((k) => n.includes(k))) {
          const v = (cf.value || cf.fieldValue || '').toString();
          if (v) return v;
        }
      }
      return '';
    };

    const einValue = findField(['taxid', 'ein', 'businesstaxid', 'businesstaxidorein']);
    const facebookLink = findField(['facebook']);
    const instagramLink = findField(['instagram']);
    const businessNameFull = findField(['businessnamefull', 'businessfullname', 'companynamefull', 'fulllegalname', 'legalbusinessname']);
    const businessNameShort = findField(['businessname', 'companyname'], ['full', 'legal']);
    const reviewSurveyLink = findField(['negativefeedback', 'reviewsurvey', 'surveylink', 'feedbacklink', 'negativereview']);
    const hoursOfOperation = findField(['hoursofoperation', 'businesshours', 'hours']);
    const existingWebsiteUrl = findField(['existingwebsiteurl', 'currentwebsite', 'existingwebsite', 'websiteurl', 'currentwebsiteurl']);
    const companyIndustry = findField(['companyindustry', 'industry', 'businessindustry', 'businesstype']);
    const companyLogoUrl = findField(['companylogourl', 'companylogo', 'logourl', 'logo']);
    const servicesOffered = findField(['servicesoffered', 'services', 'serviceslist', 'offeredservices']);
    const serviceAreas = findField(['serviceareas', 'areas', 'cities', 'servicearea', 'locationsserved', 'areasserved']);
    const aboutUs = findField(['aboutus', 'about', 'aboutussection', 'businessdescription', 'description']);
    const trustBar = findField(['trustbar', 'specialthings', 'usp', 'uniqueselling', 'whychooseus']);

    const stripSuffix = (s: string) =>
      s.replace(/[\s,]+(llc|l\.l\.c\.|inc|inc\.|incorporated|corp|corp\.|corporation|co|co\.|company|ltd|ltd\.|limited|pllc|p\.l\.l\.c\.|pc|p\.c\.|lp|l\.p\.|llp|l\.l\.p\.)\.?$/i, '').trim();

    const ALL_CAPS_PRESERVE = new Set(['LLC', 'INC', 'LLP', 'LP', 'PC', 'PLLC', 'CO', 'LTD', 'CORP', 'USA', 'HVAC', 'AC', 'II', 'III', 'IV']);
    const SMALL_WORDS = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'for', 'in', 'on', 'at', 'to', 'by']);
    const toTitleCase = (s: string) => {
      if (!s) return s;
      const trimmed = s.trim();
      const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
      const isAllLower = trimmed === trimmed.toLowerCase() && /[a-z]/.test(trimmed);
      if (!isAllCaps && !isAllLower) return trimmed;
      return trimmed.split(/\s+/).map((word, i) => {
        const upper = word.toUpperCase().replace(/[^A-Z]/g, '');
        if (ALL_CAPS_PRESERVE.has(upper)) return word.toUpperCase();
        const lower = word.toLowerCase();
        if (i > 0 && SMALL_WORDS.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }).join(' ');
    };

    const rawName = c.companyName || c.businessName || businessNameFull || businessNameShort || '';
    const fullName = toTitleCase(businessNameFull || rawName);
    const shortName = toTitleCase(stripSuffix(businessNameShort || rawName));

    return jsonRes({
      contact: {
        firstName: c.firstName || c.firstNameLowerCase || '',
        lastName: c.lastName || c.lastNameLowerCase || '',
        name: shortName || (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : ''),
        email: c.email || '',
        phone: c.phone || '',
        address: c.address1 || c.address || '',
        city: c.city || '',
        state: c.state || '',
        postalCode: c.postalCode || c.postal_code || '',
        country: c.country || 'US',
        website: c.website || '',
        timezone: c.timezone || 'America/New_York',
        einNumber: einValue,
        customValues: {
          company_facebook_link: facebookLink,
          company_instagram_link: instagramLink,
          company_name: shortName,
          company_name_full: fullName,
          review_survey_link: reviewSurveyLink,
          hours_of_operation: hoursOfOperation,
          existing_website_url: existingWebsiteUrl,
          company_industry: companyIndustry,
          company_logo_url: companyLogoUrl,
        },
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
