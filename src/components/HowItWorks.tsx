import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, Phone, MessageSquare } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: <Settings className="w-8 h-8" />,
      step: "STEP 1",
      title: "Connect your business line",
      description: "Set up call transfer from your existing business number to Junie in under 5 minutes. No new phone system required."
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      step: "STEP 2", 
      title: "Train your AI assistant",
      description: "Configure Junie with your business information, FAQs, appointment booking rules, and preferred communication style."
    },
    {
      icon: <Phone className="w-8 h-8" />,
      step: "STEP 3",
      title: "Customize call handling",
      description: "Set when Junie should answer, what information to collect, and how to route urgent calls to you."
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      step: "STEP 4",
      title: "Never miss another call",
      description: "Junie handles incoming calls 24/7, captures leads, schedules appointments, and transfers urgent matters instantly via text or email."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16 px-4 sm:px-0">
          <Badge variant="outline" className="text-primary">How it Works</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-muted-foreground leading-tight">
            Powerful, yet super easy to 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> set up and get started</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Get started in minutes with our simple setup process.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 px-4 sm:px-0">
          {steps.map((step, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 relative">
              <CardContent className="pt-6 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-6 text-center">
                <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                  <div className="p-3 sm:p-4 rounded-full bg-gradient-hero text-white group-hover:shadow-glow transition-all duration-300">
                    {step.icon}
                  </div>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {step.step}
                    </Badge>
                    <h3 className="text-base sm:text-lg font-medium leading-tight text-muted-foreground">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;