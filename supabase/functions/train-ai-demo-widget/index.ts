// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';


const BodySchema = z.object({
  url: z.string().url(),
  locationId: z.string().optional(),
  calendarId: z.string().optional(),
  contactId: z.string().optional(),
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

const extractContactId = (res: any): string =>
  res?.body?.contact?.id ||
  res?.body?.contact?._id ||
  res?.body?.id ||
  res?.body?._id ||
  '';

const contactExists = async (contactId: string) => {
  if (!contactId) return false;
  try {
    const res = await ghlFetch(`/contacts/${encodeURIComponent(contactId)}`, { method: 'GET' });
    return Boolean(res.ok);
  } catch (_) {
    return false;
  }
};

const createDemoContact = async (locationId: string, businessName: string) =>
  await ghlFetch('/contacts/', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      firstName: 'Demo',
      lastName: `${businessName} ${Date.now()}`,
      source: 'AI Demo Widget',
      tags: ['ai-demo'],
    }),
  });

// Find prior demo agents on this location so we can clean them up.
const listAgents = async (locationId: string) => {
  // GHL list agents is GET /conversation-ai/agents?locationId=... — best-effort.
  const r = await ghlFetch(`/conversation-ai/agents?locationId=${encodeURIComponent(locationId)}&limit=100`, { method: 'GET' });
  if (!r.ok) return [];
  const list = (r.body?.agents || r.body?.data || r.body || []) as any[];
  return Array.isArray(list) ? list : [];
};

const deleteAgent = async (agentId: string) => {
  return await ghlFetch(`/conversation-ai/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE' });
};

const createConversationAgent = async (params: {
  name: string;
  businessName: string;
  knowledgeDoc: string;
  websiteUrl: string;
}) => {
  const { name, businessName, knowledgeDoc, websiteUrl } = params;
  // GHL `instructions` is the most reliable place to put trained content because the
  // public KB-create endpoint isn't exposed. Cap to ~30k chars to stay well under limits.
  const knowledge = knowledgeDoc.slice(0, 30000);
  const body = {
    name,
    businessName,
    mode: 'auto-pilot',
    channels: ['WebChat', 'Live_Chat'],
    isPrimary: false,
    waitTime: 1,
    waitTimeUnit: 'seconds',
    sleepEnabled: false,
    personality: 'Warm, friendly, concise, and professional. Speaks like a knowledgeable front-desk teammate at a local home-service business.',
    goal: `Help website visitors of ${businessName} get accurate answers about services, pricing, and service area, and capture leads or book appointments.`,
    instructions: `You are the live-chat AI assistant for ${businessName} (website: ${websiteUrl}). Answer using ONLY the knowledge below. If something isn't covered, say you'll have a team member follow up and ask for the visitor's name, phone, and email. Be brief (2-4 sentences). Never invent prices, hours, or guarantees.\n\n=== BUSINESS KNOWLEDGE ===\n${knowledge}\n=== END KNOWLEDGE ===`,
    autoPilotMaxMessages: 75,
    respondToImages: false,
    respondToAudio: false,
  };

  return await ghlFetch('/conversation-ai/agents', { method: 'POST', body: JSON.stringify(body) });
};


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // GET: load an existing demo session by contact_id (and/or website).
  // Used by the /ai-demo page to hydrate the widget without re-training.
  if (req.method === 'GET') {
    try {
      const u = new URL(req.url);
      const contactId = u.searchParams.get('contact_id') || u.searchParams.get('contactId') || '';
      const website = u.searchParams.get('website') || u.searchParams.get('url') || '';
      if (!contactId && !website) {
        return new Response(JSON.stringify({ error: 'contact_id or website required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const supa = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      let q = supa.from('demo_sessions').select('*').order('created_at', { ascending: false }).limit(1);
      if (contactId) q = q.eq('ghl_contact_id', contactId);
      else q = q.eq('prospect_url', website);
      const { data: rows, error } = await q;
      if (error) throw error;
      let data = rows?.[0];
      if (!data) {
        return new Response(JSON.stringify({ ok: false, error: 'session not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Every page load should start a brand-new conversation, which in GHL
      // means a brand-new contact (contacts own conversation history). Mint a
      // fresh contact and bind it to the same trained KB/agent.
      const contactRes = await createDemoContact(data.ghl_location_id, data.business_name || 'Demo');
      const newContactId = extractContactId(contactRes);
      if (newContactId) {
        await supa.from('demo_sessions').upsert({
          ghl_contact_id: newContactId,
          ghl_agent_id: data.ghl_agent_id,
          ghl_location_id: data.ghl_location_id,
          prospect_url: data.prospect_url,
          business_name: data.business_name,
          knowledge_doc: data.knowledge_doc,
        }, { onConflict: 'ghl_contact_id' });
        data = { ...data, ghl_contact_id: newContactId };
      }


      return new Response(JSON.stringify({
        ok: true,
        loaded: true,
        contactId: data.ghl_contact_id,
        agentId: data.ghl_agent_id,
        locationId: data.ghl_location_id,
        url: data.prospect_url,
        businessName: data.business_name,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

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

    const requestedContactId = (parsed.data.contactId || '').trim();


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

    // Clean up prior demo agents on this location so each run gets a fresh, primary agent.
    const existing = await listAgents(locationId);
    const stale = existing.filter((a) => typeof a?.name === 'string' && a.name.startsWith(AGENT_NAME_PREFIX));
    const deletions = await Promise.all(stale.map((a) => deleteAgent(a.id || a._id).catch((e) => ({ ok: false, error: String(e) }))));
    const t3 = Date.now();

    const agentRes = await createConversationAgent({
      name: `${AGENT_NAME_PREFIX}${businessName}`,
      businessName,
      knowledgeDoc: doc,
      websiteUrl: url,
    });
    const t4 = Date.now();

    // Preserve old demo session rows so any posted contactId can still resolve
    // to the matching trained knowledge base. If a caller provides contactId,
    // bind the KB to that contact instead of creating a replacement contact.
    const canReuseRequestedContact = requestedContactId && await contactExists(requestedContactId);
    const contactCreateRes = canReuseRequestedContact
      ? { ok: true, status: 200, body: { reused: true, id: requestedContactId } }
      : await createDemoContact(locationId, businessName);

    const contactId: string =
      (canReuseRequestedContact ? requestedContactId : '') || extractContactId(contactCreateRes);
    const t4b = Date.now();

    const agentId =
      agentRes?.body?.agent?.id ||
      agentRes?.body?.agent?._id ||
      agentRes?.body?.id ||
      agentRes?.body?._id ||
      null;

    const contactRes: any = contactCreateRes;
    if (agentId && contactId) {
      const supa = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await supa.from('demo_sessions').upsert({
        ghl_contact_id: contactId,
        ghl_agent_id: agentId,
        ghl_location_id: locationId,
        prospect_url: url,
        business_name: businessName,
        knowledge_doc: doc,
      }, { onConflict: 'ghl_contact_id' });
    }
    const t5 = Date.now();


    const payload = {
      ok: true,
      businessName,
      pagesCrawled: pages.map((p) => ({ url: p.url, title: p.title })),
      knowledgePreview: doc.slice(0, 800),
      knowledgeLength: doc.length,
      cleanedUp: { count: stale.length, deletions },
      agent: agentRes,
      agentId,
      contactId,
      contact: contactRes,
      timings: { crawlMs: t1 - t0, aiMs: t2 - t1, cleanupMs: t3 - t2, agentMs: t4 - t3, contactMs: t5 - t4, totalMs: t5 - t0 },
    };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
