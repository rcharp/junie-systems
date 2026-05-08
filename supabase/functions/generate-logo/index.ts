import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function forceTransparentStickerLogo(inputBytes: Uint8Array): Promise<Uint8Array> {
  const decoded = await decode(inputBytes);
  if (!(decoded instanceof Image)) return inputBytes;

  const img = decoded;
  const w = img.width;
  const h = img.height;
  const px = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) px[y * w + x] = img.getPixelAt(x + 1, y + 1);
  }

  const parts = (rgba: number) => ({
    r: (rgba >>> 24) & 0xff,
    g: (rgba >>> 16) & 0xff,
    b: (rgba >>> 8) & 0xff,
    a: rgba & 0xff,
  });
  const isBackgroundLike = (rgba: number) => {
    const { r, g, b, a } = parts(rgba);
    if (a < 250) return true;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    // Strip fake transparency/checkerboards and any edge-connected plain canvas
    // background, including white. A fresh sticker outline is added afterward.
    return saturation <= 35 && min >= 160;
  };

  const visited = new Uint8Array(w * h);
  const queue: number[] = [];
  for (let x = 0; x < w; x++) {
    if (isBackgroundLike(px[x])) queue.push(x);
    const bottom = (h - 1) * w + x;
    if (isBackgroundLike(px[bottom])) queue.push(bottom);
  }
  for (let y = 0; y < h; y++) {
    const left = y * w;
    const right = y * w + (w - 1);
    if (isBackgroundLike(px[left])) queue.push(left);
    if (isBackgroundLike(px[right])) queue.push(right);
  }
  for (let head = 0; head < queue.length; head++) {
    const idx = queue[head];
    if (visited[idx] || !isBackgroundLike(px[idx])) continue;
    visited[idx] = 1;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) queue.push(idx - 1);
    if (x < w - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - w);
    if (y < h - 1) queue.push(idx + w);
  }

  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < px.length; i++) alpha[i] = visited[i] ? 0 : ((px[i] & 0xff) > 12 ? 255 : 0);

  const out = new Image(w, h);
  const outlineRadius = Math.max(4, Math.round(Math.min(w, h) * 0.018));
  const outlineRadiusSq = outlineRadius * outlineRadius;
  const outline = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (alpha[idx]) continue;
      let nearLogo = false;
      for (let dy = -outlineRadius; dy <= outlineRadius && !nearLogo; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -outlineRadius; dx <= outlineRadius; dx++) {
          if (dx * dx + dy * dy > outlineRadiusSq) continue;
          const xx = x + dx;
          if (xx >= 0 && xx < w && alpha[yy * w + xx]) {
            nearLogo = true;
            break;
          }
        }
      }
      if (nearLogo) outline[idx] = 1;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (outline[idx]) out.setPixelAt(x + 1, y + 1, 0xffffffff);
      else if (alpha[idx]) out.setPixelAt(x + 1, y + 1, px[idx] | 0xff);
      else out.setPixelAt(x + 1, y + 1, 0x00000000);
    }
  }

  return await out.encode(0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyName, industry } = await req.json();
    if (!companyName || typeof companyName !== "string") {
      return new Response(JSON.stringify({ error: "companyName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const industryText = industry && typeof industry === "string" && industry.trim()
      ? ` a ${industry.trim()}`
      : "";
    const prompt = `Generate a logo for ${companyName},${industryText} company. CRITICAL REQUIREMENTS: (1) The background MUST be fully transparent alpha — no background color, no checkerboard pattern, no gray squares, no scene, no paper, no canvas, just the logo artwork on transparent PNG alpha. (2) The entire exterior silhouette of the logo MUST have a solid white outline/stroke wrapping around it like a sticker border. The white outline must hug the outermost edges of the whole logo as one continuous shape.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("Lovable AI error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI gateway error [${aiRes.status}]: ${txt}` }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const dataUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl || !dataUrl.startsWith("data:")) throw new Error("No image returned from AI gateway");

    const commaIdx = dataUrl.indexOf(",");
    const meta = dataUrl.slice(5, commaIdx); // e.g. image/png;base64
    const b64 = dataUrl.slice(commaIdx + 1);
    const contentType = meta.split(";")[0] || "image/png";
    const ext = contentType.split("/")[1] || "png";
    const rawBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    let bytes = rawBytes;
    try {
      bytes = await forceTransparentStickerLogo(rawBytes);
    } catch (postProcessErr) {
      console.warn("Logo transparency post-process failed, uploading raw image:", postProcessErr);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const safeName = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const path = `logos/generated-${safeName}-${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from("sites").upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    const logoUrl = `${SUPABASE_URL}/storage/v1/object/public/sites/${path}`;

    return new Response(JSON.stringify({ logoUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("generate-logo error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
