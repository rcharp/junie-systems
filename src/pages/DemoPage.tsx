import { useEffect } from "react";
import { Check, Star, Clock, Shield, ArrowDown } from "lucide-react";

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
        {/* Progress Bar */}
        <div className="w-full bg-muted">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3 mb-1.5">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                Step 1 of 2
              </span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full" />
            </div>
          </div>
        </div>

        {/* Step 1: Hook + VSL + Value Props — single flowing section */}
        <section className="bg-background py-12 md:py-16 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight">
              Your Website & Marketing — <span className="text-primary">Done For You</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Watch the short video, then pick a time to chat. That's it.
            </p>

            {/* VSL Placeholder */}
            <div className="w-full aspect-video bg-card border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-primary border-b-[12px] border-b-transparent ml-1" />
              </div>
              <p className="text-muted-foreground font-medium">Video coming soon</p>
            </div>

            {/* Compact social proof */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Trusted by contractors across the U.S.
              </p>
            </div>

            {/* What's included — tight list */}
            <div className="grid sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto pt-4">
              {[
                "Custom contractor website",
                "Missed-call text-back",
                "Automated lead follow-up",
                "5-star review system",
                "SEO-optimized pages",
                "No contracts — cancel anytime",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>

            <p className="text-foreground font-bold pt-2">
              All for <span className="text-primary text-xl">$297/mo</span>
              <span className="text-muted-foreground font-normal text-sm ml-2">· No setup fees</span>
            </p>

            {/* Arrow pointing down to calendar */}
            <div className="flex justify-center pt-4">
              <ArrowDown className="w-6 h-6 text-primary animate-bounce" />
            </div>
          </div>
        </section>

        {/* Step 2: Book — immediately follows */}
        <section className="bg-muted py-12 md:py-16 px-4" id="book">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
              Now Pick a Time — <span className="text-primary">It's Free</span>
            </h2>

            <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> 30 min</span>
              <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-primary" /> Zero obligation</span>
            </div>

            <iframe
              src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
              style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "700px" }}
              scrolling="no"
              id="fBlaNQM6Ay3RD1FiID1Z_1771301671900"
              title="Junie Systems Demo Calendar"
              className="mt-6"
            />
          </div>
        </section>

        {/* Disclaimer */}
        <div className="bg-background py-6 px-4 border-t border-border">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              © 2026 Junie Systems · hello@getjunie.com · Palmetto, FL
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
