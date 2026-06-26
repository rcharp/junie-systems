// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;
const ELEVENLABS_AGENT_ID = Deno.env.get('ELEVENLABS_AGENT_ID')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

async function buildPromptForContact(contactId: string): Promise<{ prompt: string; firstMessage: string; businessName: string }> {
  const { data: session } = await sb.from('demo_sessions').select('*').eq('ghl_contact_id', contactId).maybeSingle();
  const businessName = session?.business_name || 'this business';
  const url = session?.prospect_url || '';

  // Grab a broad sample of KB chunks (newest 30) to embed in the agent prompt
  const { data: chunks } = await sb
    .from('kb_chunks')
    .select('content,url')
    .eq('contact_id', contactId)
    .limit(30);

  let kb = '';
  if (chunks?.length) {
    // Cap total prompt size
    let acc = '';
    for (const c of chunks) {
      if (acc.length + c.content.length > 18000) break;
      acc += `\n---\n${c.content}`;
    }
    kb = acc;
  }

  const prompt = `You are a friendly, helpful AI phone assistant for ${businessName}${url ? ` (${url})` : ''}.
Talk like a real team member — warm, concise, conversational. Keep replies short (1-3 sentences).
Only use information from the Knowledge Base below. If a question isn't covered, politely say so and offer to take their info so the team can follow up. Never mention "knowledge base" or that you're an AI.

Knowledge Base:
${kb || '(no info indexed yet — answer general questions politely and offer to connect them with the team.)'}`;

  const firstMessage = `Hi! Thanks for calling ${businessName}. How can I help you today?`;
  return { prompt, firstMessage, businessName };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { contactId } = await req.json();
    if (!contactId) return Response.json({ ok: false, error: 'contactId required' }, { status: 400, headers: corsHeaders });

    const { prompt, firstMessage, businessName } = await buildPromptForContact(contactId);

    const tokenRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } },
    );
    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      return Response.json({ ok: false, error: `ElevenLabs token failed: ${t}` }, { status: 500, headers: corsHeaders });
    }
    const { token } = await tokenRes.json();

    return Response.json({
      ok: true,
      token,
      agentId: ELEVENLABS_AGENT_ID,
      businessName,
      overrides: {
        agent: {
          prompt: { prompt },
          firstMessage,
          language: 'en',
        },
      },
    }, { headers: corsHeaders });
  } catch (e: any) {
    console.error('[demo-voice-token] error', e);
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
