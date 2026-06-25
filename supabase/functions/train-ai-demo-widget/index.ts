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

// Single shared chat widget used across ALL demos. Agent switching is handled
// by toggling the per-demo agent to `isPrimary: true` on each GET.
const SHARED_WIDGET_ID = Deno.env.get('AI_DEMO_TEMPLATE_WIDGET_ID') || '6a3be0987de81c3360287a78';
const SHARED_WIDGET_EMBED = `<script src="https://widgets.leadconnectorhq.com/loader.js" data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js" data-widget-id="${SHARED_WIDGET_ID}"></script>`;

// ---- Site crawl + AI summarize (embedded into agent instructions) ----
const MAX_PAGES = 500;
const FETCH_TIMEOUT_MS = 10000;
const PER_PAGE_CHARS = 18000;
const CRAWL_BUDGET_MS = 90_000;
const CONCURRENCY = 8;
const SKIP_EXT = /\.(pdf|jpg|jpeg|png|gif|webp|svg|ico|mp4|mp3|wav|zip|rar|css|js|woff2?|ttf|eot|xml|json)$/i;
const BLOG_PATH = /(^|\/)(blog|blogs|news|articles?|posts?|insights?|stories|press|category|categories|tag|tags|author|authors|archive|archives)(\/|$)/i;

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
        { role: 'user', content: `Source website: ${targetUrl}\n\nUsing ONLY the content below, produce a detailed markdown knowledge base (2,500-5,000 words) covering: Business Overview; Services; Service Area; Pricing; Guarantees/Warranties/Licensing/Insurance; Hours & Emergency availability; Booking & Contact; 20-30 FAQs; Reviews/Testimonials (verbatim); Brand Voice. If something isn't covered, write "Not specified on the website — offer to have a team member follow up." Do not invent.\n\nCONTENT:\n${corpus}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const summary = data.choices?.[0]?.message?.content ?? '';
  const nameMatch = summary.match(/BUSINESS_NAME:\s*(.+)/i);
  const businessName = (nameMatch?.[1] || new URL(targetUrl).hostname.replace(/^www\./, '')).trim();
  return { doc: summary, businessName };
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
  body?.data?.id || body?.data?._id || '';

const buildAgentInstructions = (businessName: string, websiteUrl: string, knowledge: string) =>
  `You are the live-chat AI assistant for ${businessName} (${websiteUrl}). Answer using ONLY the knowledge below. If something isn't covered, say you'll have a team member follow up and ask for the visitor's name, phone, and email. Be brief (2-4 sentences). Never invent prices, hours, or guarantees.\n\n=== BUSINESS KNOWLEDGE ===\n${(knowledge || '').slice(0, 28000)}\n=== END KNOWLEDGE ===`;

const createAgent = async (params: { locationId: string; name: string; instructions: string; businessName: string; websiteUrl: string; isPrimary?: boolean }) => {
  const { locationId, name, instructions, businessName, websiteUrl, isPrimary = false } = params;
  const r = await ghlFetch(`/conversation-ai/agents?locationId=${encodeURIComponent(locationId)}`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      businessName,
      channels: ['Live_Chat', 'WebChat'],
      mode: 'auto-pilot',
      isPrimary,
      waitTime: 1,
      waitTimeUnit: 'seconds',
      personality: 'Warm, friendly, concise, professional. Speaks like a knowledgeable front-desk teammate at a local home-service business.',
      goal: `Help website visitors of ${businessName} (${websiteUrl}) get accurate answers about services, pricing, and service area, and capture leads or book appointments.`,
      instructions,
      respondToImages: false,
      respondToAudio: false,
    }),
  });
  if (!r.ok) throw new Error(`Agent create failed ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
  const id = pickId(r.body);
  if (!id) throw new Error(`Agent create returned no id: ${JSON.stringify(r.body).slice(0, 400)}`);
  return id;
};

const updateAgent = async (agentId: string, locationId: string, patch: Record<string, unknown>) => {
  const r = await ghlFetch(`/conversation-ai/agents/${agentId}?locationId=${encodeURIComponent(locationId)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  return r;
};


const setAgentPrimary = async (agentId: string, locationId: string) => {
  // Clear primary on all other agents in this location first.
  try {
    const list = await ghlFetch(`/conversation-ai/agents?locationId=${locationId}&limit=200`, { method: 'GET' });
    const items: any[] = list.body?.agents || list.body?.data?.agents || list.body?.data || [];
    for (const a of (Array.isArray(items) ? items : [])) {
      const id = a?.id || a?._id;
      if (!id || id === agentId) continue;
      if (a?.isPrimary) {
        await updateAgent(id, locationId, { isPrimary: false });
      }
    }
  } catch (e) {
    console.warn('Listing agents to clear primary failed (non-fatal):', e);
  }
  const r = await updateAgent(agentId, locationId, { isPrimary: true });
  if (!r.ok) console.warn('Set primary failed:', r.status, JSON.stringify(r.body).slice(0, 300));
  return r.ok;
};

const getFallbackBusinessName = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Demo'; }
};

