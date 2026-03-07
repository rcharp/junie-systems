import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const features = [
  "Complete website redesign (included)",
  "Chat widget auto-response automation",
  "Quote form auto-response automation",
  "Missed Call Text Back",
  "Google 5-star review automation",
  "Past customers into repeat clients automation",
];

const TrialPage = () => {
  const handleGetStarted = () => {
    window.open("https://buy.stripe.com/7sYeVc1VpeiedFMbrF8g003", "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="text-primary">Start Your Free Trial</Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              Grow your business with the
              <span className="bg-gradient-hero bg-clip-text text-transparent"> Complete Marketing System.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              No hidden fees. No long-term contracts. Just results.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <Card className="relative border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
              </div>

              <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-8 sm:pt-10">
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                    Complete Marketing System
                  </h2>
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
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-base text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full h-12"
                  variant="hero"
                  onClick={handleGetStarted}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <div className="text-center mt-8">
              <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <span>✓ No setup fees</span>
                <span>✓ Cancel anytime</span>
                <span>✓ 30-day money-back guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TrialPage;
