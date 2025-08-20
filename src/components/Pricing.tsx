import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "Perfect for small business and solo owners who need Availabee to answer calls when they can't.",
      features: [
        "Unlimited minutes",
        "Message taking with custom questions", 
        "Smart spam detection",
        "Bilingual agent - English + Spanish",
        "Call recording & transcription",
        "Real-time notifications"
      ],
      popular: false,
      ctaText: "Get Started for Free"
    },
    {
      name: "Scale", 
      price: "$149",
      period: "/month",
      description: "Perfect for growing businesses that want Availabee to answer calls and take action on their behalf.",
      features: [
        "Everything in Professional",
        "Appointment scheduling",
        "Call transfers",
        "Send texts during call",
        "CRM integrations",
        "Advanced analytics",
        "Priority support"
      ],
      popular: true,
      ctaText: "Get Started for Free"
    },
    {
      name: "Growth",
      price: "$299", 
      period: "/month",
      description: "Perfect for more complex businesses that require additional agent training to handle their calls.",
      features: [
        "Everything in Scale",
        "Live transfers (Coming Soon)",
        "Training files & custom knowledge",
        "Multiple phone numbers",
        "Team collaboration tools",
        "White-label options",
        "Dedicated success manager"
      ],
      popular: false,
      ctaText: "Get Started for Free"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">Simple, transparent pricing</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Get your AI answering service 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> today</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Free for the first 30 minutes. No credit card required to start. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 ${
                plan.popular ? 'border-primary shadow-lg scale-105' : 'border-border/50'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  {plan.ctaText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 space-y-4">
          <p className="text-muted-foreground">
            All plans include 30 free minutes to get started. No setup fees or hidden costs.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span>✓ 24/7 AI answering service</span>
            <span>✓ Instant setup in minutes</span>
            <span>✓ Cancel anytime</span>
            <span>✓ Money-back guarantee</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;