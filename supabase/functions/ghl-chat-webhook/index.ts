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
${(params.knowledge || '').slice(0, 60000)}
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

    const { data: session, error: dbErr } = await supa
      .from('demo_sessions')
      .select('ghl_location_id, business_name, prospect_url, knowledge_doc')
      .eq('ghl_contact_id', contactId)
      .maybeSingle();

    if (dbErr) return respond({ ok: false, error: dbErr.message }, 500);
    if (!session) return respond({ ok: true, skipped: 'no demo session for contact' });

    const reply = await askAi({
      businessName: session.business_name || 'our team',
      websiteUrl: session.prospect_url || '',
      knowledge: session.knowledge_doc || '',
      message: String(messageBody),
    });

    // Post the reply back into the GHL conversation so the prospect sees it in the widget.
    const sendBody: any = {
      type,
      message: reply,
      contactId,
    };
    if (conversationId) sendBody.conversationId = conversationId;

    const sent = await ghlFetch('/conversations/messages', {
      method: 'POST',
      body: JSON.stringify(sendBody),
    });

    return respond({ ok: true, reply, sent });
  } catch (e) {
    console.error('ghl-chat-webhook error', e);
    return respond({ ok: false, error: String((e as Error)?.message ?? e), stack: (e as Error)?.stack }, 500);
  }
});
