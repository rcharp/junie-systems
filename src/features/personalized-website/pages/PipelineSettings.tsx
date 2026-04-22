import { useEffect, useState } from "react";
import { supabase } from "@/integrations/junie-pipeline/client";
import { Save, Eye, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "password" | "textarea";
  placeholder: string;
  tab: string;
  group: string;
  description?: string;
}

const FIELDS: SettingField[] = [
  // API Keys
  { key: "browserless_api_key", label: "Browserless API Key", type: "password", placeholder: "Browserless.io key", tab: "api-keys", group: "Recording" },
  { key: "screenshotone_access_key", label: "ScreenshotOne Access Key", type: "password", placeholder: "Access key", tab: "api-keys", group: "Recording" },
  { key: "urlbox_api_secret", label: "Urlbox API Secret", type: "password", placeholder: "Urlbox secret", tab: "api-keys", group: "Recording" },
  { key: "elevenlabs_api_key", label: "ElevenLabs API Key", type: "password", placeholder: "xi-...", tab: "api-keys", group: "Voice" },
  { key: "elevenlabs_voice_id", label: "ElevenLabs Voice ID", type: "text", placeholder: "Voice ID", tab: "api-keys", group: "Voice" },
  { key: "shotstack_api_key", label: "Shotstack API Key", type: "password", placeholder: "Shotstack key", tab: "api-keys", group: "Video" },
  { key: "creatomate_api_key", label: "Creatomate API Key", type: "password", placeholder: "Creatomate key", tab: "api-keys", group: "Video" },
  { key: "creatomate_template_id", label: "Creatomate Template ID", type: "text", placeholder: "Template ID", tab: "api-keys", group: "Video" },

  // Content
  {
    key: "site_prompt_template",
    label: "Personalization Prompt",
    type: "textarea",
    placeholder: "Describe how the injection script should personalize the demo page...",
    tab: "content",
    group: "Site Generation",
    description: "Detailed instructions for how primary/secondary colors and content are applied during personalization.",
  },
  {
    key: "script_template",
    label: "Voiceover Script Template",
    type: "textarea",
    placeholder: "Hey {{company_name}}, I just built you a quick landing page...",
    tab: "content",
    group: "Voiceover",
    description: "Use {{company_name}} where the company name should be spoken.",
  },
  { key: "default_primary_color", label: "Default Primary Color", type: "text", placeholder: "#0f172a", tab: "content", group: "Defaults" },
  { key: "default_secondary_color", label: "Default Secondary Color", type: "text", placeholder: "#3b82f6", tab: "content", group: "Defaults" },
  { key: "speaker_video_url", label: "Speaker Video URL", type: "text", placeholder: "https://.../speaker-bubble.mp4", tab: "content", group: "Speaker" },
  { key: "speaker_keyword", label: "Speaker Keyword", type: "text", placeholder: "e.g. Acme", tab: "content", group: "Speaker" },
];

export default function PipelineSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) {
        toast({ title: "Failed to load settings", description: error.message, variant: "destructive" });
      } else if (data) {
        const map: Record<string, string> = {};
        (data as any[]).forEach((s) => {
          map[s.key] = s.value ?? "";
        });
        setValues(map);
      }
      setLoading(false);
    })();
  }, []);

  function update(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty((d) => new Set(d).add(key));
  }

  async function save() {
    if (dirty.size === 0) {
      toast({ title: "No changes to save" });
      return;
    }
    setSaving(true);
    try {
      const rows = Array.from(dirty).map((key) => ({ key, value: values[key] ?? "" }));
      const { error } = await (supabase.from("settings") as any).upsert(rows, { onConflict: "key" });
      if (error) throw error;
      setDirty(new Set());
      toast({ title: "Settings saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function renderField(f: SettingField) {
    return (
      <div key={f.key} className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground block">{f.label}</label>
        {f.description && <p className="text-xs text-muted-foreground/70">{f.description}</p>}
        <div className="relative">
          {f.type === "textarea" ? (
            <Textarea
              value={values[f.key] || ""}
              onChange={(e) => update(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="bg-muted/50 border-border/50 min-h-[180px]"
            />
          ) : (
            <>
              <Input
                type={f.type === "password" && !show[f.key] ? "password" : "text"}
                value={values[f.key] || ""}
                onChange={(e) => update(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="bg-muted/50 border-border/50 pr-10"
              />
              {f.type === "password" && (
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                >
                  {show[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderTab(tab: string) {
    const tabFields = FIELDS.filter((f) => f.tab === tab);
    const groups = Array.from(new Set(tabFields.map((f) => f.group)));
    return (
      <div className="space-y-6">
        {groups.map((g) => (
          <div key={g} className="glass rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{g}</h2>
            {tabFields.filter((f) => f.group === g).map(renderField)}
          </div>
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure API keys and templates stored in the Junie pipeline backend.
          </p>
        </div>
        <Button onClick={save} disabled={saving || dirty.size === 0}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : `Save${dirty.size ? ` (${dirty.size})` : ""}`}
        </Button>
      </div>

      <div className="glass rounded-xl p-4 text-xs text-muted-foreground flex items-start gap-2 border border-warning/30">
        <ExternalLink className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
        <p>
          Advanced settings (industry content map, voice cloning, lip-sync providers, usage analytics, webhook docs)
          remain in the dedicated Junie pipeline app — those features depend on edge functions that aren't deployed in
          this project.
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="content">Content & Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="api-keys" className="mt-6">
          {renderTab("api-keys")}
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          {renderTab("content")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
