import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function formatPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  // Handle leading country code 1
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (ten.length !== 10) return raw.trim();
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

function titleCase(s: string): string {
  if (!s) return '';
  const small = new Set(['and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'for', 'to', 'with', 'at', 'by']);
  return s
    .toLowerCase()
    .split(/(\s+|[-/])/)
    .map((part, i) => {
      if (/^\s+$/.test(part) || part === '-' || part === '/') return part;
      if (i !== 0 && small.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

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

    const body = await req.json().catch(() => ({}));
    const {
      businessName = '',
      ownerName = '',
      phone = '',
      address = '',
      services = '',
      serviceAreas = '',
      aboutUs = '',
      trustBar = '',
      industry = '',
    } = body || {};

    // Deterministic normalizations first
    const normalizedPhone = formatPhone(String(phone));
    const normalizedBusinessName = titleCase(String(businessName));
    const normalizedOwnerName = titleCase(String(ownerName));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return jsonRes({ error: 'LOVABLE_API_KEY not configured' }, 500);

    const sysPrompt = `You normalize messy small-business intake data into clean structured output for a website-building prompt.

Rules:
- Output STRICT JSON only, no prose, no code fences. Match the schema exactly.
- "services": array of clean service names with optional pricing. Split comma/newline/semicolon separated lists. Title Case each service. Keep prices if present (e.g., "Drain Cleaning - $99"). Remove duplicates and filler. If a single service mentions multiple, split sensibly.
- "serviceAreas": array of city/area names. Title Case. Split lists. Remove duplicates and noise. Strip filler words like "and surrounding" — keep concrete place names. Append state abbreviation only if clearly part of the original.
- "aboutUs": rewrite into 3-5 polished sentences, first-person plural ("we") or owner-focused, professional but warm, focused on expertise, story, and customer commitment. Fix grammar/capitalization. Do NOT invent facts not implied by the input. If input is empty/very thin, write a credible generic 3-5 sentence About Us based on the business name and industry.
- "trustBar": array of 3-5 short standalone phrases (3-6 words each) suitable as trust-bar bullets (e.g., "Licensed & Insured", "24/7 Emergency Service", "Family Owned Since 1998"). Title Case. No sentences, no trailing punctuation. Split run-on inputs into individual items. If input is thin, infer reasonable items from industry.

Schema:
{
  "services": string[],
  "serviceAreas": string[],
  "aboutUs": string,
  "trustBar": string[]
}`;

    const userPrompt = `Business Name: ${normalizedBusinessName || '(unknown)'}
Owner: ${normalizedOwnerName || '(unknown)'}
Industry: ${industry || '(unknown)'}
Address: ${address || '(unknown)'}

Services Offered (raw):
${services || '(none)'}

Service Areas (raw):
${serviceAreas || '(none)'}

About Us (raw):
${aboutUs || '(none)'}

Trust Bar (raw):
${trustBar || '(none)'}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return jsonRes({ error: 'AI normalization failed', details: txt, status: aiRes.status }, 500);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const servicesArr: string[] = Array.isArray(parsed.services) ? parsed.services.filter(Boolean) : [];
    const areasArr: string[] = Array.isArray(parsed.serviceAreas) ? parsed.serviceAreas.filter(Boolean) : [];
    const trustArr: string[] = Array.isArray(parsed.trustBar) ? parsed.trustBar.filter(Boolean).slice(0, 5) : [];
    const aboutStr: string = typeof parsed.aboutUs === 'string' ? parsed.aboutUs.trim() : '';

    return jsonRes({
      businessName: normalizedBusinessName,
      ownerName: normalizedOwnerName,
      phone: normalizedPhone,
      services: servicesArr.join(', '),
      serviceAreas: areasArr.join(', '),
      aboutUs: aboutStr,
      trustBar: trustArr.join(', '),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
