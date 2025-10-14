import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { useState } from 'react';

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscriptionPlan, isLoading } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const planHierarchy: Record<string, number> = {
    'free': 0,
    'professional': 1,
    'scale': 2,
    'growth': 3
  };

  const getButtonConfig = (planName: string) => {
    // Explicit check: only show upgrade/downgrade if user exists
    const isUserLoggedIn = !!user;
    
    if (!isUserLoggedIn) {
      return { text: "Get Started for Free", disabled: false };
    }

    // If user is logged in but subscription is still loading, show loading state
    if (isLoading) {
      return { text: "Loading...", disabled: true };
    }

    const currentPlanTier = planHierarchy[subscriptionPlan];
    const targetPlanTier = planHierarchy[planName.toLowerCase()];

    if (currentPlanTier === targetPlanTier) {
      return { text: "Current Plan", disabled: true };
    } else if (targetPlanTier > currentPlanTier) {
      return { text: "Upgrade", disabled: false };
    } else {
      return { text: "Downgrade", disabled: false };
    }
  };
  
  const handleGetStarted = async (plan: string) => {
    // If user not logged in, redirect to signup
    if (!user) {
      navigate(`/signup?plan=${plan.toLowerCase()}`);
      return;
    }

    // For all plans, use direct Stripe links
    if (plan.toLowerCase() === 'professional') {
      setLoading(plan);
      try {
        window.top!.location.href = 'https://buy.stripe.com/eVqeVcdE78XU0T08ft8g000';
      } catch (e) {
        window.location.href = 'https://buy.stripe.com/eVqeVcdE78XU0T08ft8g000';
      }
      return;
    }

    if (plan.toLowerCase() === 'scale') {
      setLoading(plan);
      try {
        window.top!.location.href = 'https://buy.stripe.com/7sY9AScA32zw7ho8ft8g001';
      } catch (e) {
        window.location.href = 'https://buy.stripe.com/7sY9AScA32zw7ho8ft8g001';
      }
      return;
    }

    if (plan.toLowerCase() === 'growth') {
      setLoading(plan);
      try {
        window.top!.location.href = 'https://buy.stripe.com/28E8wOfMf4HEgRYfHV8g002';
      } catch (e) {
        window.location.href = 'https://buy.stripe.com/28E8wOfMf4HEgRYfHV8g002';
      }
      return;
    }

    // Fallback for any other plans
    setLoading(plan);
    try {
      console.log('Creating checkout session for plan:', plan);
      
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: { plan: plan.toLowerCase() },
      });

      console.log('Checkout response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data || !data.url) {
        throw new Error('No checkout URL returned');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Redirecting to Stripe checkout:', data.url);
      
      try {
        window.top!.location.href = data.url;
      } catch (e) {
        window.location.href = data.url;
      }
      
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };
  
  const plans = [
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "Ideal for entrepreneurs and small businesses who want professional call handling without the overhead.",
      features: [
        "Unlimited minutes",
        "Message taking with custom questions", 
        "Smart spam detection",
        "Call transcription",
        "Real-time notifications"
      ],
      popular: false,
      ctaText: "Get Started for Free"
    },
    {
      name: "Scale", 
      price: "$149",
      period: "/month",
      description: "Designed for expanding businesses that need advanced features and seamless integrations.",
      features: [
        "Everything in Professional",
        "Appointment scheduling",
        "Call transfers",
        "Send texts during call",
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
        "CRM integrations",
        "Team collaboration tools",
        "White-label options",
        "Dedicated success manager"
      ],
      popular: false,
      ctaText: "Get Started for Free"
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16 px-4 sm:px-0">
          <Badge variant="outline" className="text-primary">Simple, transparent pricing</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-muted-foreground leading-tight">
            Get your AI answering service 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> today</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Free for the first 30 minutes. No credit card required to start. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto px-4 sm:px-0">
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
              
              <CardHeader className="text-center pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-semibold uppercase tracking-wide text-muted-foreground">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-3xl sm:text-4xl font-medium text-muted-foreground">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col flex-1">
                <ul className="space-y-2 sm:space-y-3 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2 sm:gap-3">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-xs sm:text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-sm sm:text-base mt-auto"
                  size="lg"
                  disabled={getButtonConfig(plan.name).disabled || loading === plan.name}
                  onClick={() => !getButtonConfig(plan.name).disabled && handleGetStarted(plan.name)}
                >
                  {loading === plan.name ? 'Loading...' : getButtonConfig(plan.name).text}
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