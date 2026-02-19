const adVariants = [
  {
    label: '① "Your Leads. Followed Up. Automatically."',
    headline: ["Your Leads.", "Followed Up.", "Automatically."],
  },
  {
    label: '② "Never Miss a Call. Never Lose a Job."',
    headline: ["Never Miss", "a Call.", "Never Lose", "a Job."],
  },
  {
    label: '③ "Follow Up Fast. Win More Jobs."',
    headline: ["Follow Up", "Fast. Win", "More Jobs."],
  },
];

type AdTheme = "blue" | "dark" | "white";

const themes: { key: AdTheme; bg: string; text: string; badge: string; badgeText: string; subText: string; btnBg: string; btnText: string; fine: string }[] = [
  {
    key: "blue",
    bg: "bg-[#2B8CEE]",
    text: "text-white",
    badge: "bg-white/20",
    badgeText: "text-white",
    subText: "text-white/85",
    btnBg: "bg-white",
    btnText: "text-[#2B8CEE]",
    fine: "text-white/70",
  },
  {
    key: "dark",
    bg: "bg-[#111827]",
    text: "text-white",
    badge: "bg-white/10",
    badgeText: "text-white",
    subText: "text-white/80",
    btnBg: "bg-[#2B8CEE]",
    btnText: "text-white",
    fine: "text-white/60",
  },
  {
    key: "white",
    bg: "bg-white",
    text: "text-[#111827]",
    badge: "bg-[#2B8CEE]/10",
    badgeText: "text-[#2B8CEE]",
    subText: "text-gray-600",
    btnBg: "bg-[#2B8CEE]",
    btnText: "text-white",
    fine: "text-gray-400",
  },
];

const AdCard = ({
  headline,
  theme,
}: {
  headline: string[];
  theme: typeof themes[0];
}) => (
  <div
    className={`${theme.bg} rounded-2xl flex flex-col justify-between p-10 shadow-xl`}
    style={{ width: 360, height: 360, flexShrink: 0 }}
  >
    {/* Badge */}
    <div className={`${theme.badge} rounded-full px-4 py-1.5 self-start`}>
      <span className={`${theme.badgeText} text-xs font-bold tracking-widest uppercase`}>
        FOR <span className="font-black">Contractors</span>
      </span>
    </div>

    {/* Headline */}
    <div className="flex-1 flex items-center">
      <h2
        className={`${theme.text} font-black leading-none`}
        style={{ fontFamily: "'Barlow', sans-serif", fontSize: 42, lineHeight: 1.05 }}
      >
        {headline.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </h2>
    </div>

    {/* Body + CTA */}
    <div className="space-y-4">
      <p className={`${theme.subText} text-xs leading-snug`}>
        Get a free website + marketing automation that follows up with leads and gets you 5-star Google reviews — $297/mo
      </p>
      <button
        className={`${theme.btnBg} ${theme.btnText} w-full rounded-xl font-black text-sm py-3 px-4 text-center tracking-wide`}
        style={{ fontFamily: "'Barlow', sans-serif" }}
      >
        Get My Free Website →
      </button>
      <p className={`${theme.fine} text-center text-[10px] tracking-wide`}>
        No contracts · Set up in days
      </p>
    </div>
  </div>
);

const AdsPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-6">
      <div className="max-w-5xl mx-auto space-y-16">
        <div className="text-center">
          <h1 className="text-3xl font-black text-gray-900" style={{ fontFamily: "'Barlow', sans-serif" }}>
            Contractor Ads — All Variants
          </h1>
          <p className="text-gray-500 mt-2 text-sm">3 headlines × 3 color themes = 9 ads</p>
        </div>

        {adVariants.map((variant) => (
          <section key={variant.label} className="space-y-5">
            <h2 className="text-lg font-bold text-gray-700">{variant.label}</h2>
            <div className="flex flex-wrap gap-6">
              {themes.map((theme) => (
                <AdCard key={theme.key} headline={variant.headline} theme={theme} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Load Barlow font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@700;900&display=swap');`}</style>
    </div>
  );
};

export default AdsPage;
