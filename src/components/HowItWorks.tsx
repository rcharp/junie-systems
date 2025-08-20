import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, Phone, MessageSquare } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: <Settings className="w-8 h-8" />,
      step: "STEP 1",
      title: "Connect your business line",
      description: "Set up call forwarding from your existing business number to Availabee in under 5 minutes. No new phone system required."
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      step: "STEP 2", 
      title: "Train your AI assistant",
      description: "Configure Availabee with your business information, FAQs, appointment booking rules, and preferred communication style."
    },
    {
      icon: <Phone className="w-8 h-8" />,
      step: "STEP 3",
      title: "Customize call handling",
      description: "Set when Availabee should answer, what information to collect, and how to route urgent calls to you."
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      step: "STEP 4",
      title: "Never miss another call",
      description: "Availabee handles incoming calls 24/7, captures leads, schedules appointments, and forwards urgent matters instantly via text or email."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">How it Works</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Powerful, yet super easy to 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> set up and get started</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get started in minutes with our simple setup process.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 relative">
              <CardContent className="pt-8 pb-6 text-center">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-gradient-hero text-white group-hover:shadow-glow transition-all duration-300">
                    {step.icon}
                  </div>
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {step.step}
                    </Badge>
                    <h3 className="text-lg font-semibold leading-tight">
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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