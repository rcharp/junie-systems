// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const MAX_PAGES = 40;
const BLOG_RE = /\/(blog|posts?|news|articles?|tag|category|author)(\/|$)/i;
const ASSET_RE = /\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|mp4|mp3|css|js|ico|woff2?)(\?|$)/i;
const MAX_CHARS_PER_PAGE = 6000;
const MAX_TOTAL_CHARS = 120000;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 JunieDemoBot' } });
    if (!r.ok) return '';
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return '';
    return await r.text();
  } catch {
    return '';
  }
}

function extractLinks(html: string, base: URL): string[] {
  const links = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname !== base.hostname) continue;
      if (ASSET_RE.test(u.pathname)) continue;
      if (BLOG_RE.test(u.pathname)) continue;
      u.hash = '';
      u.search = '';
      links.add(u.toString());
    } catch {}
  }
  return [...links];
}

async function crawlSite(startUrl: string): Promise<{ url: string; text: string }[]> {
  const base = new URL(startUrl);
  const seen = new Set<string>([base.toString()]);
  const queue = [base.toString()];
  const pages: { url: string; text: string }[] = [];
  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    const html = await fetchPage(url);
    if (!html) continue;
    const text = htmlToText(html);
    if (text.length > 200) pages.push({ url, text: text.slice(0, MAX_CHARS_PER_PAGE) });
    for (const link of extractLinks(html, base)) {
      if (!seen.has(link) && seen.size < MAX_PAGES * 3) {
        seen.add(link);
        queue.push(link);
      }
    }
  }
  return pages;
}

async function summarizeBusiness(url: string, pages: { url: string; text: string }[]): Promise<string> {
  let combined = '';
  for (const p of pages) {
    const block = `\n\n=== ${p.url} ===\n${p.text}`;
    if (combined.length + block.length > MAX_TOTAL_CHARS) break;
    combined += block;
  }

  const system = `You are a research analyst building a knowledge base for an AI receptionist. Extract every concrete fact about the business from the crawled pages. Output a detailed, well-organized markdown document the AI will use to answer customer questions.

Required sections (omit a section only if truly nothing was found):
# Business Overview
# Services Offered  (bullet every service, with any details/sub-services)
# Pricing  (any prices, packages, fees, minimums, financing)
# Service Areas  (cities, regions, ZIPs, radius)
# Hours of Operation
# Contact & Booking  (phone, email, address, booking links)
# About / Team
# Guarantees & Policies  (warranties, satisfaction, insurance, licenses)
# FAQ  (every question/answer you can infer from the site)
# Other Notable Info

Rules:
- Be exhaustive. Capture specifics: numbers, prices, brand names, certifications, response times.
- Use only facts from the source text. Do NOT invent.
- Keep it scannable: short bullets, clear headings.`;

  const user = `Source website: ${url}\n\nCrawled pages:\n${combined}`;

  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Summarize failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? '';
}

async function processDemo(contactId: string, url: string, businessName: string) {
  console.log(`[demo-build-kb] starting ${contactId} ${url}`);
  const pages = await crawlSite(url);
  console.log(`[demo-build-kb] crawled ${pages.length} pages`);
  if (!pages.length) {
    await sb.from('demo_sessions').update({
      knowledge_doc: `(Could not crawl ${url})`,
      updated_at: new Date().toISOString(),
    }).eq('ghl_contact_id', contactId);
    return;
  }
  const doc = await summarizeBusiness(url, pages);
  console.log(`[demo-build-kb] knowledge_doc ${doc.length} chars`);
  await sb.from('demo_sessions').update({
    knowledge_doc: doc,
    business_name: businessName,
    updated_at: new Date().toISOString(),
  }).eq('ghl_contact_id', contactId);
  console.log(`[demo-build-kb] done ${contactId}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method === 'GET') {
      const u = new URL(req.url);
      const contactId = u.searchParams.get('contact_id') || u.searchParams.get('contactId');
      if (!contactId) return Response.json({ ok: false, error: 'contact_id required' }, { status: 400, headers: corsHeaders });
      const { data } = await sb.from('demo_sessions').select('*').eq('ghl_contact_id', contactId).maybeSingle();
      if (!data) return Response.json({ ok: false, error: 'session not found' }, { status: 404, headers: corsHeaders });
      return Response.json({
        ok: true,
        contactId,
        url: data.prospect_url,
        businessName: data.business_name,
        ready: !!data.knowledge_doc,
        knowledgeChars: data.knowledge_doc?.length ?? 0,
      }, { headers: corsHeaders });
    }

    const body = await req.json();
    const rawUrl: string = body.url;
    const contactId: string = body.contactId || body.contact_id;
    if (!rawUrl || !contactId) {
      return Response.json({ ok: false, error: 'url and contactId required' }, { status: 400, headers: corsHeaders });
    }
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const businessName = new URL(url).hostname.replace(/^www\./, '');

    // Upsert row immediately so the demo can load while crawl runs
    await sb.from('demo_sessions').upsert(
      {
        ghl_contact_id: contactId,
        prospect_url: url,
        business_name: businessName,
        knowledge_doc: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'ghl_contact_id' },
    );

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(processDemo(contactId, url, businessName).catch((e) => console.error('[demo-build-kb] bg error', e)));

    return Response.json({ ok: true, contactId, url, businessName, status: 'processing' }, { headers: corsHeaders });
  } catch (e: any) {
    console.error('[demo-build-kb] error', e);
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
