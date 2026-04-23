import { Outlet, Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, PlusCircle, Camera, Settings, Video, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const BASE = "/loom";

const navItems = [
  { path: `${BASE}/new`, label: "New Run", icon: PlusCircle, matchExact: [BASE, `${BASE}/new`] as string[] },
  { path: `${BASE}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
  { path: `${BASE}/screenshot`, label: "Screenshot", icon: Camera },
  { path: `${BASE}/settings`, label: "Settings", icon: Settings },
];

export default function PipelineLayout() {
  const location = useLocation();
  const { user, loading, isAdmin, adminLoading } = useAuth();

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="text-muted-foreground text-sm">
            You need administrator privileges to access the Loom pipeline.
          </p>
          <Link to="/" className="inline-block text-primary hover:underline text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="junie-pipeline min-h-screen bg-background grid-bg">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={BASE} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center glow-primary">
              <Video className="w-4.5 h-4.5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="gradient-text">Loom</span>{" "}
              <span className="text-muted-foreground font-medium">Pipeline</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = "matchExact" in item
                ? item.matchExact.includes(location.pathname)
                : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
