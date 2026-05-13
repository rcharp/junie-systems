import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ─── PARALLEL PHASE 1: Color extraction + Settings fetch simultaneously ───
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let navbarBgColor = "#ffffff";
    let primaryColor = "#2d6a4f";
    let secondaryColor = "#40916c";
    let finalLogoUrl = logoUrl;
    let injectedLogoSrc = logoUrl;
    let canvasBgColor = "#ffffff";

    const startTime = Date.now();

    function isNearWhite(hex: string): boolean {
      const c = hex.replace('#', '');
      const r = parseInt(c.substr(0, 2), 16);
      const g = parseInt(c.substr(2, 2), 16);
      const b = parseInt(c.substr(4, 2), 16);
      return r > 230 && g > 230 && b > 230;
    }

    // Fire color extraction + settings fetch + deterministic logo resolution upgrade in parallel
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
            // Darken colors that are too bright (especially yellow/green/cyan hues)
            function darkenIfTooBright(hex: string): string {
              const c = hex.replace('#', '');
              if (c.length !== 6) return hex;
              const r = parseInt(c.substr(0,2),16) / 255;
              const g = parseInt(c.substr(2,2),16) / 255;
              const b = parseInt(c.substr(4,2),16) / 255;
              const max = Math.max(r,g,b), min = Math.min(r,g,b);
              const l = (max + min) / 2;
              const d = max - min;
              let h = 0, s = 0;
              if (d !== 0) {
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                  case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
                  case g: h = ((b - r) / d + 2); break;
                  case b: h = ((r - g) / d + 4); break;
                }
                h *= 60;
              }
              // Perceived brightness: yellow/green/cyan (hue 60-200) feel brighter
              const isBrightHue = h >= 40 && h <= 200;
              const lightnessThreshold = isBrightHue ? 0.45 : 0.6;
              if (l <= lightnessThreshold) return hex;
              const targetL = isBrightHue ? 0.35 : 0.45;
              // Convert HSL back to RGB with new lightness
              const newL = targetL;
              function hue2rgb(p: number, q: number, t: number) {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
              }
              const q2 = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
              const p2 = 2 * newL - q2;
              const hk = h / 360;
              const nr = Math.round(hue2rgb(p2, q2, hk + 1/3) * 255);
              const ng = Math.round(hue2rgb(p2, q2, hk) * 255);
              const nb = Math.round(hue2rgb(p2, q2, hk - 1/3) * 255);
              return '#' + nr.toString(16).padStart(2,'0') + ng.toString(16).padStart(2,'0') + nb.toString(16).padStart(2,'0');
            }
            const beforeDarken = primaryColor;
            primaryColor = darkenIfTooBright(primaryColor);
            if (beforeDarken !== primaryColor) {
              console.log(`Primary color darkened from ${beforeDarken} to ${primaryColor}`);
            }
            console.log(`Colors extracted in ${Date.now() - startTime}ms: canvasBg=${canvasBgColor}, navbarBg=${navbarBgColor}, primary=${primaryColor}, secondary=${secondaryColor}`);
          }
        }
      } catch (aiErr) {
        console.warn("AI color extraction error, using defaults:", aiErr);
      }
    })();

    const settingsPromise = (async () => {
      const { data: settingsRows } = await supabase.from("settings").select("key, value")
        .in("key", ["industry_content_map", "browserless_api_key"]);
      const settingsMap: Record<string, string> = {};
      settingsRows?.forEach((s: any) => { settingsMap[s.key] = s.value; });
      return settingsMap;
    })();

    // Wait for color + settings + URL upgrade
    const [upscaledUrl, , settingsMap] = await Promise.all([upscalePromise, colorPromise, settingsPromise]);
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

              // Post-process: Gemini often returns a flat RGB image with a gray
              // checkerboard pattern baked in as fake transparency. Detect those
              // pixels by their low-saturation gray range and convert them to
              // real alpha=0.
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
                  // Sample a grid of edge points; if ANY of them looks like
                  // checkerboard gray (low-sat mid-gray), the whole image is
                  // fake-transparency and we should strip it.
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
                    // A pixel is "background-like" if it's near-white OR checker-gray
                    // (low saturation, light range). Anything else is logo content.
                    function isBgLike(rgba: number) {
                      const r = (rgba >>> 24) & 0xff;
                      const g = (rgba >>> 16) & 0xff;
                      const b = (rgba >>> 8) & 0xff;
                      const max = Math.max(r, g, b);
                      const min = Math.min(r, g, b);
                      if (max - min > 18) return false; // saturated => logo color
                      return min >= 170; // light gray to white
                    }
                    // Read all pixels into a flat Uint32 buffer (1-indexed coords
                    // in imagescript; convert to 0-indexed for our buffer).
                    const buf = new Uint32Array(w * h);
                    for (let y = 0; y < h; y++) {
                      for (let x = 0; x < w; x++) {
                        buf[y * w + x] = img.getPixelAt(x + 1, y + 1);
                      }
                    }
                    const visited = new Uint8Array(w * h);
                    const queue: number[] = [];
                    // Seed from all edge pixels that look bg-like
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
                    // BFS flood
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
                    // Build a fresh RGBA image so alpha actually persists in PNG output
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
    const browserlessKey = settingsMap["browserless_api_key"] || Deno.env.get("BROWSERLESS_API_KEY");
    if (!browserlessKey) {
      return new Response(JSON.stringify({ error: "Browserless API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let industryContentMap: Record<string, any> = {};
    try { industryContentMap = JSON.parse(settingsMap["industry_content_map"] || "{}"); } catch {}

    const industryKey = (industry || "general").toLowerCase().trim();
    const industryData = industryContentMap[industryKey];
    const siteUrl = industryData?.site_url;

    if (!siteUrl) {
      return new Response(JSON.stringify({ error: `No site URL configured for industry "${industryKey}". Go to Settings > Content & Templates and add a Site URL.` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Phase 1 done in ${Date.now() - startTime}ms. Using site URL: ${siteUrl}`);

    // ─── PHASE 2: Browserless screenshot ───
    const formattedPhone = formatPhone(phoneNumber || "");
    injectedLogoSrc = await buildInlineLogoSrc(finalLogoUrl) ?? `${finalLogoUrl}${finalLogoUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;

    const rawPhoneDigits = (phoneNumber || "").replace(/\D/g, "");
    const areaCode = rawPhoneDigits.length >= 10 ? rawPhoneDigits.slice(-10, -7) : "";
    const locationName = lookupAreaCodeLocation(areaCode);
    console.log(`Area code ${areaCode || "(none)"} -> location: ${locationName || "(none)"}`);

    const injectionScript = buildInjectionScript({
      companyName,
      phoneNumber: formattedPhone,
      rawPhone: rawPhoneDigits,
      logoUrl: injectedLogoSrc,
      navbarBgColor,
      primaryColor,
      secondaryColor,
      locationName,
      skipLogoProcessing: !wantsTransparent, // Always bake deterministic white outline when transparency is desired
      logoAlreadyTransparent: wantsTransparent, // Tell browser code the AI already removed bg
    });

    console.log(`Starting browserless at ${Date.now() - startTime}ms`);

    const screenshotRes = await fetch(
      `https://production-sfo.browserless.io/screenshot?token=${browserlessKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: siteUrl,
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
            waitUntil: "networkidle2",
            timeout: 45000,
          },
          addScriptTag: [{ content: injectionScript }],
          waitForTimeout: 9000,
        }),
      }
    );

    if (!screenshotRes.ok) {
      const errText = await screenshotRes.text();
      console.error("Browserless screenshot error:", screenshotRes.status, errText);
      throw new Error(`Screenshot failed: ${screenshotRes.status} - ${errText.slice(0, 300)}`);
    }

    let imageBuffer = new Uint8Array(await screenshotRes.arrayBuffer());
    const MAX_BYTES = 400 * 1024;
    let iLoveImgSucceeded = false;
    console.log(`Original screenshot size: ${imageBuffer.byteLength} bytes`);

    // ─── Compress via iLoveIMG API ───
    const ILOVEIMG_PUBLIC_KEY = Deno.env.get("ILOVEIMG_PUBLIC_KEY");
    if (imageBuffer.byteLength > MAX_BYTES && ILOVEIMG_PUBLIC_KEY) {
      try {
        const compressStart = Date.now();
        // 1. Auth
        const authRes = await fetch("https://api.ilovepdf.com/v1/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_key: ILOVEIMG_PUBLIC_KEY }),
        });
        if (!authRes.ok) throw new Error(`iLoveIMG auth failed: ${authRes.status}`);
        const { token } = await authRes.json();

        // 2. Start task
        const startRes = await fetch("https://api.ilovepdf.com/v1/start/compressimage", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!startRes.ok) throw new Error(`iLoveIMG start failed: ${startRes.status}`);
        const { server, task } = await startRes.json();

        // 3. Upload
        const uploadForm = new FormData();
        uploadForm.append("task", task);
        uploadForm.append("file", new Blob([imageBuffer], { type: "image/jpeg" }), "screenshot.jpg");
        const upRes = await fetch(`https://${server}/v1/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: uploadForm,
        });
        if (!upRes.ok) throw new Error(`iLoveIMG upload failed: ${upRes.status} ${await upRes.text()}`);
        const { server_filename } = await upRes.json();

        // 4. Process (extreme compression level)
        const procRes = await fetch(`https://${server}/v1/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            task,
            tool: "compressimage",
            compression_level: "extreme",
            files: [{ server_filename, filename: "screenshot.jpg" }],
          }),
        });
        if (!procRes.ok) throw new Error(`iLoveIMG process failed: ${procRes.status} ${await procRes.text()}`);

        // 5. Download
        const dlRes = await fetch(`https://${server}/v1/download/${task}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!dlRes.ok) throw new Error(`iLoveIMG download failed: ${dlRes.status}`);
        const compressed = new Uint8Array(await dlRes.arrayBuffer());
        console.log(`iLoveIMG compressed in ${Date.now() - compressStart}ms: ${imageBuffer.byteLength} -> ${compressed.byteLength} bytes`);
        if (compressed.byteLength > 0 && compressed.byteLength < imageBuffer.byteLength) {
          imageBuffer = compressed;
        }
      } catch (compressErr) {
        console.warn("iLoveIMG compression failed, falling back to local re-encode:", compressErr);
      }
    }

    // Fallback: local JPEG re-encode/downscale if still over limit
    if (imageBuffer.byteLength > MAX_BYTES) {
      try {
        const decoded = await decode(imageBuffer);
        if (decoded instanceof Image) {
          const qualities = [80, 70, 60, 50, 40, 30, 20];
          for (const q of qualities) {
            const encoded = await decoded.encodeJPEG(q);
            console.log(`Re-encoded JPEG quality=${q} -> ${encoded.byteLength} bytes`);
            imageBuffer = encoded;
            if (encoded.byteLength <= MAX_BYTES) break;
          }
          let scaled = decoded;
          while (imageBuffer.byteLength > MAX_BYTES && scaled.width > 480) {
            scaled = scaled.resize(Math.floor(scaled.width * 0.8), Math.floor(scaled.height * 0.8));
            imageBuffer = await scaled.encodeJPEG(60);
            console.log(`Downscaled to ${scaled.width}x${scaled.height} -> ${imageBuffer.byteLength} bytes`);
          }
        }
      } catch (compressErr) {
        console.warn("Fallback compression failed, uploading as-is:", compressErr);
      }
    }
    console.log(`Final screenshot size: ${imageBuffer.byteLength} bytes`);
    const safeCompanyName = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const storagePath = `screenshots/${Date.now()}-${safeCompanyName}.jpg`;

    const { error: uploadErr } = await supabase.storage
      .from("sites")
      .upload(storagePath, imageBuffer, { contentType: "image/jpeg", upsert: true });
    if (uploadErr) throw uploadErr;

    const screenshotUrl = `${supabaseUrl}/storage/v1/object/public/sites/${storagePath}`;
    console.log(`Screenshot complete in ${Date.now() - startTime}ms: ${screenshotUrl}`);

    return new Response(
      JSON.stringify({ success: true, screenshotUrl, fileSizeBytes: imageBuffer.byteLength, colors: { navbarBg: navbarBgColor, primary: primaryColor, secondary: secondaryColor } }),
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
    const res = await fetch(url, {
      headers: {
        "Cache-Control": "no-cache",
      },
    });
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
  locationName?: string;
  skipLogoProcessing?: boolean;
  logoAlreadyTransparent?: boolean;
}): string {
  const { companyName, phoneNumber, rawPhone, logoUrl, navbarBgColor, primaryColor, secondaryColor, locationName, skipLogoProcessing, logoAlreadyTransparent } = params;
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
    var locationName = '${esc(locationName || "")}';
    var skipLogoProcessing = ${skipLogoProcessing ? "true" : "false"};
    var logoAlreadyTransparent = ${logoAlreadyTransparent ? "true" : "false"};

    // ─── Replace logo images ───
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
            // Input PNG already has true alpha (AI removed bg). Just compute bbox of opaque pixels.
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

          // Crop to bounding box
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

          // Build outer-only silhouette via flood-fill from edges
          var silCanvas = document.createElement('canvas');
          var outlineWidth = Math.max(3, Math.round(Math.min(cropW, cropH) * 0.018));
          // Merge radius: dilate shapes inward-merge so nearby disconnected pieces become one silhouette
          var mergeRadius = Math.max(6, Math.round(Math.min(cropW, cropH) * 0.035));
          var margin = outlineWidth + mergeRadius + 2;
          silCanvas.width = cropW + margin * 2;
          silCanvas.height = cropH + margin * 2;
          var silCtx = silCanvas.getContext('2d');
          if (!silCtx) return callback(cleanCanvas.toDataURL('image/png'));

          // Step 1: build a merged silhouette canvas by stamping the logo offset in all directions
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

          // Step 2: flood-fill exterior of the MERGED silhouette to get one continuous outer shape
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

          // Make the merged silhouette fully opaque (interior + dilated areas), exterior fully transparent
          for (var sp = 0; sp < sd.length; sp += 4) {
            if (sd[sp + 3] === 1) {
              sd[sp + 3] = 0; // exterior
            } else {
              sd[sp] = 0; sd[sp + 1] = 0; sd[sp + 2] = 0; sd[sp + 3] = 255;
            }
          }
          silCtx.putImageData(silData, 0, 0);

          // Create final output with baked white outline
          var outCanvas = document.createElement('canvas');
          outCanvas.width = silCanvas.width;
          outCanvas.height = silCanvas.height;
          var outCtx = outCanvas.getContext('2d');
          if (!outCtx) return callback(cleanCanvas.toDataURL('image/png'));

          // Draw the filled silhouette offset in all directions (dilation) in white
          outCtx.globalCompositeOperation = 'source-over';
          for (var dx = -outlineWidth; dx <= outlineWidth; dx++) {
            for (var dy = -outlineWidth; dy <= outlineWidth; dy++) {
              if (dx * dx + dy * dy > (outlineWidth + 0.5) * (outlineWidth + 0.5)) continue;
              outCtx.drawImage(silCanvas, dx, dy);
            }
          }
          // Color the silhouette white
          outCtx.globalCompositeOperation = 'source-in';
          outCtx.fillStyle = 'white';
          outCtx.fillRect(0, 0, outCanvas.width, outCanvas.height);

          // Draw original cleaned logo on top
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
      img.style.cssText += '; width: auto !important; min-width: 0 !important; max-width: min(400px, 40vw) !important; height: auto !important; max-height: 245px !important; object-fit: contain !important; image-rendering: auto !important; mix-blend-mode: normal !important; display: block !important;';
      img.removeAttribute('width');
      img.removeAttribute('height');
      var parent = img.parentElement;
      if (parent) {
        parent.style.cssText += '; overflow: visible !important; max-height: 170px !important; min-height: 0 !important; height: auto !important; display: flex !important; align-items: center !important; flex-shrink: 0 !important;';
      }
    }

    function replaceLogo(img) {
      buildOutlinedLogoUrl(function(cleanedLogoUrl) {
        img.src = cleanedLogoUrl;
        applyLogoStyles(img);
      });
    }

    var cleanedLogoUrlCache = null;
    function appendNewLogo(el) {
      var img = document.createElement('img');
      img.src = cleanedLogoUrlCache || logoUrl;
      img.style.cssText = 'width: auto !important; min-width: 0 !important; max-width: min(400px, 40vw) !important; height: auto !important; max-height: 245px !important; object-fit: contain !important; image-rendering: auto !important; display: block !important;';
      el.textContent = '';
      el.appendChild(img);
    }

    buildOutlinedLogoUrl(function(cleanedLogoUrl) {
      cleanedLogoUrlCache = cleanedLogoUrl;

      // Broad selectors for nav/header areas (covers GHL, generic sites, etc.)
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
      
      // Also replace images that look like logos by src/alt/class
      document.querySelectorAll('img').forEach(function(img) {
        var src = (img.src || '').toLowerCase();
        var alt = (img.alt || '').toLowerCase();
        var cls = (img.className || '').toLowerCase();
        if (src.indexOf('logo') !== -1 || alt.indexOf('logo') !== -1 || cls.indexOf('logo') !== -1) {
          img.src = cleanedLogoUrl;
          applyLogoStyles(img);
        }
      });

      // Replace text-based logo placeholders
      document.querySelectorAll('[class*="logo"], #logo, [class*="brand"]').forEach(function(el) {
        if (!el.querySelector('img') && el.textContent.trim().length < 30) {
          appendNewLogo(el);
        }
      });
    });

    // ─── Replace phone numbers everywhere ───
    var phoneRegex = /(?:\\+?1[-. ]?)?\\(?\\d{3}\\)?[-. ]?\\d{3}[-. ]?\\d{4}/g;
    
    // Replace in text nodes
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

    // Replace tel: links
    var telLinks = document.querySelectorAll('a[href^="tel:"]');
    telLinks.forEach(function(link) {
      link.href = 'tel:' + rawPhone;
      if (link.textContent && /\\d{3}/.test(link.textContent)) {
        link.textContent = phoneNumber;
      }
    });

    // ─── Replace company name in placeholders and hero text ───
    // Extract original site name from multiple sources
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
    // Also scan for bold/strong text in consent/legal areas that might be the business name
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
        // Replace all detected original names
        originalNames.forEach(function(name) {
          var escaped = name.replace(/[-\\/\\\\^$*+?.()|{}]/g, '\\\\$&');
          node.textContent = node.textContent.replace(new RegExp(escaped, 'gi'), companyName);
        });
        // Replace location placeholders with the area-code-derived city
        if (locationName) {
          node.textContent = node.textContent
            .replace(/\\{\\{\\s*(city|location|area|service_area|town|county)\\s*\\}\\}/gi, locationName)
            .replace(/\\bYour\\s+(City|Area|Town|Location|Region|County|Neighborhood)\\b/gi, locationName)
            .replace(/\\b(the\\s+)?(local\\s+)?(your\\s+)?service\\s+area\\b/gi, locationName)
            .replace(/\\[(city|location|area)\\]/gi, locationName);
        }
      }
    });

    // ─── Force-update #hero-paragraph (and similar) with derived location ───
    if (locationName) {
      var heroParaSelectors = [
        '#hero-paragraph', '.hero-paragraph', '[class*="hero-paragraph"]', '[class*="hero_paragraph"]',
        '#hero-subheading', '#hero-subtitle', '#hero-description', '#hero-text',
        '[class*="hero-subheading"]', '[class*="hero-subtitle"]', '[class*="hero-description"]'
      ];
      var heroParas = document.querySelectorAll(heroParaSelectors.join(','));
      heroParas.forEach(function(el) {
        var walker3 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        var nodes3 = [];
        while (walker3.nextNode()) nodes3.push(walker3.currentNode);
        nodes3.forEach(function(tn) {
          var p = tn.parentElement;
          if (p && ['SCRIPT','STYLE','NOSCRIPT'].indexOf(p.tagName) !== -1) return;
          if (!tn.textContent) return;
          var t = tn.textContent;
          // 1) Placeholder tokens
          t = t.replace(/\\{\\{\\s*(city|location|area|service_area|town|county|region)\\s*\\}\\}/gi, locationName)
               .replace(/\\[(city|location|area|town|region|county)\\]/gi, locationName)
               .replace(/\\bYour\\s+(City|Area|Town|Location|Region|County|Neighborhood)\\b/gi, locationName);
          // 2) Existing "City, ST" pattern -> replace with new location
          t = t.replace(/\\b[A-Z][a-zA-Z\\.\\s]{1,30},\\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\\b/g, locationName);
          tn.textContent = t;
        });
      });
    }

    // ─── Compute contrast color ───
    function contrastColor(hex) {
      var c = hex.replace('#', '');
      if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
      var r = parseInt(c.substr(0,2),16)/255;
      var g = parseInt(c.substr(2,2),16)/255;
      var b = parseInt(c.substr(4,2),16)/255;
      var lum = 0.2126*r + 0.7152*g + 0.0722*b;
      return lum > 0.4 ? '#1a1a1a' : '#ffffff';
    }

    // Color scheme:
    // navbarBgColor = logo background color -> navbar bg
    // primaryColor = main brand color -> navbar text, hero colored text, quote form bg
    // secondaryColor = accent color -> quote form border, CTA buttons

    var navTextColor = primaryColor;
    var btnTextColor = contrastColor(primaryColor);

    // ─── Apply primary color to phone button, "Get Free Quote" button, and hero-highlighted text ───
    // Phone number buttons/links in the navbar
    document.querySelectorAll('a[href^="tel:"], [class*="phone"] a, [class*="call"] a, [class*="phone"] button, [class*="call"] button').forEach(function(el) {
      el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: ' + btnTextColor + ' !important; border-color: ' + primaryColor + ' !important;';
    });

    // "Get Free Quote" or similar CTA buttons
    document.querySelectorAll('a, button').forEach(function(el) {
      var text = (el.textContent || '').trim().toLowerCase();
      if (text.indexOf('free quote') !== -1 || text.indexOf('get quote') !== -1 || text.indexOf('get a quote') !== -1 || text.indexOf('request quote') !== -1) {
        el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: ' + btnTextColor + ' !important; border-color: ' + primaryColor + ' !important;';
      }
    });

    // Hero highlighted text — broad matching (apply background color, keep text white)
    document.querySelectorAll('[class*="highlight"], span[style*="color"], em, .accent-text').forEach(function(el) {
      if (el.id === 'hero-highlighted' || (el.className || '').toString().toLowerCase().indexOf('hero-highlighted') !== -1 || (el.className || '').toString().toLowerCase().indexOf('hero_highlighted') !== -1) return;
      var parent = el.closest('section, [class*="hero"], [class*="banner"], header, [class*="fold"], [class*="jumbotron"]');
      var cls = (el.className || '').toLowerCase();
      var id = (el.id || '').toLowerCase();
      if (parent || cls.indexOf('hero') !== -1 || cls.indexOf('highlight') !== -1 || id.indexOf('hero') !== -1) {
        el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: #ffffff !important;';
      }
    });
    // Hero quote form border
    document.querySelectorAll('#quote-form-element').forEach(function(quoteForm) {
      quoteForm.style.cssText += '; border: 2px solid ' + primaryColor + ' !important; border-color: ' + primaryColor + ' !important;';
    });
    document.querySelectorAll('#hero-highlighted, .hero-highlighted, [class*="hero-highlighted"], [class*="hero_highlighted"]').forEach(function(el) {
      el.style.cssText += '; background-color: ' + primaryColor + ' !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important;';
    });
    document.querySelectorAll('#hero-stars-main, #hero-stars-google, #hero-stars-facebook').forEach(function(stars) {
      stars.style.cssText += '; color: ' + primaryColor + ' !important; -webkit-text-fill-color: ' + primaryColor + ' !important;';
      stars.querySelectorAll('*').forEach(function(child) {
        child.style.cssText += '; color: ' + primaryColor + ' !important; fill: ' + primaryColor + ' !important; stroke: none !important; -webkit-text-fill-color: ' + primaryColor + ' !important;';
      });
    });
    // Also inject a CSS rule for hero-highlighted, star IDs, and quote form IDs as a catch-all
    var styleEl = document.createElement('style');
    styleEl.textContent = '.hero-highlighted, [class*="hero-highlighted"], [class*="hero_highlighted"], #hero-highlighted { background-color: ' + primaryColor + ' !important; color: #ffffff !important; -webkit-text-fill-color: #ffffff !important; font-family: inherit !important; font-size: inherit !important; font-weight: inherit !important; font-style: inherit !important; } #quote-form-element { border: 2px solid ' + primaryColor + ' !important; border-color: ' + primaryColor + ' !important; } #hero-quote-form { border: 0 !important; } #hero-stars-main, #hero-stars-main *, #hero-stars-google, #hero-stars-google *, #hero-stars-facebook, #hero-stars-facebook * { color: ' + primaryColor + ' !important; fill: ' + primaryColor + ' !important; stroke: none !important; -webkit-text-fill-color: ' + primaryColor + ' !important; } header img, nav img, [class*="logo"] img, img[class*="logo"], img[alt*="logo" i], img[src*="logo" i] { width: auto !important; min-width: 0 !important; max-width: min(400px, 40vw) !important; height: auto !important; max-height: 245px !important; object-fit: contain !important; display: block !important; }';
    document.head.appendChild(styleEl);

    // ─── Make sure the bottom-right chat widget is present in screenshots ───
    function findChatWidgets() {
      var selectors = [
        'iframe[src*="leadconnector"]', 'iframe[src*="leadconnectorhq"]', 'iframe[src*="chat-widget"]',
        '[id*="leadconnector" i]', '[class*="leadconnector" i]', '[id*="chat-widget" i]', '[class*="chat-widget" i]',
        '[id*="lc-widget" i]', '[class*="lc-widget" i]', 'iframe[title*="chat" i]'
      ];
      try {
        return Array.prototype.slice.call(document.querySelectorAll(selectors.join(','))).filter(function(el) {
          if (el.id === 'junie-chat-widget-fallback' || el.closest('#junie-chat-widget-fallback')) return false;
          var rect = el.getBoundingClientRect();
          var marker = ((el.id || '') + ' ' + (el.className || '') + ' ' + (el.getAttribute('src') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
          return marker.indexOf('leadconnector') !== -1 || marker.indexOf('chat') !== -1 || rect.width > 36 || rect.height > 36;
        });
      } catch (e) {
        return [];
      }
    }

    function forceChatWidgetsVisible() {
      var widgets = findChatWidgets();
      if (widgets.length) {
        var fallback = document.getElementById('junie-chat-widget-fallback');
        if (fallback) fallback.remove();
        widgets.forEach(function(el) {
          el.style.cssText += '; visibility: visible !important; opacity: 1 !important; display: block !important; z-index: 2147483647 !important;';
        });
        return true;
      }
      return false;
    }

    function createChatFallback() {
      if (document.getElementById('junie-chat-widget-fallback') || forceChatWidgetsVisible()) return;
      var bubble = document.createElement('div');
      bubble.id = 'junie-chat-widget-fallback';
      bubble.setAttribute('aria-hidden', 'true');
      bubble.style.cssText = 'position: fixed !important; right: 24px !important; bottom: 24px !important; width: 64px !important; height: 64px !important; border-radius: 999px !important; background: ' + primaryColor + ' !important; box-shadow: 0 18px 45px rgba(0,0,0,.28) !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; opacity: 1 !important; visibility: visible !important; pointer-events: none !important;';
      bubble.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.25 18.25C3.94 16.88 3.2 15.12 3.2 13.2C3.2 8.9 7.14 5.4 12 5.4C16.86 5.4 20.8 8.9 20.8 13.2C20.8 17.5 16.86 21 12 21C10.88 21 9.82 20.82 8.84 20.48L4.85 21.65L5.25 18.25Z" fill="white"/><circle cx="8.5" cy="13.1" r="1.15" fill="' + primaryColor + '"/><circle cx="12" cy="13.1" r="1.15" fill="' + primaryColor + '"/><circle cx="15.5" cy="13.1" r="1.15" fill="' + primaryColor + '"/></svg>';
      document.body.appendChild(bubble);
    }

    var chatChecks = 0;
    var chatTimer = setInterval(function() {
      chatChecks += 1;
      if (forceChatWidgetsVisible() || chatChecks >= 8) clearInterval(chatTimer);
    }, 1000);
    setTimeout(createChatFallback, 6500);

    console.log('Personalization injected successfully');
  } catch(err) {
    console.error('Personalization error:', err);
  }
})();
`;
}

// NANP area code -> primary city/region. Covers US + Canada area codes.
// Source: standard NANPA assignments (most populous coverage area per code).
function lookupAreaCodeLocation(areaCode: string): string {
  if (!areaCode || areaCode.length !== 3) return "";
  const map: Record<string, string> = {
    // Alabama
    "205": "Birmingham, AL", "251": "Mobile, AL", "256": "Huntsville, AL", "334": "Montgomery, AL", "938": "Huntsville, AL", "659": "Birmingham, AL",
    // Alaska
    "907": "Anchorage, AK",
    // Arizona
    "480": "Mesa, AZ", "520": "Tucson, AZ", "602": "Phoenix, AZ", "623": "Phoenix, AZ", "928": "Flagstaff, AZ",
    // Arkansas
    "327": "Little Rock, AR", "479": "Fort Smith, AR", "501": "Little Rock, AR", "870": "Jonesboro, AR",
    // California
    "209": "Stockton, CA", "213": "Los Angeles, CA", "279": "Sacramento, CA", "310": "Los Angeles, CA", "323": "Los Angeles, CA",
    "341": "Oakland, CA", "350": "Concord, CA", "369": "Santa Rosa, CA", "408": "San Jose, CA", "415": "San Francisco, CA",
    "424": "Los Angeles, CA", "442": "Palm Springs, CA", "510": "Oakland, CA", "530": "Redding, CA", "559": "Fresno, CA",
    "562": "Long Beach, CA", "619": "San Diego, CA", "626": "Pasadena, CA", "628": "San Francisco, CA", "650": "San Mateo, CA",
    "657": "Anaheim, CA", "661": "Bakersfield, CA", "669": "San Jose, CA", "707": "Santa Rosa, CA", "714": "Anaheim, CA",
    "747": "Burbank, CA", "760": "Oceanside, CA", "805": "Oxnard, CA", "818": "Burbank, CA", "820": "Oxnard, CA",
    "831": "Salinas, CA", "840": "San Bernardino, CA", "858": "San Diego, CA", "909": "San Bernardino, CA", "916": "Sacramento, CA",
    "925": "Concord, CA", "949": "Irvine, CA", "951": "Riverside, CA",
    // Colorado
    "303": "Denver, CO", "719": "Colorado Springs, CO", "720": "Denver, CO", "970": "Fort Collins, CO", "983": "Colorado Springs, CO",
    // Connecticut
    "203": "New Haven, CT", "475": "New Haven, CT", "860": "Hartford, CT", "959": "Hartford, CT",
    // Delaware
    "302": "Wilmington, DE",
    // Washington DC
    "202": "Washington, DC", "771": "Washington, DC",
    // Florida
    "239": "Cape Coral, FL", "305": "Miami, FL", "321": "Orlando, FL", "352": "Gainesville, FL", "386": "Daytona Beach, FL",
    "407": "Orlando, FL", "448": "Tallahassee, FL", "561": "West Palm Beach, FL", "656": "Tampa, FL", "689": "Orlando, FL",
    "727": "St. Petersburg, FL", "754": "Fort Lauderdale, FL", "772": "Port St. Lucie, FL", "786": "Miami, FL", "813": "Tampa, FL",
    "850": "Tallahassee, FL", "863": "Lakeland, FL", "904": "Jacksonville, FL", "941": "Sarasota, FL", "954": "Fort Lauderdale, FL",
    "959": "Hartford, CT",
    // Georgia
    "229": "Albany, GA", "404": "Atlanta, GA", "470": "Atlanta, GA", "478": "Macon, GA", "678": "Atlanta, GA",
    "706": "Augusta, GA", "762": "Augusta, GA", "770": "Atlanta, GA", "912": "Savannah, GA", "943": "Atlanta, GA",
    // Hawaii
    "808": "Honolulu, HI",
    // Idaho
    "208": "Boise, ID", "986": "Boise, ID",
    // Illinois
    "217": "Springfield, IL", "224": "Chicago, IL", "309": "Peoria, IL", "312": "Chicago, IL", "331": "Aurora, IL",
    "447": "Springfield, IL", "464": "Chicago, IL", "618": "Belleville, IL", "630": "Aurora, IL", "708": "Chicago, IL",
    "730": "Belleville, IL", "773": "Chicago, IL", "779": "Rockford, IL", "815": "Rockford, IL", "847": "Chicago, IL",
    "872": "Chicago, IL",
    // Indiana
    "219": "Gary, IN", "260": "Fort Wayne, IN", "317": "Indianapolis, IN", "463": "Indianapolis, IN", "574": "South Bend, IN",
    "765": "Lafayette, IN", "812": "Evansville, IN", "930": "Evansville, IN",
    // Iowa
    "319": "Cedar Rapids, IA", "515": "Des Moines, IA", "563": "Davenport, IA", "641": "Mason City, IA", "712": "Sioux City, IA",
    // Kansas
    "316": "Wichita, KS", "620": "Hutchinson, KS", "785": "Topeka, KS", "913": "Kansas City, KS",
    // Kentucky
    "270": "Bowling Green, KY", "364": "Bowling Green, KY", "502": "Louisville, KY", "606": "Ashland, KY", "859": "Lexington, KY",
    // Louisiana
    "225": "Baton Rouge, LA", "318": "Shreveport, LA", "337": "Lafayette, LA", "457": "New Orleans, LA", "504": "New Orleans, LA",
    "985": "Houma, LA",
    // Maine
    "207": "Portland, ME",
    // Maryland
    "227": "Baltimore, MD", "240": "Silver Spring, MD", "301": "Silver Spring, MD", "410": "Baltimore, MD", "443": "Baltimore, MD",
    "667": "Baltimore, MD",
    // Massachusetts
    "339": "Boston, MA", "351": "Lowell, MA", "413": "Springfield, MA", "508": "Worcester, MA", "617": "Boston, MA",
    "774": "Worcester, MA", "781": "Boston, MA", "857": "Boston, MA", "978": "Lowell, MA",
    // Michigan
    "231": "Muskegon, MI", "248": "Troy, MI", "269": "Kalamazoo, MI", "313": "Detroit, MI", "517": "Lansing, MI",
    "586": "Warren, MI", "616": "Grand Rapids, MI", "734": "Ann Arbor, MI", "810": "Flint, MI", "906": "Marquette, MI",
    "947": "Troy, MI", "989": "Saginaw, MI",
    // Minnesota
    "218": "Duluth, MN", "320": "St. Cloud, MN", "507": "Rochester, MN", "612": "Minneapolis, MN", "651": "St. Paul, MN",
    "763": "Minneapolis, MN", "952": "Minneapolis, MN",
    // Mississippi
    "228": "Gulfport, MS", "601": "Jackson, MS", "662": "Tupelo, MS", "769": "Jackson, MS",
    // Missouri
    "314": "St. Louis, MO", "417": "Springfield, MO", "557": "St. Louis, MO", "573": "Columbia, MO", "636": "St. Charles, MO",
    "660": "Sedalia, MO", "816": "Kansas City, MO", "975": "Kansas City, MO",
    // Montana
    "406": "Billings, MT",
    // Nebraska
    "308": "Grand Island, NE", "402": "Omaha, NE", "531": "Omaha, NE",
    // Nevada
    "702": "Las Vegas, NV", "725": "Las Vegas, NV", "775": "Reno, NV",
    // New Hampshire
    "603": "Manchester, NH",
    // New Jersey
    "201": "Jersey City, NJ", "551": "Jersey City, NJ", "609": "Trenton, NJ", "640": "Atlantic City, NJ", "732": "Toms River, NJ",
    "848": "Toms River, NJ", "856": "Camden, NJ", "862": "Newark, NJ", "908": "Elizabeth, NJ", "973": "Newark, NJ",
    // New Mexico
    "505": "Albuquerque, NM", "575": "Las Cruces, NM",
    // New York
    "212": "New York, NY", "315": "Syracuse, NY", "329": "Albany, NY", "332": "New York, NY", "347": "New York, NY",
    "363": "Long Island, NY", "516": "Hempstead, NY", "518": "Albany, NY", "585": "Rochester, NY", "607": "Binghamton, NY",
    "631": "Long Island, NY", "646": "New York, NY", "680": "Syracuse, NY", "716": "Buffalo, NY", "718": "New York, NY",
    "838": "Albany, NY", "845": "Poughkeepsie, NY", "914": "Yonkers, NY", "917": "New York, NY", "929": "New York, NY",
    "934": "Long Island, NY",
    // North Carolina
    "252": "Greenville, NC", "336": "Greensboro, NC", "472": "Greensboro, NC", "704": "Charlotte, NC", "743": "Greensboro, NC",
    "828": "Asheville, NC", "910": "Fayetteville, NC", "919": "Raleigh, NC", "980": "Charlotte, NC", "984": "Raleigh, NC",
    // North Dakota
    "701": "Fargo, ND",
    // Ohio
    "216": "Cleveland, OH", "220": "Newark, OH", "234": "Akron, OH", "283": "Cincinnati, OH", "326": "Dayton, OH",
    "330": "Akron, OH", "380": "Columbus, OH", "419": "Toledo, OH", "436": "Cleveland, OH", "440": "Cleveland, OH",
    "513": "Cincinnati, OH", "567": "Toledo, OH", "614": "Columbus, OH", "740": "Newark, OH", "937": "Dayton, OH",
    // Oklahoma
    "405": "Oklahoma City, OK", "539": "Tulsa, OK", "572": "Oklahoma City, OK", "580": "Lawton, OK", "918": "Tulsa, OK",
    // Oregon
    "458": "Eugene, OR", "503": "Portland, OR", "541": "Eugene, OR", "971": "Portland, OR",
    // Pennsylvania
    "215": "Philadelphia, PA", "223": "Harrisburg, PA", "267": "Philadelphia, PA", "272": "Scranton, PA", "412": "Pittsburgh, PA",
    "445": "Philadelphia, PA", "484": "Allentown, PA", "570": "Scranton, PA", "582": "Erie, PA", "610": "Allentown, PA",
    "717": "Harrisburg, PA", "724": "New Castle, PA", "814": "Erie, PA", "835": "Allentown, PA", "878": "Pittsburgh, PA",
    // Rhode Island
    "401": "Providence, RI",
    // South Carolina
    "803": "Columbia, SC", "821": "Columbia, SC", "839": "Columbia, SC", "843": "Charleston, SC", "854": "Charleston, SC",
    "864": "Greenville, SC",
    // South Dakota
    "605": "Sioux Falls, SD",
    // Tennessee
    "423": "Chattanooga, TN", "615": "Nashville, TN", "629": "Nashville, TN", "731": "Jackson, TN", "865": "Knoxville, TN",
    "901": "Memphis, TN", "931": "Clarksville, TN",
    // Texas
    "210": "San Antonio, TX", "214": "Dallas, TX", "254": "Killeen, TX", "281": "Houston, TX", "325": "Abilene, TX",
    "346": "Houston, TX", "361": "Corpus Christi, TX", "409": "Beaumont, TX", "430": "Tyler, TX", "432": "Midland, TX",
    "469": "Dallas, TX", "512": "Austin, TX", "682": "Fort Worth, TX", "713": "Houston, TX", "726": "San Antonio, TX",
    "737": "Austin, TX", "806": "Lubbock, TX", "817": "Fort Worth, TX", "830": "New Braunfels, TX", "832": "Houston, TX",
    "903": "Tyler, TX", "915": "El Paso, TX", "936": "Conroe, TX", "940": "Denton, TX", "945": "Dallas, TX",
    "956": "Laredo, TX", "972": "Dallas, TX", "979": "College Station, TX",
    // Utah
    "385": "Salt Lake City, UT", "435": "St. George, UT", "801": "Salt Lake City, UT",
    // Vermont
    "802": "Burlington, VT",
    // Virginia
    "276": "Bristol, VA", "434": "Lynchburg, VA", "540": "Roanoke, VA", "571": "Arlington, VA", "578": "Richmond, VA",
    "703": "Arlington, VA", "757": "Virginia Beach, VA", "804": "Richmond, VA", "826": "Roanoke, VA", "948": "Lynchburg, VA",
    // Washington
    "206": "Seattle, WA", "253": "Tacoma, WA", "360": "Vancouver, WA", "425": "Bellevue, WA", "509": "Spokane, WA",
    "564": "Vancouver, WA",
    // West Virginia
    "304": "Charleston, WV", "681": "Charleston, WV",
    // Wisconsin
    "262": "Kenosha, WI", "274": "Green Bay, WI", "353": "Milwaukee, WI", "414": "Milwaukee, WI", "534": "Eau Claire, WI",
    "608": "Madison, WI", "715": "Eau Claire, WI", "920": "Green Bay, WI",
    // Wyoming
    "307": "Cheyenne, WY",
    // Canada (major)
    "204": "Winnipeg, MB", "226": "London, ON", "236": "Vancouver, BC", "249": "Sudbury, ON", "250": "Victoria, BC",
    "289": "Hamilton, ON", "306": "Saskatoon, SK", "343": "Ottawa, ON", "354": "Quebec City, QC", "365": "Hamilton, ON",
    "367": "Quebec City, QC", "368": "Calgary, AB", "382": "London, ON", "387": "Sudbury, ON", "403": "Calgary, AB",
    "416": "Toronto, ON", "418": "Quebec City, QC", "428": "Moncton, NB", "431": "Winnipeg, MB", "437": "Toronto, ON",
    "438": "Montreal, QC", "450": "Montreal, QC", "468": "Quebec City, QC", "474": "Saskatoon, SK", "506": "Saint John, NB",
    "514": "Montreal, QC", "519": "London, ON", "548": "London, ON", "579": "Montreal, QC", "581": "Quebec City, QC",
    "584": "Winnipeg, MB", "587": "Calgary, AB", "604": "Vancouver, BC", "613": "Ottawa, ON", "639": "Saskatoon, SK",
    "647": "Toronto, ON", "672": "Vancouver, BC", "683": "Sudbury, ON", "705": "Sudbury, ON", "709": "St. John's, NL",
    "742": "London, ON", "753": "Ottawa, ON", "778": "Vancouver, BC", "780": "Edmonton, AB", "782": "Halifax, NS",
    "807": "Thunder Bay, ON", "819": "Sherbrooke, QC", "825": "Calgary, AB", "867": "Yellowknife, NT", "873": "Sherbrooke, QC",
    "879": "St. John's, NL", "902": "Halifax, NS", "905": "Hamilton, ON", "942": "Toronto, ON",
  };
  return map[areaCode] || "";
}
