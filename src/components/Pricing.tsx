import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const Pricing = () => {
  const handleBookCall = () => {
    window.open("https://calendly.com/your-link", "_blank");
  };
  
  const plans = [
    {
      name: "Starter",
      price: "$497",
      period: "/month",
      description: "Perfect for contractors just getting started with online marketing.",
      features: [
        "Professional contractor website",
        "Mobile-optimized design",
        "Missed call text-back automation",
        "Basic Google Business optimization",
        "Monthly performance report",
        "Email support"
      ],
      popular: false,
      ctaText: "Get Started"
    },
    {
      name: "Growth", 
      price: "$997",
      period: "/month",
      description: "For contractors ready to dominate their local market.",
      features: [
        "Everything in Starter, plus:",
        "5-Star review funnel system",
        "One-click marketing campaigns",
        "GoHighLevel CRM setup",
        "Automated follow-up sequences",
        "Local SEO optimization",
        "Priority support",
        "Monthly strategy call"
      ],
      popular: true,
      ctaText: "Get Started"
    },
    {
      name: "Scale", 
      price: "$1,997",
      period: "/month",
      description: "Full-service marketing for contractors ready to scale.",
      features: [
        "Everything in Growth, plus:",
        "Custom landing pages",
        "Paid ads management",
        "Advanced automation workflows",
        "Reputation management",
        "Dedicated account manager",
        "Weekly strategy calls",
        "Custom integrations"
      ],
      popular: false,
      ctaText: "Book a Call"
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Simple Pricing</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Invest in your 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> growth</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            No hidden fees. No long-term contracts. Just results.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 flex flex-col h-full ${
                plan.popular ? 'border-primary shadow-lg md:scale-105' : 'border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-6 sm:pt-8">
                <div className="space-y-2">
                  <h3 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-foreground">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl sm:text-5xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 px-4 sm:px-6 pb-6 sm:pb-8 flex flex-col flex-1">
                <ul className="space-y-3 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full h-12"
                  variant={plan.popular ? "hero" : "default"}
                  onClick={handleBookCall}
                >
                  {plan.ctaText}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 space-y-4">
          <p className="text-muted-foreground">
            Not sure which plan is right for you? <span className="text-primary font-medium cursor-pointer hover:underline" onClick={handleBookCall}>Book a free strategy call</span>
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
