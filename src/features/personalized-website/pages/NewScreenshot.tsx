import { useState, useRef } from "react";
import {
  supabase,
  JUNIE_SUPABASE_URL,
  JUNIE_SUPABASE_PUBLISHABLE_KEY,
} from "@/integrations/junie-pipeline/client";
import { motion } from "framer-motion";
import { Camera, Loader2, Upload, Link as LinkIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewScreenshot() {
  const [companyName, setCompanyName] = useState("Junie Systems");
  const [industry, setIndustry] = useState("junk removal");
  const [phoneNumber, setPhoneNumber] = useState("9412584006");
  const [logoMode, setLogoMode] = useState<"upload" | "url">("upload");
  const [logoUrl, setLogoUrl] = useState(
    "https://lh4.googleusercontent.com/-T1_Aj0WdznY/AAAAAAAAAAI/AAAAAAAAAAA/BHMk-fF3vn8/s44-p-k-no-ns-nd/photo.jpg",
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [transparentLogoBg, setTransparentLogoBg] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const generateScreenshot = async () => {
    const name = companyName.trim();
    if (!name || !phoneNumber.trim()) return;

    let finalLogoUrl = logoUrl.trim();
    if (logoMode === "upload" && logoFile) {
      const ext = logoFile.name.split(".").pop() || "png";
      const path = `logos/screenshot-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("templates")
        .upload(path, logoFile, { contentType: logoFile.type, upsert: true });
      if (upErr) {
        toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
        return;
      }
      finalLogoUrl = `${JUNIE_SUPABASE_URL}/storage/v1/object/public/templates/${path}`;
    }

    if (!finalLogoUrl) {
      toast({ title: "Logo required", description: "Please upload a logo or enter a URL", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setScreenshotUrl(null);

    try {
      const res = await fetch(`${JUNIE_SUPABASE_URL}/functions/v1/generate-screenshot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: JUNIE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${JUNIE_SUPABASE_PUBLISHABLE_KEY}`,
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

      try {
        await supabase.from("pipeline_companies").insert({
          run_id: "00000000-0000-0000-0000-000000000000",
          name,
          url: finalLogoUrl,
          industry: industry.trim() || "general",
          phone_number: phoneNumber.trim(),
          logo_url: finalLogoUrl,
          screen_url: data.screenshotUrl,
          status: "screenshot-done",
          primary_color: data.colors?.primary || null,
          secondary_color: data.colors?.secondary || null,
        } as any);
      } catch (dbErr) {
        console.error("Failed to save screenshot record:", dbErr);
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
              const val = e.target.value.replace(/[^0-9()\-\s]/g, "");
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
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. Plumbing, Landscaping, HVAC"
            className="bg-muted/50 border-border/50 text-base"
            disabled={submitting}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Logo
          </label>
          <Tabs value={logoMode} onValueChange={(v) => setLogoMode(v as "upload" | "url")} className="mb-2">
            <TabsList className="grid w-full grid-cols-2 h-8">
              <TabsTrigger value="upload" className="text-xs gap-1">
                <Upload className="w-3 h-3" /> Upload
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs gap-1">
                <LinkIcon className="w-3 h-3" /> URL
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
          ) : (
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="bg-muted/50 border-border/50 text-base"
              disabled={submitting}
            />
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
            (logoMode === "upload" ? !logoFile : !logoUrl.trim())
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
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Generated Screenshot</span>
            <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1">
                <Download className="w-3 h-3" /> Download
              </Button>
            </a>
          </div>
          <img src={screenshotUrl} alt="Generated screenshot" className="w-full rounded-lg border border-border/50" />
        </motion.div>
      )}
    </div>
  );
}
