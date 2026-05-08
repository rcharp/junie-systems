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

  // Find tight bounding box of opaque pixels so we can crop the transparent padding.
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
  }
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropped = new Image(cropW, cropH);
  for (let y = 0; y < cropH; y++) {
    for (let x = 0; x < cropW; x++) {
      const srcIdx = (y + minY) * w + (x + minX);
      if (alpha[srcIdx]) cropped.setPixelAt(x + 1, y + 1, px[srcIdx] | 0xff);
      else cropped.setPixelAt(x + 1, y + 1, 0x00000000);
    }
  }

  const MAX_WIDTH = 300;
  const MAX_CORE_WIDTH = 276;
  let resized: Image = cropped;
  if (cropW > MAX_CORE_WIDTH) {
    const newH = Math.max(1, Math.round((cropH / cropW) * MAX_CORE_WIDTH));
    resized = cropped.resize(MAX_CORE_WIDTH, newH);
  }

  // Build a single unified sticker outline around ONLY the outer edges of
  // the combined logo. We first close gaps between letters/icons by dilating
  // the alpha mask, then fill any interior holes, then draw a white border
  // around that merged silhouette only.
  const rW = resized.width;
  const rH = resized.height;
  const stroke = Math.max(4, Math.min(10, Math.round(Math.min(rW, rH) * 0.035)));
  const mergeRadius = Math.max(stroke + 2, Math.round(Math.min(rW, rH) * 0.06));
  const pad = stroke + mergeRadius + 2;
  const outW = rW + pad * 2;
  const outH = rH + pad * 2;
  const N = outW * outH;

  const srcAlpha = new Uint8Array(N);
  const srcColor = new Uint32Array(N);
  for (let y = 0; y < rH; y++) {
    for (let x = 0; x < rW; x++) {
      const c = resized.getPixelAt(x + 1, y + 1);
      const dst = (y + pad) * outW + (x + pad);
      srcColor[dst] = c;
      srcAlpha[dst] = (c & 0xff) >= 128 ? 1 : 0;
    }
  }

  // Separable square dilation (Chebyshev): two 1D max passes. O(N * r).
  const dilate = (src: Uint8Array, r: number): Uint8Array => {
    const tmp = new Uint8Array(N);
    const out = new Uint8Array(N);
    for (let y = 0; y < outH; y++) {
      const row = y * outW;
      for (let x = 0; x < outW; x++) {
        let v = 0;
        const x0 = Math.max(0, x - r);
        const x1 = Math.min(outW - 1, x + r);
        for (let xx = x0; xx <= x1; xx++) {
          if (src[row + xx]) { v = 1; break; }
        }
        tmp[row + x] = v;
      }
    }
    for (let x = 0; x < outW; x++) {
      for (let y = 0; y < outH; y++) {
        let v = 0;
        const y0 = Math.max(0, y - r);
        const y1 = Math.min(outH - 1, y + r);
        for (let yy = y0; yy <= y1; yy++) {
          if (tmp[yy * outW + x]) { v = 1; break; }
        }
        out[y * outW + x] = v;
      }
    }
    return out;
  };

  // 1) Dilate to bridge gaps between separate logo pieces.
  const merged = dilate(srcAlpha, mergeRadius);

  // 2) Flood-fill the exterior, then fill internal holes.
  const exterior = new Uint8Array(N);
  const fq: number[] = [];
  const pushExt = (idx: number) => {
    if (!exterior[idx] && !merged[idx]) { exterior[idx] = 1; fq.push(idx); }
  };
  for (let x = 0; x < outW; x++) { pushExt(x); pushExt((outH - 1) * outW + x); }
  for (let y = 0; y < outH; y++) { pushExt(y * outW); pushExt(y * outW + outW - 1); }
  for (let head = 0; head < fq.length; head++) {
    const idx = fq[head];
    const x = idx % outW;
    const y = (idx - x) / outW;
    if (x > 0) pushExt(idx - 1);
    if (x < outW - 1) pushExt(idx + 1);
    if (y > 0) pushExt(idx - outW);
    if (y < outH - 1) pushExt(idx + outW);
  }
  const silhouette = new Uint8Array(N);
  for (let i = 0; i < N; i++) silhouette[i] = exterior[i] ? 0 : 1;

  // 3) Expand silhouette by stroke; sticker = expanded silhouette.
  const sticker = dilate(silhouette, stroke);

  const finalImg = new Image(outW, outH);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const idx = y * outW + x;
      if (srcAlpha[idx]) finalImg.setPixelAt(x + 1, y + 1, srcColor[idx] | 0xff);
      else if (sticker[idx]) finalImg.setPixelAt(x + 1, y + 1, 0xffffffff);
      else finalImg.setPixelAt(x + 1, y + 1, 0x00000000);
    }
  }

  return await finalImg.encode(0);
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
      ? `${industry.trim()}`
      : "business";
    const prompt = `Generate a logo for ${companyName}, a ${industryText} company`;

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
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

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
