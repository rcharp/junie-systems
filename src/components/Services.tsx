import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, 
  Star, 
  MessageSquare, 
  Zap,
  RefreshCw
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: <Globe className="w-10 h-10" />,
      title: "Professional Website",
      subtitle: "Your 24/7 digital storefront",
      description: "A clean, professional website built to turn visitors into customers. Optimized for mobile and designed to make your business look as good online as your work does in person.",
      features: [
        "10-20 custom pages for your business",
        "Mobile-first design for on-the-go customers",
        "Fast loading speeds",
        "Easy-to-update content"
      ]
    },
    {
      icon: <Zap className="w-10 h-10" />,
      title: "Automated Lead Follow-Up",
      subtitle: "Stay top of mind automatically",
      description: "When a lead comes in, time matters. Our automation sends the right message at the right time — so you never lose a job because you were too busy to respond.",
      features: [
        "Instant lead notifications",
        "Automated text & email sequences",
        "Appointment reminders",
        "Re-engagement campaigns"
      ]
    },
    {
      icon: <MessageSquare className="w-10 h-10" />,
      title: "Missed Call Text-Back",
      subtitle: "Turn missed calls into booked jobs",
      description: "Can't answer every call when you're on a ladder or under a sink? No problem. We'll instantly text them back so they know you're on it.",
      features: [
        "Instant automated response",
        "Keeps leads warm until you're free",
        "Works 24/7",
        "Customizable messages"
      ]
    },
    {
      icon: <Star className="w-10 h-10" />,
      title: "5-Star Google Review Automation",
      subtitle: "Build your Google reputation on autopilot",
      description: "After every job, we automatically ask your happy customers to leave a 5-star review on Google — so your business climbs the rankings without you lifting a finger.",
      features: [
        "Automated review requests after each job",
        "One-tap link makes it easy for customers",
        "Sends them straight to your Google listing",
        "Filters out unhappy customers before they go public"
      ]
    },
    {
      icon: <RefreshCw className="w-10 h-10" />,
      title: "Database Reactivation",
      subtitle: "Turn old leads into new revenue",
      description: "You've got past customers and old leads sitting in your contacts doing nothing. We reach back out to them with friendly, automated messages that bring them back and get them booking again.",
      features: [
        "Automatically re-engages past customers",
        "Sends personalized texts and emails on your behalf",
        "Warms up cold leads with a nurture sequence",
        "Turns forgotten contacts into paying jobs"
      ]
    }
  ];

  return (
    <section id="services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">What's Included</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Everything you need to 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> grow your business</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            A complete system designed specifically for home service professionals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {services.slice(0, 4).map((service, index) => (
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

        <div className="flex justify-center mt-6 sm:mt-8 max-w-5xl mx-auto">
          <Card className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 w-full md:w-[calc(50%-1rem)]">
            <CardContent className="pt-6 sm:pt-8 pb-6 px-4 sm:px-6">
              <div className="flex flex-col space-y-4">
                <div className="p-3 sm:p-4 rounded-xl bg-gradient-hero text-white w-fit group-hover:shadow-glow transition-all duration-300">
                  {services[4].icon}
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    {services[4].title}
                  </h3>
                  <p className="text-sm font-medium text-primary">
                    {services[4].subtitle}
                  </p>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {services[4].description}
                </p>
                <ul className="space-y-2 pt-2">
                  {services[4].features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary font-bold">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default Services;
