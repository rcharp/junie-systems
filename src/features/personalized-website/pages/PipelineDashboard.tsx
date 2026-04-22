import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  supabase,
  JUNIE_SUPABASE_URL,
  JUNIE_SUPABASE_PUBLISHABLE_KEY,
} from "@/integrations/junie-pipeline/client";
import { motion } from "framer-motion";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  ArrowRight,
  Trash2,
  Camera,
  Copy,
  ExternalLink,
  Eye,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const BASE = "/loom";

interface DashboardRun {
  id: string;
  status: string;
  total_companies: number;
  created_at: string;
  company_name?: string;
  company_industry?: string;
  type: "pipeline" | "screenshot";
  screen_url?: string | null;
}

export default function PipelineDashboard() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<DashboardRun[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, processing: 0, screenshots: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("dashboard-runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_runs" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "pipeline_companies" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchData() {
    const { data: runsData } = await supabase
      .from("pipeline_runs")
      .select("*")
      .order("created_at", { ascending: false });

    const pipelineRuns: DashboardRun[] = [];
    if (runsData) {
      const runIds = runsData
        .filter((r: any) => r.id !== "00000000-0000-0000-0000-000000000000")
        .map((r: any) => r.id);
      const { data: companies } = await supabase
        .from("pipeline_companies")
        .select("run_id, name, industry, screen_url")
        .in("run_id", runIds);

      const nameMap: Record<string, string> = {};
      const industryMap: Record<string, string> = {};
      const screenMap: Record<string, string | null> = {};
      companies?.forEach((c: any) => {
        if (!nameMap[c.run_id]) {
          nameMap[c.run_id] = c.name;
          industryMap[c.run_id] = c.industry || "general";
          screenMap[c.run_id] = c.screen_url || null;
        }
      });

      runsData
        .filter((r: any) => r.id !== "00000000-0000-0000-0000-000000000000")
        .forEach((r: any) => {
          pipelineRuns.push({
            ...r,
            company_name: nameMap[r.id] || "Unknown",
            company_industry: industryMap[r.id] || "general",
            type: "pipeline",
            screen_url: screenMap[r.id] || null,
          });
        });
    }

    const { data: screenshotCompanies } = await supabase
      .from("pipeline_companies")
      .select("*")
      .in("status", ["screenshot", "screenshot-done", "failed"])
      .eq("run_id", "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false });

    const screenshotRuns: DashboardRun[] = (screenshotCompanies || []).map((c: any) => ({
      id: c.id,
      status: c.status === "screenshot-done" ? "done" : c.status === "screenshot" ? "processing" : c.status,
      total_companies: 1,
      created_at: c.created_at,
      company_name: c.name,
      company_industry: c.industry || "general",
      type: "screenshot" as const,
      screen_url: c.screen_url,
    }));

    const all = [...pipelineRuns, ...screenshotRuns].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    setRuns(all);
    setStats({
      total: all.length,
      completed: all.filter((r) => r.status === "done").length,
      failed: all.filter((r) => r.status === "failed").length,
      processing: all.filter((r) => r.status === "processing" || r.status === "queued").length,
      screenshots: screenshotRuns.length,
    });
    setLoading(false);
  }

  async function rerunCompany(companyName: string) {
    try {
      const { data: newRun, error: runError } = await supabase
        .from("pipeline_runs")
        .insert({ status: "queued", total_companies: 1 })
        .select()
        .single();
      if (runError || !newRun) throw runError;

      await supabase.from("pipeline_companies").insert({ run_id: newRun.id, name: companyName, url: "" });

      fetch(`${JUNIE_SUPABASE_URL}/functions/v1/process-pipeline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: JUNIE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${JUNIE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ runId: newRun.id }),
      });

      toast({ title: "Rerun started!", description: `New run for ${companyName}` });
      navigate(`${BASE}/runs/${newRun.id}`);
    } catch (err: any) {
      toast({ title: "Rerun failed", description: err.message, variant: "destructive" });
    }
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === runs.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(runs.map((r) => r.id)));
    }
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} run(s)? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      const pipelineIds = runs.filter((r) => ids.includes(r.id) && r.type === "pipeline").map((r) => r.id);
      const screenshotIds = runs.filter((r) => ids.includes(r.id) && r.type === "screenshot").map((r) => r.id);

      if (pipelineIds.length > 0) {
        await supabase.from("pipeline_companies").delete().in("run_id", pipelineIds);
        await supabase.from("pipeline_runs").delete().in("id", pipelineIds);
      }
      if (screenshotIds.length > 0) {
        await supabase.from("pipeline_companies").delete().in("id", screenshotIds);
      }

      setSelected(new Set());
      toast({ title: `Deleted ${ids.length} run(s)` });
      fetchData();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const statCards = [
    { label: "Total Runs", value: stats.total, icon: Play, color: "text-primary" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-success" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-destructive" },
    { label: "In Progress", value: stats.processing, icon: Clock, color: "text-warning" },
  ];

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      queued: "bg-muted text-muted-foreground",
      processing: "bg-warning/10 text-warning",
      done: "bg-success/10 text-success",
      failed: "bg-destructive/10 text-destructive",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || map.queued}`}>{status}</span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your pipeline runs and screenshots</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link to={`${BASE}/screenshot`}>
              <Camera className="w-4 h-4 mr-2" />
              New Screenshot
            </Link>
          </Button>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Link to={`${BASE}/new`}>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Run
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-border/50 flex items-center justify-between gap-3">
          <h2 className="font-semibold flex-shrink-0">All Runs</h2>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteSelected}
              disabled={deleting}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete {selected.size} selected
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : runs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No runs yet</p>
            <Button asChild variant="outline" size="sm">
              <Link to={`${BASE}/new`}>Create your first run</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="px-5 py-3 w-10">
                    <Checkbox
                      checked={selected.size === runs.length && runs.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Company
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Preview
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {runs
                  .filter((r) => r.company_name?.toLowerCase().includes(search.toLowerCase()))
                  .map((run) => (
                    <tr key={run.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <Checkbox checked={selected.has(run.id)} onCheckedChange={() => toggleSelect(run.id)} />
                      </td>
                      <td className="px-5 py-4">
                        {run.type === "pipeline" ? (
                          <Link to={`${BASE}/runs/${run.id}`} className="hover:underline">
                            <span className="text-sm font-medium">{run.company_name}</span>
                            <span className="block text-xs text-muted-foreground">{run.company_industry}</span>
                          </Link>
                        ) : (
                          <div>
                            <span className="text-sm font-medium">{run.company_name}</span>
                            <span className="block text-xs text-muted-foreground">{run.company_industry}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {run.screen_url ? (
                          <button
                            onClick={() => setPreviewUrl(run.screen_url!)}
                            className="block w-20 h-12 rounded overflow-hidden border border-border/50 hover:border-primary transition-colors bg-muted"
                          >
                            <img
                              src={run.screen_url}
                              alt={run.company_name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        ) : (
                          <div className="w-20 h-12 rounded border border-dashed border-border/40 bg-muted/30" />
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            run.type === "screenshot"
                              ? "bg-accent/10 text-accent-foreground"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {run.type === "screenshot" ? <Camera className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          {run.type === "screenshot" ? "Screenshot" : "Pipeline"}
                        </span>
                      </td>
                      <td className="px-5 py-4">{statusBadge(run.status)}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">
                        {format(new Date(run.created_at), "MMM d, yyyy HH:mm")}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {run.type === "screenshot" && run.screen_url && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => setPreviewUrl(run.screen_url!)}
                              >
                                <Eye className="w-3 h-3 mr-1" /> View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  navigator.clipboard.writeText(run.screen_url!);
                                  toast({ title: "Copied!", description: "Screenshot URL copied to clipboard" });
                                }}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Copy
                              </Button>
                              <a href={run.screen_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="text-xs">
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                              </a>
                            </>
                          )}
                          {run.type === "pipeline" && (run.status === "done" || run.status === "failed") && run.company_name && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => rerunCompany(run.company_name!)}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Rerun
                            </Button>
                          )}
                          {run.type === "pipeline" && (
                            <Button asChild variant="ghost" size="sm" className="text-xs">
                              <Link to={`${BASE}/runs/${run.id}`}>
                                View <ArrowRight className="w-3 h-3 ml-1" />
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogTitle className="sr-only">Screenshot Preview</DialogTitle>
          {previewUrl && (
            <div className="space-y-2">
              <img src={previewUrl} alt="Screenshot preview" className="w-full rounded-lg" />
              <div className="flex items-center gap-2 justify-end px-2 pb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(previewUrl);
                    toast({ title: "Copied!", description: "URL copied to clipboard" });
                  }}
                >
                  <Copy className="w-3 h-3 mr-1" /> Copy URL
                </Button>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3 mr-1" /> Open
                  </Button>
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
