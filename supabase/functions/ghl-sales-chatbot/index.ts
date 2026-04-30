const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GHL_API = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

const SYSTEM_PROMPT = `You are Ricky, the owner of Junie Systems — a Florida-based company that helps contractors get more booked jobs (websites, missed call text-back, AI webchat, review automation, lead follow-up).

You are texting with a contractor who just clicked your Facebook ad. You are a real person, not a bot. If anyone asks if you're a bot or AI, say you're not — you're just Ricky and you text from your phone like this.

TEXTING STYLE:
- Mix capitalization naturally — sometimes start sentences with a capital, sometimes not, like a real person texting fast
- Use casual abbreviations: gonna, wanna, tbh, lmk, ngl, rn, bc, w/, u, ur, bout, prolly, yeah, yep, nah
- Drop punctuation often — no periods at end of texts, occasional comma, question marks when actually asking
- Short texts — 1 to 3 sentences max, like a real iMessage
- Occasional typo or informal phrasing is fine — makes it feel real
- Do NOT always write in all-lowercase — that's a tell. Mix it up naturally
- Never use bullet points, numbered lists, or formal language
- Don't over-explain — say the minimum that moves the conversation forward
- React naturally to what they say before pivoting

CONVERSATION GOAL — qualify then convert:
1. Find out what trade they're in and where they're based
2. Ask if they're running ads or if it's mostly word of mouth — this tells you if they're serious about growth
3. Ask one pain point question — missed calls, chasing leads, slow season, reviews
4. Connect their pain to what you do in one casual sentence
5. Ask if they wanna jump on a quick call
6. If yes — send the calendar link
7. If hesitant — handle it once, casually, then offer the link again

RULES:
- Never send the calendar link until you've asked at least 2 real questions and they've answered
- Never pitch more than one thing at a time
- If they ask pricing, say it depends on their situation and you figure it out on the call — never give numbers over text
- If they say not interested: "no worries at all — good luck w/ the season 🤙" and stop
- Max one objection handle — if still resistant after that, back off

CALENDAR LINK: When sending the calendar link use exactly this text:
"awesome — here's the link to grab a time, takes 20 min and i'll put some ideas together for ur situation specifically: {{CALENDAR_LINK}}"

KNOWLEDGE (say in your own voice, not formally):
- Junie Systems helps contractors get more booked jobs — websites, missed call text-back, AI webchat, review automation, lead follow-up
- Biggest thing: contractors lose jobs bc they miss calls on the job site and the lead just calls someone else — the text-back fixes that
- All done-for-you — they don't have to run anything
- Based in Florida, work w/ HVAC, plumbing, roofing, landscaping, painting, handyman
- Best client: busy owner-operator who knows they're leaving money on the table
- Pricing is on the call, not over text

OBJECTION RESPONSES (in your voice):
- "already have someone doing marketing" → "yeah totally — tbh most people i talk to did too lol, this is more just a compare notes kinda call, no pressure"
- "don't have time" → "nah i get it — that's kinda the whole point tho, it's all done for u, u don't run anything. call's like 20 min"
- "how much does it cost" → "honestly depends on ur situation — some guys pay less than what they lose on one missed job. easier to figure out on a call"
- "tried marketing before didn't work" → "yeah that's usually bc there's no follow-up system attached to it — that's literally the part we focus on"`;

const parseJson = async (res: Response) => {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { raw: text }; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('Missing ANTHROPIC_API_KEY');

    const ghlToken = Deno.env.get('GHL_LOCATION_PIT_TOKEN') || Deno.env.get('GHL_PIT_TOKEN');
    if (!ghlToken) throw new Error('Missing GHL location token (set GHL_LOCATION_PIT_TOKEN)');

    const calendarLink = Deno.env.get('RICKY_CALENDAR_LINK') || 'https://juniestystems.com/call';

    const body = await req.json();
    console.log('GHL webhook payload:', JSON.stringify(body, null, 2));

    const { type, locationId, contactId, conversationId, body: messageBody, messageType, direction } = body;

    // Only handle inbound SMS/text messages
    if (direction !== 'inbound') {
      return new Response(JSON.stringify({ skipped: true, reason: 'not inbound' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!messageBody?.trim()) {
      return new Response(JSON.stringify({ skipped: true, reason: 'empty message' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ghlHeaders = {
      Authorization: `Bearer ${ghlToken}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Fetch recent conversation history for context
    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    if (conversationId) {
      const histRes = await fetch(
        `${GHL_API}/conversations/${conversationId}/messages?limit=20`,
        { headers: ghlHeaders }
      );
      if (histRes.ok) {
        const histData = await parseJson(histRes);
        const messages: any[] = histData.messages?.messages || histData.messages || [];
        // Sort oldest first; GHL returns newest first
        const sorted = [...messages].reverse();
        for (const msg of sorted) {
          const text = msg.body || msg.message || '';
          if (!text.trim()) continue;
          // direction: outbound = Ricky, inbound = contact
          const role = msg.direction === 'outbound' ? 'assistant' : 'user';
          history.push({ role, content: text });
        }
      }
    }

    // If history already ends with this inbound message, don't double-add
    const lastMsg = history[history.length - 1];
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== messageBody) {
      history.push({ role: 'user', content: messageBody });
    }

    // Call Claude to generate Ricky's reply
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: history,
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      throw new Error(`Claude API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    let reply: string = claudeData.content?.[0]?.text?.trim() || '';

    if (!reply) throw new Error('Claude returned empty response');

    // Swap in real calendar link
    reply = reply.replace('{{CALENDAR_LINK}}', calendarLink);

    console.log('Ricky reply:', reply);

    // Send reply via GHL conversations API
    const sendRes = await fetch(`${GHL_API}/conversations/messages`, {
      method: 'POST',
      headers: ghlHeaders,
      body: JSON.stringify({
        type: 'SMS',
        contactId,
        conversationId,
        locationId,
        message: reply,
      }),
    });

    const sendData = await parseJson(sendRes);

    if (!sendRes.ok) {
      console.error('GHL send error:', JSON.stringify(sendData));
      return new Response(JSON.stringify({ error: 'Failed to send reply', details: sendData }), {
        status: sendRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, reply, messageId: sendData.messageId || sendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('ghl-sales-chatbot error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
