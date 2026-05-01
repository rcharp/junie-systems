import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Flexible field names
    const companyName = body.company_name || body.companyName || "";
    const phoneNumber = body.phone || body.phone_number || body.phoneNumber || "";
    const industry = body.industry || "general";
    const logoUrl = body.logo_url || body.logoUrl || body.logo || "";

    if (!companyName || !logoUrl) {
      return new Response(JSON.stringify({ error: "company_name and logo_url are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Screenshot webhook received: ${companyName}, phone=${phoneNumber}, industry=${industry}`);

    // Call generate-screenshot internally
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const genRes = await fetch(`${supabaseUrl}/functions/v1/generate-screenshot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ companyName, phoneNumber, industry, logoUrl }),
    });

    const genData = await genRes.json();

    if (!genRes.ok) {
      console.error("generate-screenshot failed:", genData);
      return new Response(JSON.stringify({ error: genData.error || "Screenshot generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Screenshot generated: ${genData.screenshotUrl}`);

    // Save to database
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("pipeline_companies").insert({
        run_id: null,
        name: companyName,
        url: logoUrl,
        industry: industry,
        phone_number: phoneNumber,
        logo_url: logoUrl,
        screen_url: genData.screenshotUrl,
        status: "screenshot-done",
        primary_color: genData.colors?.primary || null,
        secondary_color: genData.colors?.secondary || null,
      });
    } catch (dbErr) {
      console.error("DB insert failed:", dbErr);
    }

    // Forward to LeadConnector webhook
    try {
      await fetch(
        "https://services.leadconnectorhq.com/hooks/yvDlEJb1YBBk2JhD3map/webhook-trigger/b6a8d6ab-07d5-4996-8b97-62daa061293e",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName,
            phoneNumber,
            screenshotUrl: genData.screenshotUrl,
          }),
        }
      );
      console.log("LeadConnector webhook sent successfully");
    } catch (webhookErr) {
      console.error("LeadConnector webhook failed:", webhookErr);
    }

    return new Response(JSON.stringify({
      success: true,
      screenshotUrl: genData.screenshotUrl,
      companyName,
      phoneNumber,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("screenshot-webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
