// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const MAX_PAGES = 25;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const BLOG_RE = /\/(blog|posts?|news|articles?|tag|category|author)(\/|$)/i;
const ASSET_RE = /\.(jpg|jpeg|png|gif|svg|webp|pdf|zip|mp4|mp3|css|js|ico|woff2?)(\?|$)/i;

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkText(text: string, url: string): { content: string; url: string }[] {
  const out: { content: string; url: string }[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const slice = text.slice(i, i + CHUNK_SIZE).trim();
    if (slice.length > 100) out.push({ content: `Source: ${url}\n\n${slice}`, url });
  }
  return out;
}

async function fetchPage(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 JunieDemoBot' } });
    if (!r.ok) return '';
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return '';
    return await r.text();
  } catch {
    return '';
  }
}

function extractLinks(html: string, base: URL): string[] {
  const links = new Set<string>();
  const re = /href=["']([^"'#]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const u = new URL(m[1], base);
      if (u.hostname !== base.hostname) continue;
      if (ASSET_RE.test(u.pathname)) continue;
      if (BLOG_RE.test(u.pathname)) continue;
      u.hash = '';
      u.search = '';
      links.add(u.toString());
    } catch {}
  }
  return [...links];
}

async function crawlSite(startUrl: string): Promise<{ url: string; text: string }[]> {
  const base = new URL(startUrl);
  const seen = new Set<string>([base.toString()]);
  const queue = [base.toString()];
  const pages: { url: string; text: string }[] = [];
  while (queue.length && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    const html = await fetchPage(url);
    if (!html) continue;
    const text = htmlToText(html);
    if (text.length > 200) pages.push({ url, text });
    for (const link of extractLinks(html, base)) {
      if (!seen.has(link) && seen.size < MAX_PAGES * 3) {
        seen.add(link);
        queue.push(link);
      }
    }
  }
  return pages;
}

async function embedBatch(inputs: string[]): Promise<number[][]> {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/text-embedding-3-small', input: inputs }),
  });
  if (!r.ok) throw new Error(`Embed failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.data.map((d: any) => d.embedding);
}

async function processDemo(contactId: string, url: string, businessName: string) {
  const pages = await crawlSite(url);
  console.log(`[demo-build-kb] crawled ${pages.length} pages for ${contactId}`);

  // Delete previous chunks for this contact
  await sb.from('kb_chunks').delete().eq('contact_id', contactId);

  const allChunks: { content: string; url: string }[] = [];
  for (const p of pages) {
    allChunks.push(...chunkText(p.text, p.url));
  }
  console.log(`[demo-build-kb] ${allChunks.length} chunks`);

  // Embed in batches of 32
  const BATCH = 32;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const embeddings = await embedBatch(batch.map((c) => c.content));
    const rows = batch.map((c, idx) => ({
      contact_id: contactId,
      url: c.url,
      content: c.content,
      embedding: embeddings[idx] as any,
    }));
    const { error } = await sb.from('kb_chunks').insert(rows);
    if (error) console.error('[demo-build-kb] insert error', error);
  }

  await sb.from('demo_sessions').upsert(
    {
      ghl_contact_id: contactId,
      prospect_url: url,
      business_name: businessName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'ghl_contact_id' },
  );
  console.log(`[demo-build-kb] done ${contactId}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (req.method === 'GET') {
      const u = new URL(req.url);
      const contactId = u.searchParams.get('contact_id') || u.searchParams.get('contactId');
      if (!contactId) return Response.json({ ok: false, error: 'contact_id required' }, { status: 400, headers: corsHeaders });
      const { data } = await sb.from('demo_sessions').select('*').eq('ghl_contact_id', contactId).maybeSingle();
      if (!data) return Response.json({ ok: false, error: 'session not found' }, { status: 404, headers: corsHeaders });
      const { count } = await sb.from('kb_chunks').select('*', { count: 'exact', head: true }).eq('contact_id', contactId);
      return Response.json({ ok: true, contactId, url: data.prospect_url, businessName: data.business_name, chunks: count ?? 0 }, { headers: corsHeaders });
    }

    const body = await req.json();
    const rawUrl: string = body.url;
    const contactId: string = body.contactId || body.contact_id;
    if (!rawUrl || !contactId) {
      return Response.json({ ok: false, error: 'url and contactId required' }, { status: 400, headers: corsHeaders });
    }
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const businessName = new URL(url).hostname.replace(/^www\./, '');

    // Insert/upsert immediately so GET works
    await sb.from('demo_sessions').upsert(
      { ghl_contact_id: contactId, prospect_url: url, business_name: businessName, updated_at: new Date().toISOString() },
      { onConflict: 'ghl_contact_id' },
    );

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(processDemo(contactId, url, businessName).catch((e) => console.error('[demo-build-kb] bg error', e)));

    return Response.json({ ok: true, contactId, url, businessName, status: 'processing' }, { headers: corsHeaders });
  } catch (e: any) {
    console.error('[demo-build-kb] error', e);
    return Response.json({ ok: false, error: e?.message ?? String(e) }, { status: 500, headers: corsHeaders });
  }
});
