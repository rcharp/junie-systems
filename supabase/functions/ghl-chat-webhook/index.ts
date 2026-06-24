// @ts-nocheck
// Public webhook receiver for GHL InboundMessage events. Routes each demo
// visitor's message to their own trained Conversation AI agent.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Always ack fast so GHL doesn't retry
  const respond = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const evt = await req.json().catch(() => ({}));
    // Accept a few shapes: top-level or { data: {...} }
    const payload = evt?.data ?? evt ?? {};
    const contactId =
      payload.contactId || payload.contact_id || payload.contact?.id || evt.contactId;
    const conversationId =
      payload.conversationId || payload.conversation_id || payload.conversation?.id;
    const messageBody =
      payload.body || payload.message || payload.messageBody || payload.text || '';
    const direction = payload.direction || payload.messageDirection;
    const type = payload.type || payload.messageType;

    // Only respond to inbound chat-like messages
    const isInbound = !direction || String(direction).toLowerCase() === 'inbound';
    if (!isInbound) return respond({ ok: true, skipped: 'not inbound' });
    if (!contactId || !conversationId || !messageBody) {
      return respond({ ok: true, skipped: 'missing fields', got: { contactId, conversationId, hasBody: Boolean(messageBody) } });
    }

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: session, error: dbErr } = await supa
      .from('demo_sessions')
      .select('ghl_agent_id, ghl_location_id, business_name')
      .eq('ghl_contact_id', contactId)
      .maybeSingle();

    if (dbErr) return respond({ ok: false, error: dbErr.message }, 500);
    if (!session) return respond({ ok: true, skipped: 'no demo session for contact' });

    // Tell GHL's own AI to respond using the trained agent.
    const gen = await ghlFetch('/conversation-ai/generate', {
      method: 'POST',
      body: JSON.stringify({
        locationId: session.ghl_location_id,
        conversationId,
        agentId: session.ghl_agent_id,
        message: messageBody,
        type: type || 'Chat',
      }),
    });

    // Fallback: if generate isn't available on this PIT, post a static message
    if (!gen.ok) {
      const fallback = await ghlFetch(`/conversations/messages`, {
        method: 'POST',
        body: JSON.stringify({
          type: 'Chat',
          conversationId,
          message: `Thanks! A team member from ${session.business_name || 'our team'} will be right with you.`,
        }),
      });
      return respond({ ok: true, generate: gen, fallback });
    }

    return respond({ ok: true, generate: gen });
  } catch (e) {
    return respond({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});
