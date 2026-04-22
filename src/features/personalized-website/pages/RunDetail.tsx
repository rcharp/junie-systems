import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  supabase,
  JUNIE_SUPABASE_URL,
  JUNIE_SUPABASE_PUBLISHABLE_KEY,
} from "@/integrations/junie-pipeline/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Copy,
  ExternalLink,
  ArrowLeft,
  Globe,
  Mic,
  Monitor,
  Video,
  Square,
  Trash2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const BASE = "/loom";

interface PipelineCompany {
  id: string;
  run_id: string;
  name: string;
  url: string;
  industry: string | null;
  contact_name: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  phone_number: string | null;
  status: string;
  current_step: string | null;
  site_url: string | null;
  screen_url: string | null;
  audio_url: string | null;
  video_url: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

interface PipelineRun {
  id: string;
  status: string;
  total_companies: number;
  created_at: string;
  pause_after_steps?: string;
}

const STEPS = [
  { key: "site_url", timingKey: "site", label: "Create Dynamic Site", icon: Globe, description: "Generate personalized landing page" },
  { key: "screen_url", timingKey: "recording", label: "Record Personalized Video", icon: Monitor, description: "Capture scroll recording" },
  { key: "audio_url", timingKey: "voiceover", label: "Generate Voiceover", icon: Mic, description: "ElevenLabs text-to-speech" },
  { key: "video_url", timingKey: "composite", label: "Composite Final Video", icon: Video, description: "Shotstack renders & delivers" },
];

function formatSecondsToMinSec(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0s";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function parseStepTimings(currentStep: string | null): Record<string, string> | null {
  if (!currentStep) return null;
  const idx = currentStep.indexOf("||TIMINGS:");
  if (idx === -1) return null;
  try { return JSON.parse(currentStep.substring(idx + "||TIMINGS:".length)); } catch { return null; }
}

function StepIndicator({ company, enabledSteps }: { company: PipelineCompany; enabledSteps: boolean[] }) {
  const timings = parseStepTimings(company.current_step);
  const stepStatuses = STEPS.map((step) => {
    const val = company[step.key as keyof PipelineCompany];
    return !!val && val !== "placeholder://no-video";
  });
  const firstIncomplete = stepStatuses.indexOf(false);

  return (
    <div className="mt-3 space-y-0">
      {STEPS.map((step, i) => {
        const stepEnabled = enabledSteps[i];
        const done = stepStatuses[i];
        const isFailed = company.status === "failed" && i === firstIncomplete;
        const isActive = !done && !isFailed && stepEnabled && firstIncomplete === i && company.status === "processing";
        const Icon = step.icon;
        const stepTime = timings?.[step.timingKey];

        return (
          <div key={step.key} className="flex items-start gap-3 relative">
            {i < STEPS.length - 1 && (
              <div className={`absolute left-[11px] top-[24px] w-[2px] h-[calc(100%-8px)] ${done ? "bg-success/40" : "bg-border/50"}`} />
            )}
            <div className="shrink-0 mt-0.5 z-10">
              {!stepEnabled ? <div className="w-6 h-6 rounded-full border-2 border-border/20 bg-muted/10" />
                : done ? <CheckCircle2 className="w-6 h-6 text-success" />
                : isFailed ? <XCircle className="w-6 h-6 text-destructive" />
                : isActive ? <Loader2 className="w-6 h-6 text-primary animate-spin" />
                : <div className="w-6 h-6 rounded-full border-2 border-border/50 bg-muted/30" />}
            </div>
            <div className={`pb-4 ${!stepEnabled ? "opacity-25" : !done && !isActive && !isFailed ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <Icon className={`w-3.5 h-3.5 ${done ? "text-success" : isFailed ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${done ? "text-success" : isFailed ? "text-destructive" : isActive ? "text-primary" : "text-muted-foreground"}`}>{step.label}</span>
                {done && stepTime && (
                  <span className="text-[10px] text-muted-foreground font-mono tabular-nums bg-muted px-1.5 py-0.5 rounded">
                    {formatSecondsToMinSec(parseFloat(stepTime))}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 ml-[22px]">{step.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [companies, setCompanies] = useState<PipelineCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewVideo, setPreviewVideo] = useState<{ url: string; name: string } | null>(null);
  const [enabledSteps, setEnabledSteps] = useState<boolean[]>(STEPS.map(() => true));
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!id) return;
    fetchData();
    const channel = supabase
      .channel(`run-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_companies", filter: `run_id=eq.${id}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_runs", filter: `id=eq.${id}` }, () => fetchData())
      .subscribe();
    const interval = setInterval(() => fetchData(), 5000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, [id]);

  useEffect(() => {
    if (searchParams.get("retry") === "true" && !loading && run && companies.length > 0) {
      if (companies.some((c) => c.status === "failed")) retryAllFailed();
      setSearchParams({}, { replace: true });
    }
  }, [loading, run, companies]);

  async function fetchData() {
    if (!id) return;
    const [{ data: runData }, { data: compData }, { data: settingsData }] = await Promise.all([
      supabase.from("pipeline_runs").select("*").eq("id", id).single(),
      supabase.from("pipeline_companies").select("*").eq("run_id", id).order("created_at"),
      supabase.from("settings").select("*").eq("key", "disabled_steps").single(),
    ]);
    if (runData) setRun(runData as any);
    if (settingsData?.value) {
      try {
        const disabledSteps: string[] = JSON.parse(settingsData.value);
        setEnabledSteps(STEPS.map((s) => !disabledSteps.includes(s.timingKey)));
      } catch {}
    }
    if (compData) setCompanies(compData as any);
    setLoading(false);
  }

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast({ title: "Copied to clipboard" }); };

  const retryAllFailed = async () => {
    if (!id) return;
    try {
      await supabase.from("pipeline_companies").update({ status: "queued", error: null, current_step: null }).eq("run_id", id).eq("status", "failed");
      await supabase.from("pipeline_runs").update({ status: "processing" }).eq("id", id);
      await fetch(`${JUNIE_SUPABASE_URL}/functions/v1/process-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: JUNIE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${JUNIE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ runId: id }),
      });
      toast({ title: "Retrying failed companies..." });
      fetchData();
    } catch (err: any) { toast({ title: "Retry failed", description: err.message, variant: "destructive" }); }
  };

  const cancelRun = async () => {
    if (!id) return;
    try {
      await supabase.from("pipeline_companies").update({ status: "failed", error: "Cancelled by user", current_step: null }).eq("run_id", id).in("status", ["queued", "processing"]);
      await supabase.from("pipeline_runs").update({ status: "failed" }).eq("id", id);
      toast({ title: "Run cancelled" });
      fetchData();
    } catch (err: any) { toast({ title: "Cancel failed", description: err.message, variant: "destructive" }); }
  };

  const rerun = async (company: PipelineCompany) => {
    try {
      const { data: newRun, error: runError } = await supabase.from("pipeline_runs").insert({ status: "queued", total_companies: 1 }).select().single();
      if (runError || !newRun) throw runError;
      await supabase.from("pipeline_companies").insert({
        run_id: newRun.id, name: company.name, url: company.url || "", industry: company.industry,
        primary_color: company.primary_color, secondary_color: company.secondary_color,
        phone_number: company.phone_number, contact_name: company.contact_name,
      } as any);
      fetch(`${JUNIE_SUPABASE_URL}/functions/v1/process-pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: JUNIE_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${JUNIE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ runId: newRun.id }),
      });
      toast({ title: "Rerun started!", description: `New run for ${company.name}` });
      navigate(`${BASE}/runs/${newRun.id}`);
    } catch (err: any) { toast({ title: "Rerun failed", description: err.message, variant: "destructive" }); }
  };

  const deleteRun = async () => {
    if (!id || !confirm("Delete this run and all its data? This cannot be undone.")) return;
    try {
      await supabase.from("pipeline_companies").delete().eq("run_id", id);
      await supabase.from("pipeline_runs").delete().eq("id", id);
      toast({ title: "Run deleted" });
      navigate(BASE);
    } catch (err: any) { toast({ title: "Delete failed", description: err.message, variant: "destructive" }); }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "failed": return <XCircle className="w-5 h-5 text-destructive" />;
      case "processing": return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      queued: "bg-muted text-muted-foreground",
      processing: "bg-primary/10 text-primary",
      done: "bg-success/10 text-success",
      failed: "bg-destructive/10 text-destructive",
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.queued}`}>{status}</span>;
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;
  if (!run) return <div className="text-center py-20"><p className="text-muted-foreground">Run not found</p><Button asChild variant="ghost" className="mt-4"><Link to={BASE}>Back to Dashboard</Link></Button></div>;

  const doneCount = companies.filter((c) => c.status === "done").length;
  const failedCount = companies.filter((c) => c.status === "failed").length;
  const processingCount = companies.filter((c) => c.status === "processing").length;
  const totalEnabledSteps = enabledSteps.filter(Boolean).length || 1;
  const overallProgress = companies.length > 0
    ? companies.reduce((sum, c) => {
        if (c.status === "done" || c.status === "failed") return sum + 100;
        const completedSteps = STEPS.filter((step, i) => {
          if (!enabledSteps[i]) return false;
          const val = c[step.key as keyof PipelineCompany];
          return !!val && val !== "placeholder://no-video";
        }).length;
        return sum + (completedSteps / totalEnabledSteps) * 100;
      }, 0) / companies.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm"><Link to={BASE}><ArrowLeft className="w-4 h-4 mr-1" />Back</Link></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Run Detail</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{run.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {companies.length > 0 && (run.status === "done" || run.status === "failed") && (
            <Button variant="outline" size="sm" onClick={() => rerun(companies[0])}><Play className="w-3.5 h-3.5 mr-1" />Rerun</Button>
          )}
          {(run.status === "queued" || run.status === "processing") && (
            <Button variant="outline" size="sm" onClick={cancelRun} className="text-destructive border-destructive/30 hover:bg-destructive/10"><Square className="w-3.5 h-3.5 mr-1" />Cancel</Button>
          )}
          <Button variant="outline" size="sm" onClick={deleteRun} className="text-destructive border-destructive/30 hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 mr-1" />Delete</Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex gap-4 flex-wrap">
          <div className="glass rounded-lg px-4 py-3 flex items-center gap-2">{statusBadge(run.status)}</div>
          <div className="glass rounded-lg px-4 py-3 text-sm"><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{run.total_companies}</span></div>
          <div className="glass rounded-lg px-4 py-3 text-sm">
            <span className="text-success">✓ {doneCount}</span><span className="text-muted-foreground mx-2">·</span>
            <span className="text-destructive">✗ {failedCount}</span><span className="text-muted-foreground mx-2">·</span>
            <span className="text-primary">⟳ {processingCount}</span>
          </div>
          <div className="glass rounded-lg px-4 py-3 text-sm text-muted-foreground">{format(new Date(run.created_at), "MMM d, yyyy HH:mm")}</div>
        </div>
        <div className="glass rounded-lg px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Overall progress</span><span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl overflow-hidden">
        <div className="divide-y divide-border/30">
          <AnimatePresence>
            {companies.map((company, i) => (
              <motion.div key={company.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="px-5 py-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">{statusIcon(company.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{company.name}</p>
                      {statusBadge(company.status)}
                    </div>
                    {company.url && <p className="text-xs text-muted-foreground font-mono truncate">{company.url}</p>}
                    {company.error && (
                      <div className="mt-2 rounded-md bg-destructive/5 border border-destructive/20 px-3 py-2">
                        <p className="text-[11px] text-destructive/80 break-words">{company.error}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="text-xs" disabled={!company.site_url} onClick={() => window.open(`${BASE}/render/${company.id}`, "_blank")}>
                      <Globe className="w-3.5 h-3.5 mr-1" />View Site
                    </Button>
                    {company.screen_url && company.screen_url !== "placeholder://no-video" && (
                      <a href={company.screen_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-xs"><Monitor className="w-3.5 h-3.5 mr-1" />View Recording</Button>
                      </a>
                    )}
                    {company.video_url && company.video_url !== "placeholder://no-video" && (
                      <>
                        <a href={company.video_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="text-xs"><Video className="w-3.5 h-3.5 mr-1" />View Final Video</Button>
                        </a>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => copyUrl(company.video_url!)}>
                          <Copy className="w-3.5 h-3.5 mr-1" />Copy URL
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {(company.status === "processing" || company.status === "done" || company.status === "failed") && (
                  <div className="ml-9"><StepIndicator company={company} enabledSteps={enabledSteps} /></div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      <Dialog open={!!previewVideo} onOpenChange={(open) => { if (!open) setPreviewVideo(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{previewVideo?.name}</span>
              {previewVideo && (
                <a href={previewVideo.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                  Open in new tab <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          {previewVideo && <video src={previewVideo.url} controls autoPlay className="w-full rounded-md border border-border" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
