import { useEffect } from "react";
import { Check, Clock, Shield, Calendar } from "lucide-react";

const BookPage = () => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://api.juniesystems.com/js/form_embed.js";
    script.async = true;
    document.body.appendChild(script);

    const handleMessage = (e: MessageEvent) => {
      if (e.data.event === 'calendly.event_scheduled') {
        (window as any).fbq?.('track', 'Schedule', {}, { eventID: 'cal-' + Date.now() });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      document.body.removeChild(script);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1">
        <section className="bg-background py-14 px-4" id="book">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full">
              <Calendar className="w-3.5 h-3.5" />
              Book a Call
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight">
              Pick a Time for Your{" "}
              <span className="text-primary">FREE Website Redesign Call</span>
            </h1>
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

          <iframe
            src="https://api.juniesystems.com/widget/booking/fBlaNQM6Ay3RD1FiID1Z"
            style={{ width: "100%", maxWidth: "720px", margin: "0 auto", display: "block", border: "none", overflow: "hidden", minHeight: "680px" }}
            scrolling="no"
            id="fBlaNQM6Ay3RD1FiID1Z_1774489696850"
            title="Junie Systems Calendar"
          />

          <div className="text-center mt-6 space-y-1">
            <p className="text-sm text-muted-foreground font-medium">
              🔒 Your info is private. We'll never spam you.
            </p>
          </div>
        </section>

        <div className="bg-background py-6 px-4 border-t border-border">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs text-muted-foreground">
              © 2026 Junie Systems · ricky@juniesystems.com · Palmetto, FL
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookPage;
