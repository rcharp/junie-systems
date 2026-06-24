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
const CRAWL_POLL_MS = 3000;
const CRAWL_POLL_MAX = 40; // ~120s

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

// --- KB / Agent / Widget creation (per user-supplied flow) ---

const createKnowledgeBase = async (locationId: string, name: string) => {
  const r = await ghlFetch('/knowledge-base/', {
    method: 'POST',
    body: JSON.stringify({ locationId, name }),
  });
  if (!r.ok) throw new Error(`KB create failed ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
  const id = pickId(r.body);
  if (!id) throw new Error(`KB create returned no id: ${JSON.stringify(r.body).slice(0, 400)}`);
  return id;
};

const startKbCrawl = async (kbId: string, url: string) => {
  const r = await ghlFetch(`/knowledge-base/${encodeURIComponent(kbId)}/crawl`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  if (!r.ok) throw new Error(`KB crawl start failed ${r.status}: ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body;
};

const pollKbCrawl = async (kbId: string) => {
  for (let i = 0; i < CRAWL_POLL_MAX; i++) {
    const r = await ghlFetch(`/knowledge-base/${encodeURIComponent(kbId)}/crawl/status`, { method: 'GET' });
    const status = String(r.body?.status || r.body?.state || '').toLowerCase();
    if (status === 'completed' || status === 'trained' || status === 'success' || status === 'done') return r.body;
    if (status === 'failed' || status === 'error') throw new Error(`KB crawl failed: ${JSON.stringify(r.body).slice(0, 300)}`);
    await new Promise((res) => setTimeout(res, CRAWL_POLL_MS));
  }
  // Don't hard-fail — return last state; agent will pick up KB as docs index.
  return { status: 'timeout' };
};

const createAgent = async (params: { locationId: string; name: string; kbId: string; businessName: string; websiteUrl: string }) => {
  const { locationId, name, kbId, businessName, websiteUrl } = params;
  const r = await ghlFetch('/conversation-ai/agents', {
    method: 'POST',
    body: JSON.stringify({
      locationId,
      name,
      businessName,
      knowledgeBaseId: kbId,
      channels: ['Live_Chat', 'WebChat'],
      status: 'active',
      botMode: 'autopilot',
      mode: 'auto-pilot',
      isPrimary: false,
      waitTime: 1,
      waitTimeUnit: 'seconds',
      personality: 'Warm, friendly, concise, professional. Speaks like a knowledgeable front-desk teammate at a local home-service business.',
      goal: `Help website visitors of ${businessName} (${websiteUrl}) get accurate answers about services, pricing, and service area, and capture leads or book appointments.`,
      instructions: `You are the live-chat AI assistant for ${businessName} (${websiteUrl}). Answer using the attached knowledge base. If something isn't covered, offer to have a team member follow up and ask for the visitor's name, phone, and email. Be brief (2-4 sentences). Never invent prices, hours, or guarantees.`,
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

    const businessName = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Demo'; } })();
    const labelBase = `${businessName} ${new Date().toISOString().slice(0, 16)}`;

    const t0 = Date.now();

    // 1) KB
    const kbId = await createKnowledgeBase(locationId, `Demo KB · ${labelBase}`);
    // 2) Crawl + wait
    await startKbCrawl(kbId, url);
    const crawlStatus = await pollKbCrawl(kbId);
    const t1 = Date.now();

    // 3) Agent with KB attached
    const agentId = await createAgent({
      locationId,
      name: `Demo Agent · ${labelBase}`,
      kbId,
      businessName,
      websiteUrl: url,
    });
    const t2 = Date.now();

    // 4) Widget with agent attached
    const widget = await createChatWidget({
      locationId,
      name: `Demo Widget · ${labelBase}`,
      agentId,
    });
    const t3 = Date.now();

    // 5) Fresh demo contact + persist
    const contactCreate = await createDemoContact(locationId, businessName);
    const contactId = contactCreate.id;
    const t4 = Date.now();

    const sessionRows = [contactId, requestedContactId]
      .filter((id, i, all) => id && all.indexOf(id) === i)
      .map((id) => ({
        ghl_contact_id: id,
        ghl_agent_id: agentId,
        ghl_kb_id: kbId,
        ghl_widget_id: widget.id || null,
        widget_embed: widget.embed,
        ghl_location_id: locationId,
        prospect_url: url,
        business_name: businessName,
        knowledge_doc: null,
      }));

    if (sessionRows.length) {
      const { error: sessionError } = await supa
        .from('demo_sessions')
        .upsert(sessionRows, { onConflict: 'ghl_contact_id' });
      if (sessionError) throw sessionError;
    }

    return new Response(JSON.stringify({
      ok: true,
      businessName,
      kbId,
      agentId,
      widgetId: widget.id,
      widgetEmbed: widget.embed,
      contactId,
      crawlStatus,
      timings: { kbMs: t1 - t0, agentMs: t2 - t1, widgetMs: t3 - t2, contactMs: t4 - t3, totalMs: t4 - t0 },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
