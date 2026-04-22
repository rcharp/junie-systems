import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  supabase,
  JUNIE_SUPABASE_URL,
  JUNIE_SUPABASE_PUBLISHABLE_KEY,
} from "@/integrations/junie-pipeline/client";
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const BASE = "/loom";

export default function NewRun() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("Junie Systems");
  const [industry, setIndustry] = useState("marketing");
  const [phoneNumber, setPhoneNumber] = useState("9412584006");
  const [submitting, setSubmitting] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6");

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .in("key", ["default_primary_color", "default_secondary_color"])
      .then(({ data }) => {
        data?.forEach((s: any) => {
          if (s.key === "default_primary_color" && s.value) setPrimaryColor(s.value);
          if (s.key === "default_secondary_color" && s.value) setSecondaryColor(s.value);
        });
      });
  }, []);

  const startPipeline = async () => {
    const name = companyName.trim();
    if (!name || !phoneNumber.trim()) return;
    setSubmitting(true);

    try {
      const { data: run, error: runError } = await supabase
        .from("pipeline_runs")
        .insert({ status: "queued", total_companies: 1 } as any)
        .select()
        .single();

      if (runError || !run) throw runError;

      const { error: compError } = await supabase.from("pipeline_companies").insert({
        run_id: run.id,
        name,
        url: "",
        industry: industry.trim() || "general",
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        phone_number: phoneNumber.trim() || null,
      } as any);

      if (compError) throw compError;

      fetch(`${JUNIE_SUPABASE_URL}/functions/v1/process-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: JUNIE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${JUNIE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ runId: run.id }),
      });

      toast({ title: "Pipeline started!", description: `Generating video for ${name}` });
      navigate(`${BASE}/runs/${run.id}`);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && companyName.trim() && phoneNumber.trim() && !submitting) {
      startPipeline();
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-8 pt-12">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Generate Video</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter company details to generate a personalized video
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
            onKeyDown={handleKeyDown}
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
            onKeyDown={handleKeyDown}
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
            onKeyDown={handleKeyDown}
            placeholder="e.g. Plumbing, Landscaping, HVAC"
            className="bg-muted/50 border-border/50 text-base"
            disabled={submitting}
          />
        </div>

        <Button
          onClick={startPipeline}
          disabled={!companyName.trim() || !phoneNumber.trim() || submitting}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary"
          size="lg"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {submitting ? "Starting..." : "Run Pipeline"}
        </Button>
      </motion.div>
    </div>
  );
}
