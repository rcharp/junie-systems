import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Check, Star, Clock, Zap, Shield, TrendingUp } from "lucide-react";

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
      <Header />
      <main className="flex-1">
        {/* Progress Bar */}
        <div className="w-full bg-muted pt-20">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                50% Complete
              </span>
            </div>
            <div className="w-full h-3 bg-border rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-primary rounded-full transition-all duration-500" />
            </div>
          </div>
        </div>

        {/* Step 1: The Hook */}
        <section className="bg-background py-16 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-block px-4 py-1.5 bg-primary/10 rounded-full">
              <span className="text-sm font-bold text-primary tracking-wide">STEP #1</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight">
              Attention Home Service <span className="text-primary">Business Owners</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground font-medium">
              We build your website, automate your follow-ups, and fill your calendar — so you can focus on the work.
            </p>

            <div className="border-t border-border my-8" />

            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Here's What You're Getting:
              </h2>
              <p className="text-muted-foreground mb-8">
                Everything a contractor needs to dominate their local market — done for you.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
              {[
                "Custom multi-page website (10–20 pages)",
                "Instant missed-call text-back system",
                "Automated lead follow-up sequences",
                "5-star review generation on autopilot",
                "Local SEO-optimized content & pages",
                "Mobile-first, lightning-fast design",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                  <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground font-medium text-sm">{item}</span>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <p className="text-lg font-bold text-foreground">
                All for just <span className="text-primary text-2xl">$297/month</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">No contracts. No setup fees. Cancel anytime.</p>
            </div>
          </div>
        </section>

        {/* Social Proof Strip */}
        <section className="bg-muted py-10 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-foreground font-semibold">"Our leads tripled in the first month."</p>
                <p className="text-sm text-muted-foreground">— Mike R., Roofing Contractor</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-foreground font-semibold">"I stopped losing jobs to missed calls overnight."</p>
                <p className="text-sm text-muted-foreground">— Sarah T., HVAC Business Owner</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-foreground font-semibold">"Best investment I've made for my plumbing company."</p>
                <p className="text-sm text-muted-foreground">— Carlos D., Plumbing Pro</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why It Works */}
        <section className="bg-background py-16 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-10">
            <h2 className="text-3xl font-bold text-foreground">
              Why Contractors Choose Junie
            </h2>
            <div className="grid sm:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">Done For You</h3>
                <p className="text-sm text-muted-foreground">We handle everything — website, automations, reviews. You just show up and do the work you're great at.</p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">More Jobs, Less Effort</h3>
                <p className="text-sm text-muted-foreground">Automated follow-ups and instant text-back mean you never lose a lead to a missed call again.</p>
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">No Risk</h3>
                <p className="text-sm text-muted-foreground">Month-to-month. No contracts, no hidden fees. If we don't deliver, you walk — simple as that.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Book a Call */}
        <section className="bg-muted py-16 px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-block px-4 py-1.5 bg-primary/10 rounded-full">
              <span className="text-sm font-bold text-primary tracking-wide">STEP #2</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Book Your Free <span className="text-primary">Strategy Call</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Pick a time below and we'll walk you through exactly how Junie can grow your business — no pressure, no pitch. Just a real conversation.
            </p>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>30 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span>Zero obligation</span>
              </div>
            </div>

            {/* Embedded Calendar */}
            <div className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden mt-8">
              <iframe
                src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
                style={{ width: "100%", border: "none", overflow: "hidden", minHeight: "700px" }}
                scrolling="no"
                id="fBlaNQM6Ay3RD1FiID1Z_1771301671900"
                title="Junie Systems Demo Calendar"
              />
            </div>
          </div>
        </section>

        {/* Final CTA / Urgency */}
        <section className="bg-primary py-12 px-4">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h3 className="text-2xl md:text-3xl font-bold text-primary-foreground">
              Still on the fence?
            </h3>
            <p className="text-primary-foreground/80 text-lg">
              Every day without a proper system is another missed call, another lost job, another 5-star review that never happened. Book the call — it's free and you'll walk away with a clear plan either way.
            </p>
            <a
              href="#fBlaNQM6Ay3RD1FiID1Z_1771301671900"
              className="inline-block mt-4 px-8 py-3 bg-background text-primary font-bold rounded-full hover:opacity-90 transition-opacity"
            >
              ↑ Grab Your Spot Now
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DemoPage;
