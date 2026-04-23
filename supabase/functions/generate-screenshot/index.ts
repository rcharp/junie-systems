import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hardcoded source template that gets personalized via injected JS, then screenshotted.
const SOURCE_SITE_URL = "https://junk-hauling-junie.lovable.app/";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { companyName, phoneNumber, industry, logoUrl, transparentLogoBg } = await req.json();
    const wantsTransparent = transparentLogoBg !== false; // default true

    if (!companyName || !logoUrl) {
      return new Response(JSON.stringify({ error: "companyName and logoUrl are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Screenshot pipeline: ${companyName}, industry=${industry}, logo=${logoUrl}, transparent=${wantsTransparent}`);

    const browserlessKey = Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessKey) {
      return new Response(JSON.stringify({ error: "BROWSERLESS_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PARALLEL PHASE 1: Color extraction + logo URL upgrade ───
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let navbarBgColor = "#ffffff";
    let primaryColor = "#2d6a4f";
    let secondaryColor = "#40916c";
    let finalLogoUrl = logoUrl;
    let injectedLogoSrc = logoUrl;
    let canvasBgColor = "#ffffff";

    const startTime = Date.now();

    const upscalePromise = (async () => {
      try {
        const upgradedGoogleUrl = logoUrl.replace(/\/s\d+-p-k-no-ns-nd\//, "/s512-p-k-no-ns-nd/");
        if (upgradedGoogleUrl !== logoUrl) {
          console.log("Using higher-resolution Google-hosted logo source");
          return upgradedGoogleUrl;
        }
      } catch (err) {
        console.warn("Logo URL upgrade failed, using original:", err);
      }
      return logoUrl;
    })();

    const colorPromise = (async () => {
      if (!LOVABLE_API_KEY) return;
      try {
        console.log("Extracting colors from logo via AI...");
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: `Analyze this logo image and extract exactly 4 values as 6-digit hex codes (#RRGGBB):

1. "canvas_background" - Look at the CORNERS and EDGES of the rectangular image. What color is the canvas/background area OUTSIDE the logo artwork? If corners are white or transparent, return #FFFFFF.

2. "logo_background" - The background color behind the logo artwork itself. If the logo sits on a white canvas, look at the area immediately behind/around the logo shape. If the logo has a colored background (like a colored circle or square), return that color. If transparent/white, return #FFFFFF.

3. "primary" - The most prominent/dominant color in the logo ARTWORK (not any background). Do NOT return white or black.

4. "secondary" - Second most prominent color, different from primary. If only one color exists, return a 30% darker variant of primary. Do NOT return white or black.

Return valid 6-digit hex codes only.` },
                { type: "image_url", image_url: { url: logoUrl } },
              ],
            }],
            tools: [{
              type: "function",
              function: {
                name: "extract_colors",
                description: "Extract canvas bg, logo bg, primary, and secondary colors",
                parameters: {
                  type: "object",
                  properties: {
                    canvas_background: { type: "string", description: "Image canvas/corner color as hex" },
                    logo_background: { type: "string", description: "Logo background color as hex" },
                    primary: { type: "string", description: "Main brand color as hex" },
                    secondary: { type: "string", description: "Second brand color as hex" },
                  },
                  required: ["canvas_background", "logo_background", "primary", "secondary"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "extract_colors" } },
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const colors = JSON.parse(toolCall.function.arguments);
            const hexRegex = /^#[0-9a-fA-F]{6}$/;
            if (colors.canvas_background && hexRegex.test(colors.canvas_background)) canvasBgColor = colors.canvas_background;
            if (colors.logo_background && hexRegex.test(colors.logo_background)) navbarBgColor = colors.logo_background;
            if (colors.primary && hexRegex.test(colors.primary)) primaryColor = colors.primary;
            if (colors.secondary && hexRegex.test(colors.secondary)) secondaryColor = colors.secondary;
            function isNearWhiteOrBlack(hex: string): boolean {
              const c = hex.replace('#', '');
              const r = parseInt(c.substr(0,2),16);
              const g = parseInt(c.substr(2,2),16);
              const b = parseInt(c.substr(4,2),16);
              const lum = (r + g + b) / 3;
              return lum > 220 || lum < 30;
            }
            if (isNearWhiteOrBlack(secondaryColor)) {
              const c = primaryColor.replace('#', '');
              const r = Math.max(0, Math.round(parseInt(c.substr(0,2),16) * 0.7));
              const g = Math.max(0, Math.round(parseInt(c.substr(2,2),16) * 0.7));
              const b = Math.max(0, Math.round(parseInt(c.substr(4,2),16) * 0.7));
              secondaryColor = '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
            }
            if (isNearWhiteOrBlack(primaryColor)) {
              primaryColor = secondaryColor;
            }
            console.log(`Colors extracted in ${Date.now() - startTime}ms: canvasBg=${canvasBgColor}, navbarBg=${navbarBgColor}, primary=${primaryColor}, secondary=${secondaryColor}`);
          }
        }
      } catch (aiErr) {
        console.warn("AI color extraction error, using defaults:", aiErr);
      }
    })();

    const [upscaledUrl] = await Promise.all([upscalePromise, colorPromise]);
    finalLogoUrl = upscaledUrl;

    // ─── Optional: AI background removal + white outline via Nano Banana ───
    if (wantsTransparent && LOVABLE_API_KEY) {
      try {
        console.log(`Calling Nano Banana to remove background + outline at ${Date.now() - startTime}ms`);
        const editRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Remove the background from this logo so it is fully transparent. Then add a clean, solid white outline (stroke) approximately 8-12 pixels thick that hugs the outer silhouette of the logo artwork — including text and graphics — exactly like a die-cut sticker. The outline must be pure white (#FFFFFF), uniform thickness, smooth, and continuous around the entire outer edge of the logo. Do not add any drop shadow, glow, or background. Preserve the original logo colors and details perfectly. Output a transparent PNG.",
                },
                { type: "image_url", image_url: { url: finalLogoUrl } },
              ],
            }],
            modalities: ["image", "text"],
          }),
        });

        if (editRes.ok) {
          const editData = await editRes.json();
          const dataUrl: string | undefined =
            editData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (dataUrl && dataUrl.startsWith("data:image/")) {
            const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              const b64 = match[2];
              const rawBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

              let outputBytes: Uint8Array = rawBytes;
              try {
                const decoded = await decode(rawBytes);
                if (decoded instanceof Image) {
                  const img = decoded;
                  const w = img.width;
                  const h = img.height;
                  function isCheckerGray(rgba: number) {
                    const r = (rgba >>> 24) & 0xff;
                    const g = (rgba >>> 16) & 0xff;
                    const b = (rgba >>> 8) & 0xff;
                    const a = rgba & 0xff;
                    if (a < 250) return false;
                    const max = Math.max(r, g, b);
                    const min = Math.min(r, g, b);
                    if (max - min > 14) return false;
                    return max >= 170 && max <= 240 && min >= 170 && min <= 240;
                  }
                  const samples: number[] = [];
                  const xs = [1, Math.floor(w * 0.1), Math.floor(w * 0.25), Math.floor(w * 0.5), Math.floor(w * 0.75), Math.floor(w * 0.9), w];
                  const ys = [1, Math.floor(h * 0.1), Math.floor(h * 0.5), Math.floor(h * 0.9), h];
                  for (const x of xs) {
                    samples.push(img.getPixelAt(x, 1));
                    samples.push(img.getPixelAt(x, h));
                  }
                  for (const y of ys) {
                    samples.push(img.getPixelAt(1, y));
                    samples.push(img.getPixelAt(w, y));
                  }
                  const hasChecker = samples.some(isCheckerGray);
                  if (hasChecker) {
                    console.log("Detected fake checkerboard transparency, flood-filling background");
                    function isBgLike(rgba: number) {
                      const r = (rgba >>> 24) & 0xff;
                      const g = (rgba >>> 16) & 0xff;
                      const b = (rgba >>> 8) & 0xff;
                      const max = Math.max(r, g, b);
                      const min = Math.min(r, g, b);
                      if (max - min > 18) return false;
                      return min >= 170;
                    }
                    const buf = new Uint32Array(w * h);
                    for (let y = 0; y < h; y++) {
                      for (let x = 0; x < w; x++) {
                        buf[y * w + x] = img.getPixelAt(x + 1, y + 1);
                      }
                    }
                    const visited = new Uint8Array(w * h);
                    const queue: number[] = [];
                    for (let x = 0; x < w; x++) {
                      if (isBgLike(buf[x])) queue.push(x);
                      const bottomIdx = (h - 1) * w + x;
                      if (isBgLike(buf[bottomIdx])) queue.push(bottomIdx);
                    }
                    for (let y = 0; y < h; y++) {
                      const leftIdx = y * w;
                      const rightIdx = y * w + (w - 1);
                      if (isBgLike(buf[leftIdx])) queue.push(leftIdx);
                      if (isBgLike(buf[rightIdx])) queue.push(rightIdx);
                    }
                    let head = 0;
                    while (head < queue.length) {
                      const idx = queue[head++];
                      if (visited[idx]) continue;
                      visited[idx] = 1;
                      const x = idx % w;
                      const y = (idx - x) / w;
                      if (x > 0) { const n = idx - 1; if (!visited[n] && isBgLike(buf[n])) queue.push(n); }
                      if (x < w - 1) { const n = idx + 1; if (!visited[n] && isBgLike(buf[n])) queue.push(n); }
                      if (y > 0) { const n = idx - w; if (!visited[n] && isBgLike(buf[n])) queue.push(n); }
                      if (y < h - 1) { const n = idx + w; if (!visited[n] && isBgLike(buf[n])) queue.push(n); }
                    }
                    const out = new Image(w, h);
                    for (let y = 0; y < h; y++) {
                      for (let x = 0; x < w; x++) {
                        if (visited[y * w + x]) {
                          out.setPixelAt(x + 1, y + 1, 0x00000000);
                        } else {
                          out.setPixelAt(x + 1, y + 1, buf[y * w + x] | 0xff);
                        }
                      }
                    }
                    outputBytes = await out.encode(0);
                  }
                }
              } catch (decodeErr) {
                console.warn("Post-process decode failed, uploading raw image:", decodeErr);
              }

              const path = `logos/outlined-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
              const { error: upErr } = await supabase.storage
                .from("sites")
                .upload(path, outputBytes, { contentType: "image/png", upsert: true });
              if (!upErr) {
                finalLogoUrl = `${supabaseUrl}/storage/v1/object/public/sites/${path}`;
                console.log(`Outlined logo uploaded: ${finalLogoUrl}`);
              } else {
                console.warn("Outlined logo upload failed, using original:", upErr.message);
              }
            }
          } else {
            console.warn("Nano Banana returned no image, falling back to original");
          }
        } else {
          const t = await editRes.text();
          console.warn("Nano Banana edit failed:", editRes.status, t.slice(0, 200));
        }
      } catch (err) {
        console.warn("Nano Banana background removal error:", err);
      }
    }

    console.log(`Phase 1 done in ${Date.now() - startTime}ms. Using site URL: ${SOURCE_SITE_URL}`);

    // ─── PHASE 2: Browserless screenshot ───
    const formattedPhone = formatPhone(phoneNumber || "");
    injectedLogoSrc = await buildInlineLogoSrc(finalLogoUrl) ?? `${finalLogoUrl}${finalLogoUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;

    const injectionScript = buildInjectionScript({
      companyName,
      phoneNumber: formattedPhone,
      rawPhone: (phoneNumber || "").replace(/\D/g, ""),
      logoUrl: injectedLogoSrc,
      navbarBgColor,
      primaryColor,
      secondaryColor,
      skipLogoProcessing: !wantsTransparent,
      logoAlreadyTransparent: wantsTransparent,
    });

    console.log(`Starting browserless at ${Date.now() - startTime}ms`);

    const screenshotRes = await fetch(
      `https://production-sfo.browserless.io/screenshot?token=${browserlessKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: SOURCE_SITE_URL,
          options: {
            type: "jpeg",
            quality: 85,
            fullPage: false,
          },
          viewport: {
            width: 1440,
            height: 900,
            deviceScaleFactor: 2,
          },
          gotoOptions: {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          },
          addScriptTag: [{ content: injectionScript }],
          waitForTimeout: 800,
        }),
      }
    );

    if (!screenshotRes.ok) {
      const errText = await screenshotRes.text();
      console.error("Browserless screenshot error:", screenshotRes.status, errText);
      throw new Error(`Screenshot failed: ${screenshotRes.status} - ${errText.slice(0, 300)}`);
    }

    const imageBuffer = new Uint8Array(await screenshotRes.arrayBuffer());
    const safeCompanyName = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const storagePath = `screenshots/${Date.now()}-${safeCompanyName}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("sites")
      .upload(storagePath, imageBuffer, { contentType: "image/jpeg", upsert: true });
    if (uploadErr) throw uploadErr;

    const screenshotUrl = `${supabaseUrl}/storage/v1/object/public/sites/${storagePath}`;
    console.log(`Screenshot complete in ${Date.now() - startTime}ms: ${screenshotUrl}`);

    return new Response(
      JSON.stringify({ success: true, screenshotUrl, colors: { navbarBg: navbarBgColor, primary: primaryColor, secondary: secondaryColor } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("generate-screenshot error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}

async function buildInlineLogoSrc(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) {
      console.warn("Failed to inline logo:", res.status, res.statusText);
      return null;
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${uint8ToBase64(bytes)}`;
  } catch (error) {
    console.warn("Inline logo fetch failed:", error);
    return null;
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function buildInjectionScript(params: {
  companyName: string;
  phoneNumber: string;
  rawPhone: string;
  logoUrl: string;
  navbarBgColor: string;
  primaryColor: string;
  secondaryColor: string;
  skipLogoProcessing?: boolean;
  logoAlreadyTransparent?: boolean;
}): string {
  const { companyName, phoneNumber, rawPhone, logoUrl, navbarBgColor, primaryColor, secondaryColor, skipLogoProcessing, logoAlreadyTransparent } = params;
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n");

  return `
(function() {
  try {
    var companyName = '${esc(companyName)}';
    var phoneNumber = '${esc(phoneNumber)}';
    var rawPhone = '${esc(rawPhone)}';
    var logoUrl = '${esc(logoUrl)}';
    var navbarBgColor = '${esc(navbarBgColor)}';
    var primaryColor = '${esc(primaryColor)}';
    var secondaryColor = '${esc(secondaryColor)}';
    var skipLogoProcessing = ${skipLogoProcessing ? "true" : "false"};
    var logoAlreadyTransparent = ${logoAlreadyTransparent ? "true" : "false"};

    function buildOutlinedLogoUrl(callback) {
      if (skipLogoProcessing) { return callback(logoUrl); }
      var source = new Image();
      source.crossOrigin = 'anonymous';
      source.onload = function() {
        try {
          var canvas = document.createElement('canvas');
          var width = source.naturalWidth || source.width || 300;
          var height = source.naturalHeight || source.height || 180;
          canvas.width = width;
          canvas.height = height;
          var ctx = canvas.getContext('2d');
          if (!ctx) return callback(logoUrl);
          ctx.drawImage(source, 0, 0, width, height);

          var imageData = ctx.getImageData(0, 0, width, height);
          var data = imageData.data;

          function sample(x, y) {
            var i = (y * width + x) * 4;
            return [data[i], data[i + 1], data[i + 2]];
          }

          var minX = width, minY = height, maxX = -1, maxY = -1;

          if (logoAlreadyTransparent) {
            for (var p = 0; p < data.length; p += 4) {
              if (data[p + 3] > 16) {
                var pixelIndex = p / 4;
                var x = pixelIndex % width;
                var y = Math.floor(pixelIndex / width);
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
          } else {
            var bg = sample(0, 0);
            var isWhiteBg = (bg[0] >= 240 && bg[1] >= 240 && bg[2] >= 240);
            if (!isWhiteBg) {
              return callback(canvas.toDataURL('image/png'));
            }
            var tolerance = 42;
            for (var p = 0; p < data.length; p += 4) {
              var dr = Math.abs(data[p] - bg[0]);
              var dg = Math.abs(data[p + 1] - bg[1]);
              var db = Math.abs(data[p + 2] - bg[2]);
              if (dr <= tolerance && dg <= tolerance && db <= tolerance) {
                data[p + 3] = 0;
              } else if (data[p + 3] > 0) {
                var pixelIndex = p / 4;
                var x = pixelIndex % width;
                var y = Math.floor(pixelIndex / width);
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
              }
            }
            ctx.putImageData(imageData, 0, 0);
          }

          var padding = Math.max(8, Math.round(Math.min(width, height) * 0.04));
          if (maxX <= minX || maxY <= minY) return callback(canvas.toDataURL('image/png'));
          var cropX = Math.max(0, minX - padding);
          var cropY = Math.max(0, minY - padding);
          var cropW = Math.min(width - cropX, (maxX - minX + 1) + padding * 2);
          var cropH = Math.min(height - cropY, (maxY - minY + 1) + padding * 2);
          var cleanCanvas = document.createElement('canvas');
          cleanCanvas.width = cropW;
          cleanCanvas.height = cropH;
          var cleanCtx = cleanCanvas.getContext('2d');
          if (!cleanCtx) return callback(canvas.toDataURL('image/png'));
          cleanCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          var silCanvas = document.createElement('canvas');
          var outlineWidth = Math.max(3, Math.round(Math.min(cropW, cropH) * 0.018));
          var mergeRadius = Math.max(6, Math.round(Math.min(cropW, cropH) * 0.035));
          var margin = outlineWidth + mergeRadius + 2;
          silCanvas.width = cropW + margin * 2;
          silCanvas.height = cropH + margin * 2;
          var silCtx = silCanvas.getContext('2d');
          if (!silCtx) return callback(cleanCanvas.toDataURL('image/png'));

          var mergedCanvas = document.createElement('canvas');
          mergedCanvas.width = silCanvas.width;
          mergedCanvas.height = silCanvas.height;
          var mergedCtx = mergedCanvas.getContext('2d');
          if (!mergedCtx) return callback(cleanCanvas.toDataURL('image/png'));
          for (var mdx = -mergeRadius; mdx <= mergeRadius; mdx++) {
            for (var mdy = -mergeRadius; mdy <= mergeRadius; mdy++) {
              if (mdx * mdx + mdy * mdy > mergeRadius * mergeRadius) continue;
              mergedCtx.drawImage(cleanCanvas, margin + mdx, margin + mdy);
            }
          }

          var silData = mergedCtx.getImageData(0, 0, silCanvas.width, silCanvas.height);
          var sd = silData.data;
          var sw = silCanvas.width;
          var sh = silCanvas.height;

          var visited = new Uint8Array(sw * sh);
          var queue = [];
          for (var fx = 0; fx < sw; fx++) {
            if (sd[(0 * sw + fx) * 4 + 3] < 16) queue.push(fx + 0 * sw);
            if (sd[((sh - 1) * sw + fx) * 4 + 3] < 16) queue.push(fx + (sh - 1) * sw);
          }
          for (var fy = 0; fy < sh; fy++) {
            if (sd[(fy * sw + 0) * 4 + 3] < 16) queue.push(0 + fy * sw);
            if (sd[(fy * sw + sw - 1) * 4 + 3] < 16) queue.push(sw - 1 + fy * sw);
          }
          for (var qi = 0; qi < queue.length; qi++) {
            var idx = queue[qi];
            if (visited[idx]) continue;
            visited[idx] = 1;
            var ix = idx % sw;
            var iy = Math.floor(idx / sw);
            if (sd[idx * 4 + 3] >= 16) continue;
            sd[idx * 4 + 3] = 1;
            if (ix > 0) queue.push((idx - 1));
            if (ix < sw - 1) queue.push((idx + 1));
            if (iy > 0) queue.push((idx - sw));
            if (iy < sh - 1) queue.push((idx + sw));
          }

          for (var sp = 0; sp < sd.length; sp += 4) {
            if (sd[sp + 3] === 1) {
              sd[sp + 3] = 0;
            } else {
              sd[sp] = 0; sd[sp + 1] = 0; sd[sp + 2] = 0; sd[sp + 3] = 255;
            }
          }
          silCtx.putImageData(silData, 0, 0);

          var outCanvas = document.createElement('canvas');
          outCanvas.width = silCanvas.width;
          outCanvas.height = silCanvas.height;
          var outCtx = outCanvas.getContext('2d');
          if (!outCtx) return callback(cleanCanvas.toDataURL('image/png'));

          outCtx.globalCompositeOperation = 'source-over';
          for (var dx = -outlineWidth; dx <= outlineWidth; dx++) {
            for (var dy = -outlineWidth; dy <= outlineWidth; dy++) {
              if (dx * dx + dy * dy > (outlineWidth + 0.5) * (outlineWidth + 0.5)) continue;
              outCtx.drawImage(silCanvas, dx, dy);
            }
          }
          outCtx.globalCompositeOperation = 'source-in';
          outCtx.fillStyle = 'white';
          outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);

          outCtx.globalCompositeOperation = 'source-over';
          outCtx.drawImage(cleanCanvas, margin, margin);

          callback(outCanvas.toDataURL('image/png'));
        } catch (e) {
          callback(logoUrl);
        }
      };
      source.onerror = function() { callback(logoUrl); };
      source.src = logoUrl;
    }

    function applyLogoStyles(img) {
      img.srcset = '';
      img.style.cssText += '; width: 300px !important; min-width: 300px !important; max-width: 300px !important; height: auto !important; max-height: none !important; object-fit: contain !important; image-rendering: auto !important; mix-blend-mode: normal !important;';
      img.removeAttribute('width');
      img.removeAttribute('height');
      var parent = img.parentElement;
      if (parent) {
        parent.style.cssText += '; overflow: visible !important; max-height: none !important; height: auto !important;';
      }
    }

    var cleanedLogoUrlCache = null;
    function appendNewLogo(el) {
      var img = document.createElement('img');
      img.src = cleanedLogoUrlCache || logoUrl;
      img.style.cssText = 'width: 300px; min-width: 300px; max-width: 300px; height: auto; object-fit: contain; image-rendering: auto;';
      el.textContent = '';
      el.appendChild(img);
    }

    buildOutlinedLogoUrl(function(cleanedLogoUrl) {
      cleanedLogoUrlCache = cleanedLogoUrl;

      var navSelectors = [
        'header', 'nav',
        '[class*="nav"]', '[class*="header"]',
        '[class*="sticky"]', '[class*="branding"]',
        '[class*="logo"]', '.c-nav-menu',
      ];
      var headerAreas = document.querySelectorAll(navSelectors.join(','));
      headerAreas.forEach(function(area) {
        var imgs = area.querySelectorAll('img');
        imgs.forEach(function(img) {
          img.src = cleanedLogoUrl;
          applyLogoStyles(img);
        });
      });

      document.querySelectorAll('img').forEach(function(img) {
        var src = (img.src || '').toLowerCase();
        var alt = (img.alt || '').toLowerCase();
        var cls = (img.className || '').toLowerCase();
        if (src.indexOf('logo') !== -1 || alt.indexOf('logo') !== -1 || cls.indexOf('logo') !== -1) {
          img.src = cleanedLogoUrl;
          applyLogoStyles(img);
        }
      });

      document.querySelectorAll('[class*="logo"], #logo, [class*="brand"]').forEach(function(el) {
        if (!el.querySelector('img') && el.textContent.trim().length < 30) {
          appendNewLogo(el);
        }
      });
    });

    var phoneRegex = /(?:\\+?1[-. ]?)?\\(?\\d{3}\\)?[-. ]?\\d{3}[-. ]?\\d{4}/g;

    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    textNodes.forEach(function(node) {
      var parent = node.parentElement;
      if (parent && ['SCRIPT','STYLE','NOSCRIPT'].indexOf(parent.tagName) === -1) {
        if (node.textContent && phoneRegex.test(node.textContent)) {
          node.textContent = node.textContent.replace(phoneRegex, phoneNumber);
        }
      }
    });

    var telLinks = document.querySelectorAll('a[href^="tel:"]');
    telLinks.forEach(function(link) {
      link.href = 'tel:' + rawPhone;
      if (link.textContent && /\\d{3}/.test(link.textContent)) {
        link.textContent = phoneNumber;
      }
    });

    var originalNames = [];
    var titleEl = document.querySelector('title');
    if (titleEl && titleEl.textContent) {
      var titleName = titleEl.textContent.split(/[|\\-–—]/)[0].trim();
      if (titleName && titleName.length > 2 && titleName.length < 50) originalNames.push(titleName);
    }
    var metaOg = document.querySelector('meta[property="og:site_name"]');
    if (metaOg) {
      var ogName = (metaOg.getAttribute('content') || '').trim();
      if (ogName && ogName.length > 2) originalNames.push(ogName);
    }
    document.querySelectorAll('strong, b').forEach(function(el) {
      var t = (el.textContent || '').trim();
      if (t.length > 2 && t.length < 40 && t !== companyName && !/consent|agree|help|stop|message/i.test(t)) {
        if (originalNames.indexOf(t) === -1) originalNames.push(t);
      }
    });

    var walker2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var textNodes2 = [];
    while (walker2.nextNode()) textNodes2.push(walker2.currentNode);
    textNodes2.forEach(function(node) {
      var parent = node.parentElement;
      if (parent && ['SCRIPT','STYLE','NOSCRIPT'].indexOf(parent.tagName) === -1 && node.textContent) {
        node.textContent = node.textContent
          .replace(/YOUR\\s*LOGO\\s*HERE/gi, companyName)
          .replace(/\\{\\{company_name\\}\\}/gi, companyName);
        originalNames.forEach(function(name) {
          var escaped = name.replace(/[-\\/\\\\^$*+?.()|{}]/g, '\\\\$&');
          node.textContent = node.textContent.replace(new RegExp(escaped, 'gi'), companyName);
        });
      }
    });

    function contrastColor(hex) {
      var c = hex.replace('#', '');
      if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
      var r = parseInt(c.substr(0,2),16)/255;
      var g = parseInt(c.substr(2,2),16)/255;
      var b = parseInt(c.substr(4,2),16)/255;
      var lum = 0.2126*r + 0.7152*g + 0.0722*b;
      return lum > 0.4 ? '#1a1a1a' : '#ffffff';
    }

    var navTextColor = primaryColor;
    var btnTextColor = contrastColor(primaryColor);

    document.querySelectorAll('a[href^="tel:"], [class*="phone"] a, [class*="call"] a, [class*="phone"] button, [class*="call"] button').forEach(function(el) {
      el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: ' + btnTextColor + ' !important; border-color: ' + primaryColor + ' !important;';
    });

    document.querySelectorAll('a, button').forEach(function(el) {
      var text = (el.textContent || '').trim().toLowerCase();
      if (text.indexOf('free quote') !== -1 || text.indexOf('get quote') !== -1 || text.indexOf('get a quote') !== -1 || text.indexOf('request quote') !== -1) {
        el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: ' + btnTextColor + ' !important; border-color: ' + primaryColor + ' !important;';
      }
    });

    document.querySelectorAll('[class*="hero-highlighted"], .hero-highlighted, [class*="hero_highlighted"], #hero-highlighted, [class*="highlight"], span[style*="color"], em, .accent-text').forEach(function(el) {
      var parent = el.closest('section, [class*="hero"], [class*="banner"], header, [class*="fold"], [class*="jumbotron"]');
      var cls = (el.className || '').toLowerCase();
      var id = (el.id || '').toLowerCase();
      if (parent || cls.indexOf('hero') !== -1 || cls.indexOf('highlight') !== -1 || id.indexOf('hero') !== -1) {
        el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: #ffffff !important;';
      }
    });
    var quoteForm = document.querySelector('#hero-quote-form');
    if (quoteForm) {
      quoteForm.style.cssText += '; border-color: ' + primaryColor + ' !important;';
    }
    var styleEl = document.createElement('style');
    styleEl.textContent = '.hero-highlighted, [class*="hero-highlighted"], [class*="hero_highlighted"], #hero-highlighted { color: ' + primaryColor + ' !important; } #hero-quote-form { border-color: ' + primaryColor + ' !important; }';
    document.head.appendChild(styleEl);

    console.log('Personalization injected successfully');
  } catch(err) {
    console.error('Personalization error:', err);
  }
})();
`;
}