const scheduleBackground = (promise: Promise<unknown>) => {
  promise.catch((e) => console.error('AI demo background job failed:', e));
  const edgeRuntime = (globalThis as any).EdgeRuntime;
  if (edgeRuntime?.waitUntil) edgeRuntime.waitUntil(promise);
};

const trainKnowledgeBaseWebsite = async (kbId: string, url: string, locationId: string) => {
  // Crawler endpoints require Version: v3 per
  // https://marketplace.gohighlevel.com/docs/ghl/knowledge-base/train-discovered-urls
  const v3Headers = { Version: 'v3' };

  const discoverRes = await ghlFetch(`/knowledge-bases/crawler`, {
    method: 'POST',
    headers: v3Headers,
    body: JSON.stringify({ knowledgeBaseId: kbId, url, locationId, option: 'Domain' }),
  });
  if (!discoverRes.ok) {
    console.warn('KB discover failed:', discoverRes.status, JSON.stringify(discoverRes.body).slice(0, 400));
    return { discovered: false, trained: false, trainedUrls: [] as string[] };
  }
  const discoverBody: any = discoverRes.body || {};
  const operationId: string | undefined =
    discoverBody.operationId || discoverBody.data?.operationId || discoverBody._id || discoverBody.id;
  console.log('KB discover ok, operationId:', operationId);

  if (!operationId) {
    console.warn('KB discover returned no operationId; cannot poll or train.');
    return { discovered: true, trained: false, trainedUrls: [] as string[] };
  }

  let discoveredUrls: string[] = [];
  let urlIds: string[] = [];
  const collectIds = (arr: any[]): string[] =>
    arr.map((u: any) => (typeof u === 'string' ? u : (u?._id || u?.id || u?.urlId))).filter(Boolean);
  const collectUrls = (arr: any[]): string[] =>
    arr.map((u: any) => (typeof u === 'string' ? u : (u?.url || u?.link))).filter(Boolean);

  let finalStatus = '';
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const qs = new URLSearchParams({ knowledgeBaseId: kbId, locationId, operationId });
    const statusRes = await ghlFetch(`/knowledge-bases/crawler/status?${qs.toString()}`, {
      method: 'GET',
      headers: v3Headers,
    });
    const b: any = statusRes.body || {};
    const status = (b.status || b.state || b.data?.status || '').toString().toLowerCase();
    finalStatus = status;
    const arr: any[] = b.urls || b.data?.urls || b.discoveredUrls || b.data?.discoveredUrls
      || b.links || b.data?.links || b.documents || b.data?.documents || b.docs || b.data?.docs || [];
    if (Array.isArray(arr) && arr.length) {
      discoveredUrls = collectUrls(arr);
      urlIds = collectIds(arr);
    }
    console.log(`KB status poll ${i + 1} [${statusRes.status}]: status=${status} urls=${discoveredUrls.length} ids=${urlIds.length}`);
    if (['complete', 'completed', 'done', 'success', 'finished'].includes(status) && urlIds.length) break;
    if (['failed', 'error'].includes(status)) break;
  }

  if (!urlIds.length) {
    console.warn(`KB train skipped: no urlIds discovered (status=${finalStatus})`);
    return { discovered: true, trained: false, trainedUrls: [] as string[] };
  }

  const trainBody = { knowledgeBaseId: kbId, locationId, operationId, urlIds };
  const trainRes = await ghlFetch(`/knowledge-bases/crawler/train`, {
    method: 'POST',
    headers: v3Headers,
    body: JSON.stringify(trainBody),
  });
  if (!trainRes.ok) {
    console.warn('KB train failed:', trainRes.status, JSON.stringify(trainRes.body).slice(0, 400));
    return { discovered: true, trained: false, trainedUrls: [] as string[] };
  }
  console.log(`KB trained ${urlIds.length} urls successfully`);
  return { discovered: true, trained: true, trainedUrls: discoveredUrls };
};

