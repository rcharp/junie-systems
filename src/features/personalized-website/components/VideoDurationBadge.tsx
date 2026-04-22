import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

export function VideoDurationBadge({ url }: { url: string }) {
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!url) return;

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
    };

    video.onloadedmetadata = () => {
      if (video.duration && isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      cleanup();
    };

    video.onerror = () => cleanup();

    const sep = url.includes("?") ? "&" : "?";
    video.src = `${url}${sep}t=${Date.now()}`;

    return cleanup;
  }, [url]);

  if (duration === null) return null;

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium tabular-nums">
      <Clock className="w-2.5 h-2.5" />
      {formatDuration(duration)}
    </span>
  );
}
