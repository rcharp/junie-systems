import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const Pricing = () => {
  const handleBookCall = () => {
    window.open("https://calendly.com/admin-juniesystems/30min", "_blank");
  };
  
  const features = [
    "Custom Multi-Page Website (10-20 pages)",
    "Smart Lead Follow-Up Automation",
    "Instant Missed Call Text Response",
    "5-Star Review Generation System"
  ];

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Simple Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            One plan. 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> Everything you need.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No long-term contracts. Just results.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <Card className="relative group hover:shadow-elegant transition-all duration-300 border-primary shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">Best Value</Badge>
            </div>
            
            <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-8 sm:pt-10">
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                  Complete Marketing System
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
                {features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-base text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Button 
                className="w-full h-12"
                variant="hero"
                onClick={handleBookCall}
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12 space-y-4">
          <p className="text-muted-foreground">
            Not sure if this is right for you? <span className="text-primary font-medium cursor-pointer hover:underline" onClick={handleBookCall}>Book a free strategy call</span>
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
