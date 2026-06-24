// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  url: z.string().url(),
  locationId: z.string().optional(),
  calendarId: z.string().optional(),
});

const MAX_PAGES = 8;
const FETCH_TIMEOUT_MS = 8000;
const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';
const AGENT_NAME_PREFIX = 'Demo Agent · ';

const cache = new Map<string, { ts: number; payload: any }>();

const stripHtml = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const fetchWithTimeout = async (url: string, timeout = FETCH_TIMEOUT_MS, init?: RequestInit) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'JunieAiDemoBot/1.0 (+https://juniesystems.com)' },
      redirect: 'follow',
      ...init,
    });
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

const crawl = async (startUrl: string) => {
  const start = new URL(startUrl);
  const origin = start.origin;
  const pages: { url: string; title: string; text: string }[] = [];
  const visited = new Set<string>();

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

const summarizeWithAi = async (pages: { url: string; title: string; text: string }[], targetUrl: string) => {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY missing');

  const corpus = pages.map((p) => `# ${p.title}\nURL: ${p.url}\n${p.text}`).join('\n\n---\n\n').slice(0, 60000);

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Lovable-API-Key': lovableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You build knowledge-base documents for AI chat widgets that represent local home-service businesses. Produce a concise, factual, well-structured markdown doc the bot can quote from. Never invent facts. Begin with a single line: BUSINESS_NAME: <name>.' },
        { role: 'user', content: `Source website: ${targetUrl}\n\nUsing only the content below, produce a knowledge-base document with these sections:\n- Business Overview\n- Services Offered\n- Service Area / Locations\n- Pricing or Quoting Notes (only if mentioned)\n- FAQs (8-12 Q&A pairs)\n- Booking & Contact Instructions\n- Brand Voice & Tone Guidelines\n\nCONTENT:\n${corpus}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const doc = data.choices?.[0]?.message?.content ?? '';
  const nameMatch = doc.match(/BUSINESS_NAME:\s*(.+)/i);
  const businessName = (nameMatch?.[1] || new URL(targetUrl).hostname).trim();
  return { doc, businessName };
};

const ghlFetch = async (path: string, init: RequestInit) => {
  const pit = Deno.env.get('AI_DEMO_PIT');
  if (!pit) throw new Error('AI_DEMO_PIT not configured');
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${pit}`,
      'Version': GHL_VERSION,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch (_) { body = text; }
  return { ok: res.ok, status: res.status, body };
};

const createKnowledgeBase = async (locationId: string, name: string, content: string, sourceUrl: string) => {
  // Try multiple known/likely GHL KB endpoints in order; return first success.
  const attempts: { path: string; body: any }[] = [
    {
      path: '/conversations/ai-agents/knowledge-base',
      body: { locationId, name, documents: [{ title: name, content, sourceUrl }] },
    },
    {
      path: '/conversations/knowledge-base',
      body: { locationId, name, documents: [{ title: name, content, sourceUrl }] },
    },
    {
      path: '/conversations/ai-agents/knowledge-base/documents',
      body: { locationId, title: name, content, sourceUrl },
    },
  ];
  const errors: any[] = [];
  for (const a of attempts) {
    const r = await ghlFetch(a.path, { method: 'POST', body: JSON.stringify(a.body) });
    if (r.ok) {
      const kb = r.body;
      const id = kb?.id || kb?.knowledgeBaseId || kb?.knowledgeBase?.id || kb?.data?.id;
      return { ok: true, id, raw: kb, endpoint: a.path };
    }
    errors.push({ endpoint: a.path, status: r.status, body: r.body });
  }
  return { ok: false, errors };
};

const createConversationAgent = async (params: {
  locationId: string;
  name: string;
  businessName: string;
  knowledgeBaseId?: string;
  calendarId?: string;
}) => {
  const { locationId, name, businessName, knowledgeBaseId, calendarId } = params;
  const body: any = {
    locationId,
    name,
    status: 'active',
    isPrimary: true,
    channels: ['live_chat'],
    botMode: 'autopilot',
    responseDelay: 1,
    maxMessages: 20,
    botGoal: `You are a helpful AI assistant for ${businessName}. Answer questions about the business using ONLY the linked knowledge base, qualify leads, and book appointments when asked. Be friendly, concise, and professional. If you don't know something, say so and offer to connect the visitor with a team member.`,
  };
  if (knowledgeBaseId) body.knowledgeBaseId = knowledgeBaseId;
  if (calendarId) body.appointmentBooking = { enabled: true, calendarId };

  return await ghlFetch('/conversation-ai/agents', { method: 'POST', body: JSON.stringify(body) });
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { url } = parsed.data;
    const locationId = parsed.data.locationId || Deno.env.get('AI_DEMO_LOCATION_ID') || '';
    const calendarId = parsed.data.calendarId || Deno.env.get('AI_DEMO_CALENDAR_ID') || '';

    if (!locationId) {
      return new Response(JSON.stringify({ error: 'AI_DEMO_LOCATION_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { doc, businessName } = await summarizeWithAi(pages, url);
    const t2 = Date.now();

    const kbName = `Auto-trained: ${businessName} (${new URL(url).hostname})`;
    const kb = await createKnowledgeBase(locationId, kbName, doc, url);
    const t3 = Date.now();

    const agent = await createConversationAgent({
      locationId,
      name: `Demo Agent · ${businessName}`,
      businessName,
      knowledgeBaseId: kb.ok ? kb.id : undefined,
      calendarId: calendarId || undefined,
    });
    const t4 = Date.now();

    const payload = {
      ok: true,
      businessName,
      pagesCrawled: pages.map((p) => ({ url: p.url, title: p.title })),
      knowledgePreview: doc.slice(0, 800),
      knowledgeLength: doc.length,
      kb,
      agent,
      timings: { crawlMs: t1 - t0, aiMs: t2 - t1, kbMs: t3 - t2, agentMs: t4 - t3, totalMs: t4 - t0 },
    };
    cache.set(url, { ts: Date.now(), payload });

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
