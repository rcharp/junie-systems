// Upload onboarding photos to Google Drive under "Junie Clients" -> {companyName}
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_drive";

async function gw(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!GOOGLE_DRIVE_API_KEY) throw new Error("GOOGLE_DRIVE_API_KEY is not configured");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${LOVABLE_API_KEY}`);
  headers.set("X-Connection-Api-Key", GOOGLE_DRIVE_API_KEY);
  return fetch(`${GATEWAY_BASE}${path}`, { ...init, headers });
}

async function findFolder(name: string, parentId: string | null): Promise<string | null> {
  const safeName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const q = `mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false${parentClause}`;
  const url = `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
  const res = await gw(url);
  if (!res.ok) throw new Error(`Drive search failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId: string | null): Promise<string> {
  const body: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) body.parents = [parentId];
  const res = await gw(`/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Folder create failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

async function ensureFolder(name: string, parentId: string | null): Promise<string> {
  return (await findFolder(name, parentId)) ?? (await createFolder(name, parentId));
}

async function uploadFile(folderId: string, file: File): Promise<{ id: string; name: string }> {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };
  const boundary = "lovable_boundary_" + crypto.randomUUID();
  const enc = new TextEncoder();
  const arrayBuf = new Uint8Array(await file.arrayBuffer());
  const head = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) +
      `\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
  );
  const tail = enc.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + arrayBuf.length + tail.length);
  body.set(head, 0);
  body.set(arrayBuf, head.length);
  body.set(tail, head.length + arrayBuf.length);

  const res = await gw(`/upload/drive/v3/files?uploadType=multipart&fields=id,name`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Upload failed [${res.status}]: ${await res.text()}`);
  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await req.formData();
    const companyName = String(formData.get("companyName") ?? "").trim();
    if (!companyName) {
      return new Response(JSON.stringify({ error: "companyName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return new Response(JSON.stringify({ error: "No files provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file size (<= 25MB each) and type (images only)
    for (const f of files) {
      if (f.size > 25 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: `File too large: ${f.name} (max 25MB)` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!f.type.startsWith("image/")) {
        return new Response(
          JSON.stringify({ error: `Only image files are allowed: ${f.name}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const parent = await ensureFolder("Junie Clients", null);
    const clientFolder = await ensureFolder(companyName, parent);

    const uploaded: { id: string; name: string }[] = [];
    for (const f of files) {
      uploaded.push(await uploadFile(clientFolder, f));
    }

    return new Response(
      JSON.stringify({ success: true, folderId: clientFolder, uploaded }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("upload-onboarding-photos error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
