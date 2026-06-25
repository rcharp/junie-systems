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
const GHL_VERSION = '2021-07-28';

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
      name,
      businessName,
      channels: ['Live_Chat', 'WebChat'],
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

const TEMPLATE_WIDGET_ID = Deno.env.get('AI_DEMO_TEMPLATE_WIDGET_ID') || '6a3be0987de81c3360287a78';

const createChatWidget = async (params: { locationId: string; name: string; agentId: string }) => {
  const { locationId, name, agentId } = params;

  // 1) Clone the template widget.
  const cloneRes = await ghlFetch(`/chat-widget/clone/${locationId}/${TEMPLATE_WIDGET_ID}`, {
    method: 'POST',
    headers: { Version: '2021-07-28' },
    body: JSON.stringify({ name }),
  });
  if (!cloneRes.ok) throw new Error(`Widget clone failed ${cloneRes.status}: ${JSON.stringify(cloneRes.body).slice(0, 400)}`);
  const id = pickId(cloneRes.body);
  if (!id) throw new Error(`Widget clone returned no id: ${JSON.stringify(cloneRes.body).slice(0, 400)}`);

  // 2) Rename + attach agent via PATCH.
  try {
    await ghlFetch(`/chat-widget/data/${locationId}/${id}`, {
      method: 'PATCH',
      headers: { Version: '2021-07-28' },
      body: JSON.stringify({
        name,
        settings: {
          heading: name,
          advanceSettings: { voiceAiAgent: { agentId } },
        },
        botId: agentId,
      }),
    });
  } catch (e) {
    console.warn('Widget patch failed (non-fatal):', e);
  }

  const embed =
    cloneRes.body?.embedScript ||
    cloneRes.body?.embed_script ||
    cloneRes.body?.widget?.embedScript ||
    cloneRes.body?.data?.embedScript ||
    `<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="${id}"></script>`;
  return { id, embed };
};

const getFallbackBusinessName = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Demo'; }
};

