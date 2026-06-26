// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function buildSystemPrompt(businessName: string, url: string, knowledge: string): string {
  return `You are a friendly, helpful AI assistant for ${businessName}${url ? ` (${url})` : ''}.
You answer questions like a knowledgeable employee would — warm, concise, and confident.

RULES:
- Only use information from the Knowledge Base below. If something isn't covered, say so politely and offer to take their contact info so the team can follow up.
- Keep responses short and conversational (2-4 sentences typically).
- Never mention "knowledge base", "context", "documents", or that you're an AI model. Just talk like a real team member.
- If asked to book, get a quote, or schedule, encourage them to share their name, phone, and what they need so the team can reach out.

Knowledge Base for ${businessName}:
${knowledge || '(Knowledge base is still being built — answer general questions politely and offer to connect them with the team.)'}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { contactId, messages } = await req.json();
    if (!contactId || !Array.isArray(messages)) {
      return Response.json({ ok: false, error: 'contactId and messages required' }, { status: 400, headers: corsHeaders });
    }

    const { data: session } = await sb.from('demo_sessions').select('*').eq('ghl_contact_id', contactId).maybeSingle();
    const businessName = session?.business_name || 'this business';
    const url = session?.prospect_url || '';
    const knowledge = session?.knowledge_doc || '';

    const system = buildSystemPrompt(businessName, url, knowledge);

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        stream: true,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      return Response.json({ ok: false, error: t }, { status: upstream.status, headers: corsHeaders });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (e: any) {
    console.error('[demo-chat] error', e);
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
