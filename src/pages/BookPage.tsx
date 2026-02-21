import { useEffect } from "react";
import { Check, Star, Clock, Shield, ChevronDown, ArrowDown, Play, Calendar } from "lucide-react";

const BookPage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.type = "text/javascript";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const scrollToBook = () => {
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">

        {/* ── HERO: Video Section ── */}
        <section className="bg-background pt-12 pb-10 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-5">

            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full">
              <Play className="w-3.5 h-3.5 fill-primary" />
              Watch this first — it takes 5 minutes
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight">
              Get a Website That Actually{" "}
              <span className="text-primary">Wins You Jobs</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              See exactly how we build contractor websites that generate real leads —
              then grab a free strategy call to get yours.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Trusted by contractors across the U.S.
              </p>
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-8">
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-border">
              <iframe
                src="https://www.loom.com/embed/6f02553859a34f2caadf027269c72717?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true&autoplay=0"
                frameBorder="0"
                allowFullScreen
                className="w-full h-full"
                title="Junie Systems Overview"
              />
            </div>
          </div>

          <div className="max-w-4xl mx-auto mt-8 text-center space-y-4">
            <p className="text-foreground font-semibold text-lg">
              👆 Watched the video? Here's your next step.
            </p>
            <button
              onClick={scrollToBook}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold text-lg px-8 py-4 rounded-full shadow-lg hover:opacity-90 transition-all hover:scale-105"
            >
              <Calendar className="w-5 h-5" />
              Book Your FREE Strategy Call →
            </button>
            <p className="text-sm text-muted-foreground">
              30 minutes · Zero obligation · Totally free
            </p>

            <div className="flex flex-col items-center gap-1 pt-2">
              <ArrowDown className="w-6 h-6 text-primary animate-bounce" />
            </div>
          </div>
        </section>

        {/* ── What's Included Strip ── */}
        <section className="bg-muted/40 border-y border-border py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-6">
              Everything included at{" "}
              <span className="text-primary text-base font-extrabold">$297/mo</span>
              <span className="font-normal ml-2">— no setup fees, no contracts</span>
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "Custom contractor website",
                "Missed-call text-back",
                "Automated lead follow-up",
                "5-star review system",
                "SEO-optimized pages",
                "Cancel anytime",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 bg-background rounded-lg px-4 py-3 border border-border shadow-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-foreground text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CALENDAR: Booking Section ── */}
        <section className="bg-background py-14 px-4" id="book">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">

            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              Step 2 of 2
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight">
              Pick a Time for Your{" "}
              <span className="text-primary">FREE Website Redesign Call</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              We'll review your current online presence, show you what's costing you jobs, and build a custom plan — on the house.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" /> 30 minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-primary" /> Zero obligation
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> 100% free
              </span>
            </div>
          </div>

          {/* Calendly embed */}
          <div
            className="calendly-inline-widget"
            data-url="https://calendly.com/rickycharpentier/30min"
            style={{ minWidth: "320px", width: "60%", margin: "0 auto", minHeight: "680px" }}
          />

          <div className="text-center mt-6 space-y-1">
            <p className="text-sm text-muted-foreground font-medium">
              🔒 Your info is private. We'll never spam you.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Spots fill up fast — claim yours before they're gone.
            </p>
          </div>
        </section>

        {/* ── Disclaimer ── */}
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

export default BookPage;
