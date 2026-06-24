// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  url: z.string().url(),
  locationId: z.string().optional(),
  contactId: z.string().optional(),
});

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

// ---- Site crawl + AI summarize (KB embedded into agent instructions) ----
const MAX_PAGES = 500;
const FETCH_TIMEOUT_MS = 10000;
const PER_PAGE_CHARS = 18000;
const CRAWL_BUDGET_MS = 90_000;
const CONCURRENCY = 8;
const SKIP_EXT = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|wav|zip|rar|css|js|woff2?|ttf|eot|xml|json)$/i;
const BLOG_PATH = /(^|\/)(blog|blogs|news|articles?|posts?|insights?|stories|press|category|categories|tag|tags|author|authors|archive|archives)(\/|$)/i;
const isBlogUrl = (u: string) => { try { return BLOG_PATH.test(new URL(u).pathname); } catch { return false; } };

const stripHtml = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const fetchWithTimeout = async (url: string, timeout = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'JunieAiDemoBot/1.0 (+https://juniesystems.com)' },
      redirect: 'follow',
    });
  } finally { clearTimeout(t); }
};

const discoverLinks = (html: string, origin: string): string[] => {
  const links = new Set<string>();
  const re = /<a[^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const href = m[1];
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      const u = new URL(href, origin);
      if (u.origin !== origin) continue;
      if (SKIP_EXT.test(u.pathname)) continue;
      if (BLOG_PATH.test(u.pathname)) continue;
      links.add(u.toString().split('#')[0]);
    } catch (_) {}
  }
  return Array.from(links);
};

const crawl = async (startUrl: string) => {
  const start = new URL(startUrl);
  const origin = start.origin;
  const deadline = Date.now() + CRAWL_BUDGET_MS;
  const pages: { url: string; title: string; text: string }[] = [];
  const visited = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];
  const enqueue = (u: string) => { if (!queued.has(u) && !visited.has(u)) { queued.add(u); queue.push(u); } };
  enqueue(start.toString());

  const fetchOne = async (next: string) => {
    visited.add(next);
    try {
      const res = await fetchWithTimeout(next);
      if (!res.ok) return;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html')) return;
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : next;
      pages.push({ url: next, title, text: stripHtml(html).slice(0, PER_PAGE_CHARS) });
      for (const link of discoverLinks(html, origin)) enqueue(link);
    } catch (_) {}
  };

  while (queue.length && pages.length < MAX_PAGES && Date.now() < deadline) {
    const batch: string[] = [];
    while (batch.length < CONCURRENCY && queue.length && pages.length + batch.length < MAX_PAGES) batch.push(queue.shift()!);
    await Promise.all(batch.map(fetchOne));
  }
  return pages;
};

const summarizeWithAi = async (pages: { url: string; title: string; text: string }[], targetUrl: string) => {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY missing');
  const corpus = pages.map((p) => `# ${p.title}\nURL: ${p.url}\n${p.text}`).join('\n\n---\n\n').slice(0, 220000);
  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Lovable-API-Key': lovableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { role: 'system', content: 'You build exhaustive knowledge-base documents for AI chat widgets that represent local home-service businesses. Preserve every concrete detail. Never invent facts. Begin with a single line: BUSINESS_NAME: <name>.' },
        { role: 'user', content: `Source website: ${targetUrl}\n\nUsing ONLY the content below, produce a detailed markdown knowledge base (2,500-5,000 words) covering: Business Overview; Services (one sub-section each with what's included, process, materials, timeline, pricing if mentioned); Service Area; Pricing/Quotes/Financing; Guarantees/Warranties/Licensing/Insurance; Hours & Emergency availability; Booking & Contact (phone, email, address); 20-30 FAQs; Reviews/Testimonials (verbatim); Brand Voice. If something isn't covered, write "Not specified on the website — offer to have a team member follow up." Do not invent.\n\nCONTENT:\n${corpus}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const summary = data.choices?.[0]?.message?.content ?? '';
  const nameMatch = summary.match(/BUSINESS_NAME:\s*(.+)/i);
  const businessName = (nameMatch?.[1] || new URL(targetUrl).hostname.replace(/^www\./, '')).trim();
  const rawAppendix = `\n\n=== RAW WEBSITE CONTENT (verbatim, for fact lookup) ===\n${corpus}`;
  return { doc: `${summary}${rawAppendix}`, businessName };
};

const ghlFetch = async (path: string, init: RequestInit) => {
  const pit = Deno.env.get('AI_DEMO_PIT');
  if (!pit) throw new Error('AI_DEMO_PIT not configured');
  const res = await fetch(`${GHL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pit}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch (_) { body = text; }
  return { ok: res.ok, status: res.status, body };
};

const pickId = (body: any): string =>
  body?.id || body?._id ||
  body?.knowledgeBase?.id || body?.knowledgeBase?._id ||
  body?.agent?.id || body?.agent?._id ||
  body?.widget?.id || body?.widget?._id ||
  body?.data?.id || body?.data?._id || '';

const createDemoContact = async (locationId: string, businessName: string) => {
  const r = await ghlFetch('/contacts/', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      firstName: 'Demo',
      lastName: `${businessName} ${Date.now()}`,
      source: 'AI Demo Widget',
      tags: ['ai-demo'],
    }),
  });
  const id = r.body?.contact?.id || r.body?.contact?._id || pickId(r.body);
  return { res: r, id };
};

