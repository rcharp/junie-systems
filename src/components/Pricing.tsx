import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const features = [
  "Complete website redesigned for conversion",
  "Chat widget auto-response automation",
  "Quote form auto-response automation",
  "Missed Call Text Back",
  "Google 5-star review automation",
  "Past customers into repeat clients automation",
  "Facebook Ads management (ad spend paid to Facebook separately)",
];

const Pricing = () => {
  const handleGetStarted = () => {
    window.open("https://api.juniesystems.com/payment-link/6a1449533f4eb69bef72fb1f", "_blank");
  };

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary border-primary/40">One Simple Plan</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground">
            Everything you need to
            <span className="bg-gradient-hero bg-clip-text text-transparent"> grow your business.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No long-term contracts. Just results.
          </p>
        </div>

        <div className="max-w-xl mx-auto">
          <Card className="relative border-primary/60 shadow-elegant bg-card">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
            </div>

            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-10">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                  Junie Full System
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl sm:text-6xl font-bold text-foreground">$349</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The complete Job Engine™ for contractors — website, automations, reviews, and Facebook Ads.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-4 sm:px-6 pb-8">
              <ul className="space-y-4">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-base text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button className="w-full h-12" variant="hero" onClick={handleGetStarted}>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Facebook ad spend is billed by Facebook directly and is not included in the $349/mo.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span>✓ No setup fees</span>
            <span>✓ Cancel anytime</span>
            <span>✓ 30-day money-back guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
