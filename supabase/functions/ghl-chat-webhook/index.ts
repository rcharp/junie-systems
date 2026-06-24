// @ts-nocheck
// Public webhook receiver for GHL InboundMessage events.
// Pulls the demo's stored knowledge base from Supabase, asks AI to answer
// as that business's chatbot, and posts the reply back into the GHL conversation.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-04-15';

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
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
};

const normalizeMessageType = (value: unknown) => {
  const normalized = String(value || '').trim().toLowerCase().replace(/[-\s]/g, '_');
  if (normalized === 'sms') return 'SMS';
  if (normalized === 'email') return 'Email';
  if (normalized === 'whatsapp') return 'WhatsApp';
  if (normalized === 'ig' || normalized === 'instagram') return 'IG';
  if (normalized === 'fb' || normalized === 'facebook') return 'FB';
  if (normalized === 'custom') return 'Custom';
  if (normalized === 'internalcomment' || normalized === 'internal_comment') return 'InternalComment';
  return 'Live_Chat';
};

const askAi = async (params: {
  businessName: string;
  websiteUrl: string;
  knowledge: string;
  message: string;
}) => {
  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) throw new Error('LOVABLE_API_KEY not configured');
  const system = `You are the live-chat assistant for ${params.businessName} (website: ${params.websiteUrl}).
Answer using ONLY the knowledge below. If something isn't covered, say a team member will follow up and ask for the visitor's name, phone, and email. Keep replies to 2-4 sentences. Never invent prices, hours, or guarantees.

=== BUSINESS KNOWLEDGE ===
${(params.knowledge || '').slice(0, 250000)}
=== END KNOWLEDGE ===`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Lovable-API-Key': key,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: params.message },
      ],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  const text = (data?.choices?.[0]?.message?.content || '').trim();
  return text || "Thanks for reaching out — a team member will follow up shortly.";
};

const loadDemoSession = async (supa: any, contactId: string, locationId?: string) => {
  const columns = 'ghl_contact_id, ghl_location_id, business_name, prospect_url, knowledge_doc, created_at';
  const { data: exact, error: exactErr } = await supa
    .from('demo_sessions')
    .select(columns)
    .eq('ghl_contact_id', contactId)
    .maybeSingle();

  if (exactErr) throw exactErr;
  if (exact?.knowledge_doc) return { session: exact, matchedBy: 'contact_id' };

  if (exact?.prospect_url) {
    const { data: sameUrlRows, error: sameUrlErr } = await supa
      .from('demo_sessions')
      .select(columns)
      .eq('prospect_url', exact.prospect_url)
      .not('knowledge_doc', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (sameUrlErr) throw sameUrlErr;
    const sameUrl = Array.isArray(sameUrlRows) ? sameUrlRows[0] : null;
    if (sameUrl) return { session: sameUrl, matchedBy: 'latest_same_website' };
  }

  // The embedded GHL widget can create a fresh visitor contact instead of using
  // the pre-created demo contact. In that case, answer from the newest trained
  // demo KB for this demo location so the chat never returns blank.
  const demoLocationId = locationId || Deno.env.get('AI_DEMO_LOCATION_ID') || '';
  let fallbackQuery = supa
    .from('demo_sessions')
    .select(columns)
    .not('knowledge_doc', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (demoLocationId) fallbackQuery = fallbackQuery.eq('ghl_location_id', demoLocationId);

  const { data: fallbackRows, error: fallbackErr } = await fallbackQuery;
  if (fallbackErr) throw fallbackErr;
  const fallback = Array.isArray(fallbackRows) ? fallbackRows[0] : null;
  return fallback ? { session: fallback, matchedBy: 'latest_demo_session' } : { session: null, matchedBy: 'none' };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const respond = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const evt = await req.json().catch(() => ({}));
    const payload = evt?.data ?? evt ?? {};
    const msg = payload.message ?? evt.message ?? {};
    const contactId =
      payload.contactId || payload.contact_id || payload.contact?.id || evt.contactId || msg.contactId;
    const conversationId =
      payload.conversationId || payload.conversation_id || payload.conversation?.id || msg.conversationId;
    const locationId =
      payload.locationId || payload.location_id || payload.location?.id || evt.locationId || msg.locationId;
    const rawBody =
      (typeof payload.body === 'string' ? payload.body : '') ||
      (typeof payload.message === 'string' ? payload.message : '') ||
      payload.customer_message || payload.customerMessage ||
      payload.messageBody || payload.text || payload.body_text ||
      msg.body || msg.text || msg.message || evt.body || evt.text || evt.customer_message || '';
    const messageBody = String(rawBody || '').trim();
    const direction = payload.direction || payload.messageDirection || msg.direction;
    const type = normalizeMessageType(payload.type || payload.messageType || msg.type || 'Live_Chat');

    console.log('ghl-chat-webhook payload', JSON.stringify(evt).slice(0, 2000));

    const isInbound = !direction || String(direction).toLowerCase() === 'inbound';
    if (!isInbound) return respond({ ok: true, skipped: 'not inbound' });
    if (!contactId || !messageBody) {
      return respond({ ok: true, skipped: 'missing fields', got: { contactId, conversationId, hasBody: Boolean(messageBody), keys: Object.keys(payload) } });
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { session, matchedBy } = await loadDemoSession(supa, contactId, locationId);
    if (!session) {
      const reply = "Thanks for reaching out — a team member will follow up shortly. What’s the best name, phone, and email for you?";
      return respond({ ok: true, reply, skipped: 'no trained demo session found', matchedBy });
    }

    console.log('ghl-chat-webhook session match', JSON.stringify({ inboundContactId: contactId, sessionContactId: session.ghl_contact_id, matchedBy, businessName: session.business_name }));

    const reply = await askAi({
      businessName: session.business_name || 'our team',
      websiteUrl: session.prospect_url || '',
      knowledge: session.knowledge_doc || '',
      message: String(messageBody),
    });

    // Return the reply for the GHL workflow to send. Do NOT post to
    // /conversations/messages here — the workflow already sends the returned
    // reply, and posting again causes the widget to show two identical bot
    // messages back-to-back.
    return respond({ ok: true, reply, matchedBy, sessionContactId: session.ghl_contact_id });

  } catch (e) {
    console.error('ghl-chat-webhook error', e);
    return respond({ ok: false, error: String((e as Error)?.message ?? e), stack: (e as Error)?.stack }, 500);
  }
});
