import { useEffect } from "react";
import { Check, Star, Clock, Shield, ChevronDown } from "lucide-react";

const DemoPage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://api.juniesystems.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">

        {/* Hero: Two-column — Video left, Booking right */}
        <section className="bg-background py-10 md:py-14 px-4">
          <div className="max-w-6xl mx-auto">

            {/* Headline */}
            <div className="text-center mb-8 space-y-3">
              <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight">
                Your Website & Marketing —{" "}
                <span className="text-primary">Done For You</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Watch the video, then pick a time to chat. That's it.
              </p>
            </div>

            {/* Step headers row — aligned across both columns */}
            <div className="grid md:grid-cols-2 gap-8 mb-4">
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-extrabold text-foreground">
                  Step 1: <span className="text-primary">Watch this short video</span>
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl md:text-3xl font-extrabold text-foreground">
                  Step 2: <span className="text-primary">Pick a time for your FREE website redesign</span>
                </p>
              </div>
            </div>

            {/* Two-column layout with vertical divider */}
            <div className="flex gap-0 items-stretch">

              {/* LEFT: Video + value props */}
              <div className="flex flex-col justify-center space-y-6 flex-1 pr-8">

                {/* Loom embed */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg">
                  <iframe
                    src="https://www.loom.com/embed/878d5f101fff46ccadd63d3250388e3c?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true"
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full"
                    title="Junie Systems Overview"
                  />
                </div>

                {/* Social proof */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Trusted by contractors across the U.S.
                  </p>
                </div>

                {/* What's included */}
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {[
                    "Custom contractor website",
                    "Missed-call text-back",
                    "Automated lead follow-up",
                    "5-star review system",
                    "SEO-optimized pages",
                    "No contracts — cancel anytime",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-foreground text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>

                <p className="text-foreground font-bold text-center">
                  All for{" "}
                  <span className="text-primary text-xl">$297/mo</span>
                  <span className="text-muted-foreground font-normal text-sm ml-2">
                    · No setup fees
                  </span>
                </p>

                {/* Mobile-only: scroll prompt */}
                <div className="flex flex-col items-center gap-1 md:hidden pt-2">
                  <p className="text-sm font-semibold text-foreground">
                    👇 Scroll down to pick a time
                  </p>
                  <p className="text-xs text-muted-foreground">
                    30 minutes · Zero obligation · Free
                  </p>
                  <ChevronDown className="w-6 h-6 text-primary animate-bounce mt-1" />
                </div>
              </div>

              {/* Vertical divider — hidden on mobile */}
              <div className="hidden md:block w-px bg-border self-stretch shrink-0" />

              {/* RIGHT: Booking calendar */}
              <div className="flex flex-col justify-center space-y-4 flex-1 pl-8" id="book">
                <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" /> 30 min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-primary" /> Zero obligation
                  </span>
                </div>

                <iframe
                  src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
                  style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "680px" }}
                  scrolling="no"
                  id="fBlaNQM6Ay3RD1FiID1Z_1771301671900"
                  title="Junie Systems Demo Calendar"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <div className="bg-background py-6 px-4 border-t border-border">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              © 2026 Junie Systems · ricky@juniesystems.com · Palmetto, FL
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              <strong className="text-muted-foreground">Earnings Disclaimer:</strong> Results may vary and testimonials are not claimed to represent typical results. All testimonials are real. These results are meant as a showcase of what the best, most motivated clients have achieved and should not be taken as average or typical results. You should perform your own due diligence and use your own best judgment prior to making any investment decision pertaining to your business. By virtue of visiting this site or interacting with any portion of this site, you agree that you're fully responsible for the investments you make and any outcomes that may result.
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed">
              This site is not a part of the YouTube, Google, Bing, or Facebook website; Google Inc, Microsoft Inc, or Meta Inc. Additionally, this site is NOT endorsed by YouTube, Google, Bing, or Facebook in any way. FACEBOOK is a trademark of META Inc. YOUTUBE is a trademark of GOOGLE Inc. BING is a trademark of MICROSOFT Inc.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DemoPage;