const processDemo = async (params: { url: string; locationId: string; requestedContactId: string }) => {
  const { url, locationId, requestedContactId } = params;
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const fallbackName = getFallbackBusinessName(url);
  const kbName = requestedContactId || `Demo KB - ${fallbackName} - ${new Date().toISOString()}`;
  const agentSuffix = requestedContactId ? ` - ${requestedContactId}` : '';
  const agentName = `${fallbackName}${agentSuffix}`;

  // STEP 1: Create the per-demo agent with placeholder instructions so GET works immediately.
  const placeholder = buildAgentInstructions(fallbackName, url, `Knowledge for ${url} is still being assembled. If asked something specific, offer to have a team member follow up.`);
  let agentId: string | null = null;
  try {
    agentId = await createAgent({
      locationId,
      name: agentName,
      instructions: placeholder,
      businessName: fallbackName,
      websiteUrl: url,
      isPrimary: false,
    });
    console.log('Agent created:', agentId);
  } catch (e) {
    console.error('Agent create failed:', e);
  }

  // STEP 2: Insert session row with shared widget so GET can return immediately.
  const { error: sessionError } = await supa
    .from('demo_sessions')
    .insert([{
      ghl_contact_id: requestedContactId || null,
      ghl_agent_id: agentId,
      ghl_kb_id: null,
      ghl_widget_id: SHARED_WIDGET_ID,
      widget_embed: SHARED_WIDGET_EMBED,
      ghl_location_id: locationId,
      prospect_url: url,
      business_name: fallbackName,
      knowledge_doc: 'Knowledge base creation queued.',
    }]);
  if (sessionError) throw sessionError;

  // STEP 3: Crawl + summarize site, then update agent instructions with knowledge.
  let businessName = fallbackName;
  let knowledgeDoc = '';
  try {
    const pages = await crawl(url);
    if (pages.length) {
      const summary = await summarizeWithAi(pages, url);
      knowledgeDoc = summary.doc;
      businessName = summary.businessName || fallbackName;
      if (agentId) {
        const upd = await updateAgent(agentId, locationId, {
          name: `${businessName}${agentSuffix}`,
          businessName,
          instructions: buildAgentInstructions(businessName, url, knowledgeDoc),
        });
        console.log('Agent updated with knowledge:', upd.ok, upd.status);
      }
      await supa
        .from('demo_sessions')
        .update({ business_name: businessName, knowledge_doc: knowledgeDoc })
        .eq('ghl_agent_id', agentId);
    }
  } catch (e) {
    console.warn('Crawl/summarize/update agent failed (non-fatal):', e);
  }

  // STEP 4: Create the KB (delete any existing with same name first).
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
  if (!kbCreate.ok) {
    console.error('KB create failed:', kbCreate.status, JSON.stringify(kbCreate.body).slice(0, 400));
    return;
  }
  const kbId = pickId(kbCreate.body);
  if (!kbId) return;

  await supa.from('demo_sessions').update({ ghl_kb_id: kbId }).eq('ghl_agent_id', agentId);

  // STEP 5: Crawl/train the KB on the site.
  const training = await trainKnowledgeBaseWebsite(kbId, url, locationId);
  const doc = training.trained
    ? `${knowledgeDoc}\n\n--- KB trained on ${training.trainedUrls.length} page(s) ---`
    : knowledgeDoc || `Knowledge base created for ${url}; training did not complete.`;

  await supa.from('demo_sessions').update({ knowledge_doc: doc }).eq('ghl_kb_id', kbId);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // GET: load an existing session by contact_id or website, and set its agent primary.
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

      // Promote this demo's agent to primary so the shared widget routes to it.
      if (data.ghl_agent_id && data.ghl_location_id) {
        try {
          await setAgentPrimary(data.ghl_agent_id, data.ghl_location_id);
        } catch (e) {
          console.warn('setAgentPrimary failed:', e);
        }
      }

      return new Response(JSON.stringify({
        ok: true,
        loaded: true,
        contactId: data.ghl_contact_id,
        agentId: data.ghl_agent_id,
        kbId: data.ghl_kb_id,
        widgetId: data.ghl_widget_id || SHARED_WIDGET_ID,
        widgetEmbed: data.widget_embed || SHARED_WIDGET_EMBED,
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

    scheduleBackground(processDemo({ url, locationId, requestedContactId }));

    return new Response(JSON.stringify({
      ok: true,
      queued: true,
      contactId: requestedContactId || null,
      locationId,
      url,
      widgetId: SHARED_WIDGET_ID,
      widgetEmbed: SHARED_WIDGET_EMBED,
      message: 'Demo agent + knowledge base creation queued.',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