const findExistingSession = async (supa: any, contactId: string, url: string, includeUrlFallback = true) => {
  if (contactId) {
    const { data } = await supa
      .from('demo_sessions')
      .select('*')
      .eq('ghl_contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (data?.[0]) return data[0];
  }

  if (!includeUrlFallback) return null;

  const { data } = await supa
    .from('demo_sessions')
    .select('*')
    .eq('prospect_url', url)
    .order('created_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
};

const scheduleBackground = (promise: Promise<unknown>) => {
  promise.catch((e) => console.error('AI demo background job failed:', e));
  const edgeRuntime = (globalThis as any).EdgeRuntime;
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(promise);
};

const trainKnowledgeBaseWebsite = async (kbId: string, url: string, locationId: string) => {
  const discoverRes = await ghlFetch(`/knowledge-bases/crawler`, {
    method: 'POST',
    body: JSON.stringify({ knowledgeBaseId: kbId, url, locationId, option: 'Domain' }),
  });
  if (!discoverRes.ok) {
    console.warn('KB discover failed:', discoverRes.status, JSON.stringify(discoverRes.body).slice(0, 400));
    return { discovered: false, trained: false, trainedUrls: [] as string[] };
  }
  const discoverBody: any = discoverRes.body || {};
  const operationId: string | undefined = discoverBody.operationId || discoverBody.data?.operationId;
  console.log('KB discover ok, operationId:', operationId, 'status:', discoverBody.status);

  // Poll status until discovery completes
  let discoveredUrls: string[] = [];
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const qs = new URLSearchParams({ knowledgeBaseId: kbId, locationId });
    if (operationId) qs.set('operationId', operationId);
    const statusRes = await ghlFetch(`/knowledge-bases/crawler/status?${qs.toString()}`, { method: 'GET' });
    const b: any = statusRes.body || {};
    const status = (b.status || b.state || b.data?.status || '').toString().toLowerCase();
    const urls: string[] = b.urls || b.data?.urls || b.discoveredUrls || b.data?.discoveredUrls || b.links || b.data?.links || [];
    if (Array.isArray(urls) && urls.length) {
      discoveredUrls = urls.map((u: any) => (typeof u === 'string' ? u : u?.url)).filter(Boolean);
    }
    console.log(`KB status poll ${i + 1} [${statusRes.status}]: status=${status} urls=${discoveredUrls.length}`);
    if (['complete', 'completed', 'done', 'success', 'finished'].includes(status)) break;
    if (['failed', 'error'].includes(status)) {
      console.warn('KB discover status reported failure');
      break;
    }
  }

  if (!discoveredUrls.length) discoveredUrls = [url];

  const trainBody: Record<string, unknown> = {
    knowledgeBaseId: kbId,
    locationId,
    urls: discoveredUrls,
  };
  if (operationId) trainBody.operationId = operationId;

  const trainRes = await ghlFetch(`/knowledge-bases/crawler/train`, {
    method: 'POST',
    body: JSON.stringify(trainBody),
  });
  if (!trainRes.ok) {
    console.warn('KB train failed:', trainRes.status, JSON.stringify(trainRes.body).slice(0, 400));
    return { discovered: true, trained: false, trainedUrls: [] as string[] };
  }
  console.log('KB train ok, requested urls:', discoveredUrls.length, 'body:', JSON.stringify(trainRes.body).slice(0, 200));

  return { discovered: true, trained: true, trainedUrls: discoveredUrls };
};

const processDemoKnowledgeBase = async (params: { url: string; locationId: string; requestedContactId: string }) => {
  const { url, locationId, requestedContactId } = params;
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const fallbackName = getFallbackBusinessName(url);
  const kbName = requestedContactId || `Demo KB - ${fallbackName} - ${new Date().toISOString()}`;

  // If a KB with the same name already exists in this location, delete it first.
  try {
    const list = await ghlFetch(`/knowledge-base/?locationId=${locationId}&limit=100`, { method: 'GET' });
    const items: any[] =
      list.body?.knowledgeBases || list.body?.data?.knowledgeBases ||
      list.body?.data || list.body?.items || [];
    const existing = Array.isArray(items) ? items.filter((k) => (k?.name || '').trim() === kbName.trim()) : [];
    for (const k of existing) {
      const existingId = k.id || k._id;
      if (!existingId) continue;
      const del = await ghlFetch(`/knowledge-base/${existingId}?locationId=${locationId}`, { method: 'DELETE' });
      console.log(`Deleted existing KB ${existingId} (${kbName}):`, del.status);
    }
  } catch (e) {
    console.warn('KB lookup/delete failed (non-fatal):', e);
  }

  const kbCreate = await ghlFetch('/knowledge-base/', {
    method: 'POST',
    body: JSON.stringify({ locationId, name: kbName }),
  });
  if (!kbCreate.ok) throw new Error(`KB create failed ${kbCreate.status}: ${JSON.stringify(kbCreate.body).slice(0, 400)}`);
  const kbId = pickId(kbCreate.body);
  if (!kbId) throw new Error(`KB create returned no id: ${JSON.stringify(kbCreate.body).slice(0, 400)}`);

  const { error: sessionError } = await supa
    .from('demo_sessions')
    .insert([{
      ghl_contact_id: requestedContactId || null,
      ghl_agent_id: null,
      ghl_kb_id: kbId,
      ghl_widget_id: null,
      widget_embed: null,
      ghl_location_id: locationId,
      prospect_url: url,
      business_name: fallbackName,
      knowledge_doc: 'Knowledge base created; website training queued.',
    }]);
  if (sessionError) throw sessionError;

  // Create the agent + clone the chat widget FIRST so the demo is usable
  // even if KB website training takes a long time (or stalls in polling).
  let agentId: string | null = null;
  let widgetId: string | null = null;
  let widgetEmbed: string | null = null;
  try {
    agentId = await createAgent({
      locationId,
      name: `Demo Agent - ${fallbackName}`,
      knowledgeDoc: `Knowledge base for ${url} is being trained. Use the attached GHL knowledge base for facts.`,
      businessName: fallbackName,
      websiteUrl: url,
    });
    console.log('Agent created:', agentId);
  } catch (e) {
    console.warn('Agent create failed (non-fatal):', e);
  }

  try {
    const widget = await createChatWidget({
      locationId,
      name: requestedContactId || `Demo Widget - ${fallbackName}`,
      agentId: agentId || '',
    });
    widgetId = widget.id;
    widgetEmbed = widget.embed;
    console.log('Widget cloned:', widgetId);
  } catch (e) {
    console.warn('Widget create failed (non-fatal):', e);
  }

  await supa
    .from('demo_sessions')
    .update({
      ghl_agent_id: agentId,
      ghl_widget_id: widgetId,
      widget_embed: widgetEmbed,
    })
    .eq('ghl_kb_id', kbId);

  // Now do the slow KB website training in the background.
  const training = await trainKnowledgeBaseWebsite(kbId, url, locationId);
  const doc = training.trained
    ? `Knowledge base trained from ${url}. Ingested ${training.trainedUrls.length} page(s):\n- ${training.trainedUrls.join('\n- ')}`
    : `Knowledge base created for ${url}; training did not complete.`;

  await supa
    .from('demo_sessions')
    .update({ knowledge_doc: doc })
    .eq('ghl_kb_id', kbId);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Debug: inspect an existing GHL widget to discover the correct chatType enum.
  if (req.method === 'GET' && new URL(req.url).searchParams.get('debug_widget')) {
    const u = new URL(req.url);
    const widgetId = u.searchParams.get('debug_widget')!;
    const locationId = u.searchParams.get('locationId') || Deno.env.get('AI_DEMO_LOCATION_ID') || '';
    const r = await ghlFetch(`/chat-widget/data/${locationId}/${widgetId}`, { method: 'GET', headers: { Version: '2021-07-28' } });
    return new Response(JSON.stringify(r, null, 2), { status: r.ok ? 200 : r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

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

    // Reuse disabled: always create a new KB on every POST.

    scheduleBackground(processDemoKnowledgeBase({ url, locationId, requestedContactId }));

    return new Response(JSON.stringify({
      ok: true,
      queued: true,
      contactId: requestedContactId || null,
      locationId,
      url,
      message: 'Knowledge base creation and website training queued.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