// --- Agent / Widget creation ---

const createAgent = async (params: { locationId: string; name: string; knowledgeDoc: string; businessName: string; websiteUrl: string }) => {
  const { locationId, name, knowledgeDoc, businessName, websiteUrl } = params;
  const knowledge = (knowledgeDoc || '').slice(0, 30000);
  const r = await ghlFetch('/conversation-ai/agents', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      name,
      businessName,
      channels: ['Live_Chat', 'WebChat'],
      status: 'active',
      botMode: 'autopilot',
      mode: 'auto-pilot',
      isPrimary: false,
      waitTime: 1,
      waitTimeUnit: 'seconds',
      personality: 'Warm, friendly, concise, professional. Speaks like a knowledgeable front-desk teammate at a local home-service business.',
      goal: `Help website visitors of ${businessName} (${websiteUrl}) get accurate answers about services, pricing, and service area, and capture leads or book appointments.`,
      instructions: `You are the live-chat AI assistant for ${businessName} (${websiteUrl}). Answer using ONLY the knowledge below. If something isn't covered, say you'll have a team member follow up and ask for the visitor's name, phone, and email. Be brief (2-4 sentences). Never invent prices, hours, or guarantees.\n\n=== BUSINESS KNOWLEDGE ===\n${knowledge}\n=== END KNOWLEDGE ===`,
      respondToImages: false,
      respondToAudio: false,
    }),
  });
  if (!r.ok) throw new Error(`Agent create failed ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
  const id = pickId(r.body);
  if (!id) throw new Error(`Agent create returned no id: ${JSON.stringify(r.body).slice(0, 400)}`);
  return id;
};

const createChatWidget = async (params: { locationId: string; name: string; agentId: string }) => {
  const { locationId, name, agentId } = params;
  const r = await ghlFetch('/chat-widget/', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      name,
      widgetType: 'live_chat',
      enableConversationAi: true,
      conversationAiBotId: agentId,
    }),
  });
  if (!r.ok) throw new Error(`Widget create failed ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
  const id = pickId(r.body);
  const embed =
    r.body?.embedScript ||
    r.body?.embed_script ||
    r.body?.widget?.embedScript ||
    r.body?.data?.embedScript ||
    (id ? `<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="${id}"></script>` : '');
  if (!id && !embed) throw new Error(`Widget create returned no id/embed: ${JSON.stringify(r.body).slice(0, 400)}`);
  return { id, embed };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // GET: load an existing session by contact_id or website.
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
      const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      let q = supa.from('demo_sessions').select('*').order('created_at', { ascending: false }).limit(1);
      if (contactId) q = q.eq('ghl_contact_id', contactId);
      else q = q.eq('prospect_url', website);
      const { data: rows, error } = await q;
      if (error) throw error;
      const data = rows?.[0];
      if (!data) {
        return new Response(JSON.stringify({ ok: false, error: 'session not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        loaded: true,
        contactId: data.ghl_contact_id,
        agentId: data.ghl_agent_id,
        kbId: data.ghl_kb_id,
        widgetId: data.ghl_widget_id,
        widgetEmbed: data.widget_embed,
        locationId: data.ghl_location_id,
        url: data.prospect_url,
        businessName: data.business_name,
        knowledgeDoc: data.knowledge_doc,
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
    if (!locationId) {
      return new Response(JSON.stringify({ error: 'AI_DEMO_LOCATION_ID not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const requestedContactId = (parsed.data.contactId || '').trim();

    const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Reuse existing demo for this contact_id or prospect_url instead of provisioning new GHL resources.
    {
      const filters: string[] = [];
      if (requestedContactId) filters.push(`ghl_contact_id.eq.${requestedContactId}`);
      if (url) filters.push(`prospect_url.eq.${url}`);
      if (filters.length) {
        const { data: existingRows } = await supa
          .from('demo_sessions')
          .select('*')
          .or(filters.join(','))
          .order('created_at', { ascending: false })
          .limit(1);
        const existing = existingRows?.[0];
        if (existing && existing.ghl_widget_id) {
          // If the lookup was by url only, make sure the requested contact is also bound to this demo.
          if (requestedContactId && requestedContactId !== existing.ghl_contact_id) {
            await supa.from('demo_sessions').upsert({
              ghl_contact_id: requestedContactId,
              ghl_agent_id: existing.ghl_agent_id,
              ghl_kb_id: existing.ghl_kb_id,
              ghl_widget_id: existing.ghl_widget_id,
              widget_embed: existing.widget_embed,
              ghl_location_id: existing.ghl_location_id,
              prospect_url: existing.prospect_url,
              business_name: existing.business_name,
              knowledge_doc: null,
            }, { onConflict: 'ghl_contact_id' });
          }
          return new Response(JSON.stringify({
            ok: true,
            reused: true,
            businessName: existing.business_name,
            kbId: existing.ghl_kb_id,
            agentId: existing.ghl_agent_id,
            widgetId: existing.ghl_widget_id,
            widgetEmbed: existing.widget_embed,
            contactId: existing.ghl_contact_id,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    const fallbackName = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Demo'; } })();
    const t0 = Date.now();

    // 1) Crawl prospect site
    const pages = await crawl(url);
    if (!pages.length) {
      return new Response(JSON.stringify({ error: 'Could not crawl any pages from this URL.' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const t1 = Date.now();

    // 2) Summarize into knowledge doc
    const { doc, businessName } = await summarizeWithAi(pages, url);
    const labelBase = `${businessName || fallbackName} ${new Date().toISOString().slice(0, 16)}`;
    const t2 = Date.now();

    // 3) Agent with knowledge embedded in instructions
    const agentId = await createAgent({
      locationId,
      name: `Demo Agent · ${labelBase}`,
      knowledgeDoc: doc,
      businessName: businessName || fallbackName,
      websiteUrl: url,
    });
    const t3 = Date.now();

    // 4) Widget with agent attached
    const widget = await createChatWidget({
      locationId,
      name: `Demo Widget · ${labelBase}`,
      agentId,
    });
    const t4 = Date.now();

    // 5) Fresh demo contact + persist
    const contactCreate = await createDemoContact(locationId, businessName || fallbackName);
    const contactId = contactCreate.id;
    const t5 = Date.now();

    const sessionRows = [contactId, requestedContactId]
      .filter((id, i, all) => id && all.indexOf(id) === i)
      .map((id) => ({
        ghl_contact_id: id,
        ghl_agent_id: agentId,
        ghl_kb_id: null,
        ghl_widget_id: widget.id || null,
        widget_embed: widget.embed,
        ghl_location_id: locationId,
        prospect_url: url,
        business_name: businessName || fallbackName,
        knowledge_doc: doc,
      }));

    if (sessionRows.length) {
      const { error: sessionError } = await supa
        .from('demo_sessions')
        .upsert(sessionRows, { onConflict: 'ghl_contact_id' });
      if (sessionError) throw sessionError;
    }

    return new Response(JSON.stringify({
      ok: true,
      businessName: businessName || fallbackName,
      agentId,
      widgetId: widget.id,
      widgetEmbed: widget.embed,
      contactId,
      pagesCrawled: pages.length,
      timings: { crawlMs: t1 - t0, aiMs: t2 - t1, agentMs: t3 - t2, widgetMs: t4 - t3, contactMs: t5 - t4, totalMs: t5 - t0 },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
