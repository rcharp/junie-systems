import { useRef } from "react";
import html2canvas from "html2canvas";

const adVariants = [
  {
    id: "leads",
    label: '"Your Leads. Followed Up. Automatically."',
    lines: ["YOUR LEADS.", "FOLLOWED UP.", "AUTOMATICALLY."],
  },
  {
    id: "miss",
    label: '"Never Miss a Call. Never Lose a Job."',
    lines: ["NEVER MISS", "A CALL.", "NEVER LOSE", "A JOB."],
  },
  {
    id: "followup",
    label: '"Follow Up Fast. Win More Jobs."',
    lines: ["FOLLOW UP", "FAST. WIN", "MORE JOBS."],
  },
];

type Theme = "dark" | "blue" | "white";

const themeConfig: Record<Theme, {
  bg: string;
  forLabel: string;
  contractors: string;
  headline: string;
  body: string;
  btnBg: string;
  btnText: string;
  fine: string;
}> = {
  dark: {
    bg: "#1a2035",
    forLabel: "#8a8fa8",
    contractors: "#E8621A",
    headline: "#ffffff",
    body: "#e0e4f0",
    btnBg: "#E8621A",
    btnText: "#ffffff",
    fine: "#6b7280",
  },
  blue: {
    bg: "#2B8CEE",
    forLabel: "rgba(255,255,255,0.6)",
    contractors: "#ffffff",
    headline: "#ffffff",
    body: "rgba(255,255,255,0.9)",
    btnBg: "#ffffff",
    btnText: "#2B8CEE",
    fine: "rgba(255,255,255,0.55)",
  },
  white: {
    bg: "#ffffff",
    forLabel: "#9ca3af",
    contractors: "#E8621A",
    headline: "#111827",
    body: "#4b5563",
    btnBg: "#E8621A",
    btnText: "#ffffff",
    fine: "#9ca3af",
  },
};

const DISPLAY_SIZE = 360;
const EXPORT_SIZE = 1080;

interface AdCardProps {
  lines: string[];
  theme: Theme;
  adId: string;
}

const AdCard = ({ lines, theme, adId }: AdCardProps) => {
  const cfg = themeConfig[theme];
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      scale: EXPORT_SIZE / DISPLAY_SIZE,
      useCORS: true,
      backgroundColor: cfg.bg,
      logging: false,
    });
    const link = document.createElement("a");
    link.download = `junie-ad-${adId}-${theme}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={cardRef}
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          backgroundColor: cfg.bg,
          padding: "36px 32px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxSizing: "border-box",
          fontFamily: "'Barlow', 'Arial Black', sans-serif",
          flexShrink: 0,
          borderRadius: 0,
        }}
      >
        {/* Top label */}
        <div>
          <div style={{ color: cfg.forLabel, fontSize: 13, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 4 }}>
            FOR
          </div>
          <div style={{ color: cfg.contractors, fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            CONTRACTORS
          </div>
        </div>

        {/* Main headline */}
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <div style={{ color: cfg.headline, fontSize: lines.length > 3 ? 54 : 64, fontWeight: 900, lineHeight: 0.95, letterSpacing: "-0.01em", textTransform: "uppercase" }}>
            {lines.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        </div>

        {/* Body + CTA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ color: cfg.body, fontSize: 13, lineHeight: 1.5, fontWeight: 600, margin: 0 }}>
            Get a free website + marketing automation that follows up with leads and gets you 5-star Google reviews — $297/mo
          </p>
          <div
            style={{
              backgroundColor: cfg.btnBg,
              color: cfg.btnText,
              padding: "14px 20px",
              textAlign: "center",
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              borderRadius: 6,
            }}
          >
            GET MY FREE WEBSITE →
          </div>
          <p style={{ color: cfg.fine, fontSize: 10, textAlign: "center", letterSpacing: "0.15em", textTransform: "uppercase", margin: 0 }}>
            NO CONTRACTS · SET UP IN DAYS
          </p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full py-2 text-xs font-bold uppercase tracking-widest rounded bg-gray-800 text-white hover:bg-gray-700 transition-colors"
      >
        ↓ Download 1080×1080 PNG
      </button>
      <p className="text-center text-[10px] text-gray-400 capitalize">{theme} variant</p>
    </div>
  );
};

const AdsPage = () => {
  return (
    <div className="min-h-screen bg-gray-950 py-12 px-6">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@700;900&display=swap');`}</style>

      <div className="max-w-5xl mx-auto space-y-16">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white" style={{ fontFamily: "'Barlow', sans-serif" }}>
            Contractor Ads
          </h1>
          <p className="text-gray-400 mt-2 text-sm">3 headlines × 3 color themes · Click any card to download at 1080×1080</p>
        </div>

        {adVariants.map((variant) => (
          <section key={variant.id} className="space-y-5">
            <h2 className="text-base font-bold text-gray-300">{variant.label}</h2>
            <div className="flex flex-wrap gap-8">
              {(["dark", "blue", "white"] as Theme[]).map((theme) => (
                <AdCard key={theme} lines={variant.lines} theme={theme} adId={variant.id} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default AdsPage;
