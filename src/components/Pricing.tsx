import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const presenceFeatures = [
  "Complete website redesigned for conversion",
  "Google My Business setup & optimization",
  "QR code for Google reviews",
];

const allFeatures = [
  "Complete website redesigned for conversion",
  "Chat widget auto-response automation",
  "Quote form auto-response automation",
  "Missed Call Text Back",
  "Google 5-star review automation",
  "Past customers into repeat clients automation",
];

const Pricing = () => {

  const handlePresence = () => {
    window.open("https://api.juniesystems.com/payment-link/69d31ba9c6a0e600f4d07b2f", "_blank");
  };

  const handleComplete = () => {
    window.open("https://buy.stripe.com/7sYeVc1VpeiedFMbrF8g003", "_blank");
  };

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Simple Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Choose the plan that fits
            <span className="bg-gradient-hero bg-clip-text text-transparent"> your business.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No long-term contracts. Just results.
          </p>
        </div>

        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Junie Presence */}
          <Card className="relative group hover:shadow-elegant transition-all duration-300 border-border">
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-8 sm:pt-10">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                  Junie Presence
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl sm:text-6xl font-bold text-foreground">$97</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Get your business online with a conversion-optimized website.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
              <ul className="space-y-4">
                {presenceFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-base text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full h-12"
                variant="outline"
                onClick={handlePresence}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Complete Marketing System */}
          <Card className="relative group hover:shadow-elegant transition-all duration-300 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
            </div>

            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-8 sm:pt-10">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                  Junie Full System
                </h3>
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl sm:text-6xl font-bold text-foreground">$297</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Everything you need to grow your home service business online.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8">
              <ul className="space-y-4">
                {allFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-base text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full h-12"
                variant="hero"
                onClick={handleComplete}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 space-y-4">
          <p className="text-muted-foreground">
            Not sure if this is right for you? <span className="text-primary font-medium cursor-pointer hover:underline" onClick={handleComplete}>Get started for free</span>
          </p>
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
