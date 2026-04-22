import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonRes = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const {
      businessName = '',
      industry = '',
      address = '',
      services = '',
      serviceAreas = '',
      aboutUs = '',
      trustBar = '',
      website = '',
      phone = '',
    } = await req.json().catch(() => ({}));

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return jsonRes({ error: 'LOVABLE_API_KEY not configured' }, 500);

    const sysPrompt = `You write Google Business Profile (Google My Business) "from the business" descriptions for local service businesses.

Rules:
- Output PLAIN TEXT only — no markdown, no headings, no bullet points, no quotes, no emojis.
- Maximum 750 characters total (Google's limit). Aim for 600-740 characters.
- Warm, professional, trustworthy tone. First-person plural ("we", "our team").
- Lead with what the business does and who they serve.
- Naturally weave in 3-5 key services and the primary service area(s).
- Mention 1-2 trust signals (licensed, insured, family-owned, years in business, etc.) ONLY if supported by the inputs.
- End with a soft call-to-action (e.g., "Call us today for a free estimate.").
- Do NOT include the phone number, website URL, or address — Google displays those separately.
- Do NOT invent specific facts (years in business, certifications, awards) that aren't in the inputs.
- Do NOT use promotional fluff ("best", "#1", "world-class"). Sound authentic.`;

    const userPrompt = `Business Name: ${businessName || '(unknown)'}
Industry: ${industry || '(unknown)'}
Location: ${address || '(unknown)'}

Services:
${services || '(none provided)'}

Service Areas:
${serviceAreas || '(none provided)'}

About Us:
${aboutUs || '(none provided)'}

Trust Signals:
${trustBar || '(none provided)'}

Website: ${website || '(none)'}
Phone: ${phone || '(none)'}

Write the Google Business Profile description now.`;

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
      }),
    });

    if (aiRes.status === 429) {
      return jsonRes({ error: 'Rate limit exceeded. Please try again in a moment.' }, 429);
    }
    if (aiRes.status === 402) {
      return jsonRes({ error: 'AI credits exhausted. Add credits in Workspace settings.' }, 402);
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return jsonRes({ error: 'AI generation failed', details: txt }, 500);
    }

    const aiJson = await aiRes.json();
    let description: string = aiJson?.choices?.[0]?.message?.content?.trim() || '';

    // Hard cap at 750 chars to respect Google limit.
    if (description.length > 750) {
      description = description.slice(0, 747).trimEnd() + '…';
    }

    return jsonRes({ description });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonRes({ error: msg }, 500);
  }
});
