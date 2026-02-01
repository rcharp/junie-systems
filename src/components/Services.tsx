import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Star, 
  MessageSquare, 
  Megaphone, 
  Search,
  Zap
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: <Globe className="w-10 h-10" />,
      title: "Functional Website",
      subtitle: "Get a website that actually converts",
      description: "A website that instantly turns leads into text conversations that go DIRECTLY to your phone. No more lost opportunities.",
      features: [
        "Actually get found online",
        "Showcase your best reviews",
        "Mobile-friendly design (87% of visitors are on mobile)",
        "Optimized for local Google searches"
      ]
    },
    {
      icon: <Star className="w-10 h-10" />,
      title: "5-Star Review Funnel",
      subtitle: "Reviews on autopilot",
      description: "\"Sure I'll leave you a review\", but people forget. We'll 'gently' remind them until they remember. Five stars, every time.",
      features: [
        "5-star reviews only (bad reviews go elsewhere)",
        "Automatic follow-up reminders",
        "One-click review requests",
        "Stop worrying about bad reviews"
      ]
    },
    {
      icon: <MessageSquare className="w-10 h-10" />,
      title: "Missed Call Text Back",
      subtitle: "Never lose a lead again",
      description: "Everyone misses calls, but not everyone texts back. Be the one who does and outshine your competition.",
      features: [
        "Stand out from competition",
        "No more lost leads",
        "Show customers you care",
        "Available 24/7, even while you sleep"
      ]
    },
    {
      icon: <Megaphone className="w-10 h-10" />,
      title: "One-Click Marketing",
      subtitle: "Done-for-you campaigns",
      description: "Referrals and repeat customers are the best. Let's get you both with pre-built campaigns you can activate with one click.",
      features: [
        "Pre-built referral campaigns",
        "Return customer campaigns",
        "Marketing at your fingertips",
        "No marketing team needed"
      ]
    },
    {
      icon: <Search className="w-10 h-10" />,
      title: "Local SEO",
      subtitle: "Get found on Google",
      description: "\"Rank number one on Google in a week!\" Just kidding, SEO takes time... but we'll get you there the right way.",
      features: [
        "Qualified leads that actually answer",
        "Stop paying for tire-kickers",
        "Organic acquisition system",
        "Long-term sustainable growth"
      ]
    },
    {
      icon: <Zap className="w-10 h-10" />,
      title: "GoHighLevel CRM",
      subtitle: "All-in-one automation",
      description: "Everything you need to manage leads, follow up automatically, and close more deals — all in one platform.",
      features: [
        "Lead management & tracking",
        "Automated follow-up sequences",
        "Appointment scheduling",
        "Pipeline management"
      ]
    }
  ];

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Our Services</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Simple systems that 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> actually work</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            No degrees required, just a hard hat. We keep things simple because that's what works.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50">
              <CardContent className="pt-6 sm:pt-8 pb-6 px-4 sm:px-6">
                <div className="flex flex-col space-y-4">
                  <div className="p-3 sm:p-4 rounded-xl bg-gradient-hero text-white w-fit group-hover:shadow-glow transition-all duration-300">
                    {service.icon}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                      {service.title}
                    </h3>
                    <p className="text-sm font-medium text-primary">
                      {service.subtitle}
                    </p>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="space-y-2 pt-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary font-bold">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
