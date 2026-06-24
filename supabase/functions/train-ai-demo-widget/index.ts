// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  url: z.string().url(),
  locationId: z.string().optional(),
  widgetId: z.string().optional(),
});

const WIDGET_ID = '6a3be0987de81c3360287a78';
const MAX_PAGES = 8;
const FETCH_TIMEOUT_MS = 8000;

const cache = new Map<string, { ts: number; payload: any }>();

const stripHtml = (html: string) => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const fetchWithTimeout = async (url: string, timeout = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'JunieAiDemoBot/1.0 (+https://juniesystems.com)' },
      redirect: 'follow',
    });
    return res;
  } finally {
    clearTimeout(t);
  }
};

const discoverLinks = (html: string, origin: string): string[] => {
  const links = new Set<string>();
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const href = m[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
      const u = new URL(href, origin);
      if (u.origin === origin) links.add(u.toString().split('#')[0]);
    } catch (_) { /* ignore */ }
    if (links.size > 50) break;
  }
  return Array.from(links);
};

const crawl = async (startUrl: string): Promise<{ url: string; title: string; text: string }[]> => {
  const start = new URL(startUrl);
  const origin = start.origin;
  const pages: { url: string; title: string; text: string }[] = [];
  const visited = new Set<string>();

  // Try sitemap first
  let queue: string[] = [start.toString()];
  try {
    const smRes = await fetchWithTimeout(`${origin}/sitemap.xml`, 4000);
    if (smRes.ok) {
      const xml = await smRes.text();
      const locs = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]);
      if (locs.length) queue = [start.toString(), ...locs.filter((u) => u.startsWith(origin))];
    }
  } catch (_) { /* ignore */ }

  while (queue.length && pages.length < MAX_PAGES) {
    const next = queue.shift()!;
    if (visited.has(next)) continue;
    visited.add(next);
    try {
      const res = await fetchWithTimeout(next);
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html')) continue;
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : next;
      const text = stripHtml(html).slice(0, 6000);
      pages.push({ url: next, title, text });
      if (pages.length === 1) {
        const found = discoverLinks(html, origin);
        for (const link of found) if (!visited.has(link)) queue.push(link);
      }
    } catch (_) { /* ignore */ }
  }
  return pages;
};

const summarizeWithAi = async (pages: { url: string; title: string; text: string }[], targetUrl: string): Promise<string> => {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY missing');

  const corpus = pages.map((p) => `# ${p.title}\nURL: ${p.url}\n${p.text}`).join('\n\n---\n\n').slice(0, 60000);

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Lovable-API-Key': lovableKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You build knowledge-base documents for AI chat widgets that represent local home-service businesses. Produce a concise, factual, well-structured markdown doc the bot can quote from. Never invent facts that are not in the source material.' },
        { role: 'user', content: `Source website: ${targetUrl}\n\nUsing only the content below, produce a knowledge-base document with these sections:\n- Business Overview\n- Services Offered\n- Service Area / Locations\n- Pricing or Quoting Notes (only if mentioned)\n- Frequently Asked Questions (8-12 Q&A pairs based on the content)\n- Booking & Contact Instructions\n- Brand Voice & Tone Guidelines\n\nCONTENT:\n${corpus}` },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
};

const pushToGhl = async (locationId: string, widgetId: string, doc: string, sourceUrl: string) => {
  const pit = Deno.env.get('AI_DEMO_PIT');
  if (!pit) return { ok: false, skipped: true, reason: 'AI_DEMO_PIT not configured' };

  // Best-effort: try GHL knowledge base document endpoint.
  // GHL's KB API for widgets is under iteration; we try the documented shape and return upstream errors verbatim.
  const endpoint = `https://services.leadconnectorhq.com/conversations/ai-agents/knowledge-base/documents`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pit}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        widgetId,
        title: `Auto-trained: ${sourceUrl}`,
        content: doc,
        sourceUrl,
      }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch (_) { /* keep raw */ }
    return { ok: res.ok, status: res.status, body: json ?? text };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = parsed.data;
    const widgetId = parsed.data.widgetId || WIDGET_ID;
    const locationId = parsed.data.locationId || Deno.env.get('AI_DEMO_LOCATION_ID') || '';

    // 60s cache to avoid duplicate runs
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < 60_000) {
      return new Response(JSON.stringify({ ...cached.payload, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const t0 = Date.now();
    const pages = await crawl(url);
    const t1 = Date.now();
    if (!pages.length) {
      return new Response(JSON.stringify({ error: 'Could not crawl any pages from this URL.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const doc = await summarizeWithAi(pages, url);
    const t2 = Date.now();

    const push = locationId
      ? await pushToGhl(locationId, widgetId, doc, url)
      : { ok: false, skipped: true, reason: 'No locationId provided; KB push skipped.' };
    const t3 = Date.now();

    const payload = {
      ok: true,
      widgetId,
      pagesCrawled: pages.map((p) => ({ url: p.url, title: p.title })),
      knowledgePreview: doc.slice(0, 800),
      knowledgeLength: doc.length,
      ghl: push,
      timings: { crawlMs: t1 - t0, aiMs: t2 - t1, ghlMs: t3 - t2, totalMs: t3 - t0 },
    };
    cache.set(url, { ts: Date.now(), payload });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
