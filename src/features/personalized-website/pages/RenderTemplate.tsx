import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  supabase,
  JUNIE_SUPABASE_URL,
} from "@/integrations/junie-pipeline/client";

const SMALL_WORDS = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "in", "of", "up", "as", "is", "it", "so", "no", "do", "if"]);
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (word, index) => {
    if (index > 0 && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return phone;
}

function generateIndustryContent(industry: string, companyName: string, contentMap: Record<string, any>) {
  const ind = industry.toLowerCase();
  for (const [key, val] of Object.entries(contentMap)) {
    if (ind.includes(key.toLowerCase()) || key.toLowerCase().includes(ind)) {
      return {
        heroH1: (val.header || `Professional ${industry} Services`).replace(/\{\{company_name\}\}/gi, companyName),
        heroParagraph: val.hero_text ? val.hero_text.replace(/\{\{company_name\}\}/gi, companyName) : `${companyName} provides professional ${industry.toLowerCase()} services.`,
        services: val.services || {},
        faq: val.faq || [],
      };
    }
  }
  return null;
}

export default function RenderTemplate() {
  const { templateId } = useParams<{ templateId: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (templateId) loadAndPersonalize(templateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  async function loadAndPersonalize(companyId: string) {
    try {
      const { data: company, error: companyErr } = await supabase
        .from("pipeline_companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (companyErr || !company) {
        document.open();
        document.write(`<html><body style="font-family:sans-serif;padding:40px;color:#dc2626;">Company not found: ${companyErr?.message || "unknown"}</body></html>`);
        document.close();
        setLoading(false);
        return;
      }

      const { data: settings } = await supabase.from("settings").select("*");
      const settingsMap: Record<string, string> = {};
      settings?.forEach((s: any) => { settingsMap[s.key] = s.value; });

      let industryContentMap: Record<string, any> = {};
      try { industryContentMap = JSON.parse(settingsMap["industry_content_map"] || "{}"); } catch {}

      const c: any = company;
      const companyName = toTitleCase(c.name);
      const phoneNumber = formatPhone(c.phone_number || "");
      const industry = c.industry || "";
      const industryContent = industry ? generateIndustryContent(industry, companyName, industryContentMap) : null;

      const { data: htmlBlob, error: dlErr } = await supabase.storage.from("templates").download("junie_template.html");
      if (dlErr || !htmlBlob) {
        document.open();
        document.write(`<html><body style="font-family:sans-serif;padding:40px;color:#dc2626;">Failed to download template: ${dlErr?.message || "not found"}</body></html>`);
        document.close();
        setLoading(false);
        return;
      }

      let html = await htmlBlob.text();
      html = html.replace(/\{\{company_name\}\}/gi, companyName);
      if (phoneNumber) html = html.replace(/\{\{phone_number\}\}/gi, phoneNumber);
      if (industryContent?.heroH1) html = html.replace(/\{\{header\}\}/gi, industryContent.heroH1);
      if (industryContent?.heroParagraph) html = html.replace(/\{\{hero_text\}\}/gi, industryContent.heroParagraph);
      html = html.replace(/\{\{primary_color\}\}/gi, c.primary_color || "#0f172a");
      html = html.replace(/\{\{secondary_color\}\}/gi, c.secondary_color || "#3b82f6");

      const storageBase = `${JUNIE_SUPABASE_URL}/storage/v1/object/public/templates/`;
      html = html.replace(/url\((['"]?)(?:\.\/)?junie_template_files\//gi, `url($1${storageBase}junie_template_files/`);
      html = html.replace(/(src|href)="\.\/junie_template_files\//gi, `$1="${storageBase}junie_template_files/`);

      document.open();
      document.write(html);
      document.close();
    } catch (err: any) {
      document.open();
      document.write(`<html><body style="font-family:sans-serif;padding:40px;color:#dc2626;">Error: ${err.message}</body></html>`);
      document.close();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh" }}>
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", zIndex: 10 }}>
          <p style={{ color: "#666", fontSize: "14px" }}>Loading personalized site...</p>
        </div>
      )}
    </div>
  );
}
