// @ts-nocheck
// DISABLED: replies are now handled by the GHL Conversation AI agent
// attached to each per-demo chat widget. This endpoint is a no-op.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  return new Response(JSON.stringify({ ok: true, disabled: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
