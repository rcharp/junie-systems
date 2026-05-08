import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
import { Camera, Loader2, Upload, Link as LinkIcon, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INDUSTRIES = [
  "Junk Removal",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Electrical",
  "Cleaning",
  "Landscaping",
  "Pest Control",
  "Garage Door",
  "Pool & Spa",
  "Handyman",
  "Painting",
  "Tree Service",
  "Moving",
  "Auto Repair",
  "General",
];

export default function NewScreenshot() {
  const [companyName, setCompanyName] = useState("Junie Systems");
  const [industry, setIndustry] = useState("junk removal");
  const [phoneNumber, setPhoneNumber] = useState("9412584006");
  const [logoMode, setLogoMode] = useState<"upload" | "url" | "generate">("upload");
  const [logoUrl, setLogoUrl] = useState(
    "https://lh4.googleusercontent.com/-T1_Aj0WdznY/AAAAAAAAAAI/AAAAAAAAAAA/BHMk-fF3vn8/s44-p-k-no-ns-nd/photo.jpg",
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [generatedLogoUrl, setGeneratedLogoUrl] = useState<string | null>(null);
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [transparentLogoBg, setTransparentLogoBg] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [fileSizeBytes, setFileSizeBytes] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleGenerateLogo = async () => {
    const name = companyName.trim();
    if (!name) {
      toast({ title: "Company name required", description: "Enter a company name first.", variant: "destructive" });
      return;
    }
    setGeneratingLogo(true);
    setGeneratedLogoUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-logo", {
        body: { companyName: name },
      });
      if (error) throw error;
      if (!data?.logoUrl) throw new Error("No logo returned");
      setGeneratedLogoUrl(data.logoUrl);
      toast({ title: "Logo generated!", description: "Your AI logo is ready." });
    } catch (err: any) {
      toast({ title: "Logo generation failed", description: err.message || "Try again", variant: "destructive" });
    } finally {
      setGeneratingLogo(false);
    }
  };

  const generateScreenshot = async () => {
    const name = companyName.trim();
    if (!name || !phoneNumber.trim()) return;

    let finalLogoUrl = "";
    if (logoMode === "upload") {
      if (!logoFile) {
        toast({ title: "Logo required", description: "Please upload a logo", variant: "destructive" });
        return;
      }
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `logos/screenshot-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("sites")
        .upload(path, logoFile, { contentType: logoFile.type, upsert: true });
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      finalLogoUrl = `${SUPABASE_URL}/storage/v1/object/public/sites/${path}`;
    } else if (logoMode === "url") {
      finalLogoUrl = logoUrl.trim();
    } else if (logoMode === "generate") {
      finalLogoUrl = generatedLogoUrl || "";
    }

    if (!finalLogoUrl) {
      toast({ title: "Logo required", description: "Please provide or generate a logo", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setScreenshotUrl(null);
    setFileSizeBytes(null);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-screenshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          companyName: name,
          phoneNumber: phoneNumber.trim(),
          industry: industry.trim() || "general",
          logoUrl: finalLogoUrl,
          transparentLogoBg,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Screenshot generation failed");

      setScreenshotUrl(data.screenshotUrl);
      setFileSizeBytes(typeof data.fileSizeBytes === "number" ? data.fileSizeBytes : null);

      // Persist a record so the dashboard can list this screenshot
      try {
        const { error: insErr } = await supabase.from("pipeline_companies").insert({
          run_id: "00000000-0000-0000-0000-000000000000",
          name,
          url: "",
          industry: industry.trim() || "general",
          phone_number: phoneNumber.trim(),
          logo_url: finalLogoUrl,
          screen_url: data.screenshotUrl,
          screen_file_size_bytes: typeof data.fileSizeBytes === "number" ? data.fileSizeBytes : null,
          status: "screenshot-done",
        });
        if (insErr) console.error("Failed to record screenshot:", insErr);
      } catch (dbErr) {
        console.error("Failed to record screenshot:", dbErr);
      }

      toast({ title: "Screenshot generated!", description: "Your personalized site screenshot is ready." });

      try {
        await fetch(
          "https://services.leadconnectorhq.com/hooks/yvDlEJb1YBBk2JhD3map/webhook-trigger/b6a8d6ab-07d5-4996-8b97-62daa061293e",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              companyName: name,
              phoneNumber: phoneNumber.trim(),
              screenshotUrl: data.screenshotUrl,
            }),
          },
        );
      } catch (webhookErr) {
        console.error("Webhook POST failed:", webhookErr);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 pt-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Generate Screenshot</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a personalized site screenshot with your logo and branding
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 space-y-4"
      >
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Company Name
          </label>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Watermelon HVAC"
            className="bg-muted/50 border-border/50 text-base"
            autoFocus
            disabled={submitting}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Phone Number
          </label>
          <Input
            value={phoneNumber}
            onChange={(e) => {
              let val = e.target.value.replace(/[^0-9()\-\s+]/g, "");
              // Strip leading + or +1 country code
              val = val.replace(/^\+\s*1?\s*/, "").replace(/^\+/, "");
              const digitCount = (val.match(/\d/g) || []).length;
              if (digitCount <= 10) setPhoneNumber(val);
            }}
            placeholder="e.g. (555) 123-4567"
            className="bg-muted/50 border-border/50 text-base"
            disabled={submitting}
            inputMode="tel"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Industry
          </label>
          <Select value={industry} onValueChange={setIndustry} disabled={submitting}>
            <SelectTrigger className="bg-muted/50 border-border/50 text-base">
              <SelectValue placeholder="Select an industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((opt) => (
                <SelectItem key={opt} value={opt.toLowerCase()}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Logo
          </label>
          <Tabs value={logoMode} onValueChange={(v) => setLogoMode(v as "upload" | "url" | "generate")} className="mb-2">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="upload" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Upload className="w-3 h-3" /> Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LinkIcon className="w-3 h-3" /> URL
              </TabsTrigger>
              <TabsTrigger value="generate" className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Sparkles className="w-3 h-3" /> Generate
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {logoMode === "upload" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={submitting}
              />
              <Button
                variant="outline"
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo preview" className="max-h-16 max-w-full object-contain" />
                ) : (
                  <span className="text-muted-foreground text-sm">Click to upload logo image</span>
                )}
              </Button>
            </div>
          ) : logoMode === "url" ? (
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-muted/50 border-border/50 text-base"
              disabled={submitting}
            />
          ) : (
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateLogo}
                disabled={generatingLogo || submitting || !companyName.trim()}
              >
                {generatingLogo ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating logo...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> {generatedLogoUrl ? "Regenerate Logo" : "Generate Logo with AI"}</>
                )}
              </Button>
              {generatedLogoUrl && (
                <div className="flex items-center justify-center p-3 rounded-lg bg-muted/30 border border-border/50">
                  <img src={generatedLogoUrl} alt="Generated logo" className="max-h-24 max-w-full object-contain" />
                </div>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Checkbox
              id="transparent-logo-bg"
              checked={transparentLogoBg}
              onCheckedChange={(v) => setTransparentLogoBg(v === true)}
              disabled={submitting}
              className="mt-0.5"
            />
            <label htmlFor="transparent-logo-bg" className="text-xs leading-snug cursor-pointer">
              <span className="font-medium">Transparent logo background</span>
              <span className="block text-muted-foreground mt-0.5">
                Removes the white background and adds a white outline around the logo. Uncheck to use the logo as-is.
              </span>
            </label>
          </div>
        </div>

        <Button
          onClick={generateScreenshot}
          disabled={
            !companyName.trim() ||
            !phoneNumber.trim() ||
            submitting ||
            (logoMode === "upload"
              ? !logoFile
              : logoMode === "url"
                ? !logoUrl.trim()
                : !generatedLogoUrl)
          }
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
          size="lg"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
          {submitting ? "Generating..." : "Generate Screenshot"}
        </Button>
      </motion.div>

      {screenshotUrl && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 space-y-3"
        >
          {(() => {
            const kb = fileSizeBytes !== null ? Math.round(fileSizeBytes / 1024) : null;
            const ext = (screenshotUrl.split("?")[0].split(".").pop() || "jpg").toLowerCase();
            const filename = kb !== null ? `screenshot-${kb}KB.${ext}` : `screenshot.${ext}`;
            return (
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Generated Screenshot</span>
                  {kb !== null && (
                    <span className="text-xs text-muted-foreground">{kb} KB</span>
                  )}
                </div>
                <a href={screenshotUrl} download={filename} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="w-3 h-3" /> Download{kb !== null ? ` (${kb} KB)` : ""}
                  </Button>
                </a>
              </div>
            );
          })()}
          <img src={screenshotUrl} alt="Generated screenshot" className="w-full rounded-lg border border-border/50" />
        </motion.div>
      )}
    </div>
  );
}
