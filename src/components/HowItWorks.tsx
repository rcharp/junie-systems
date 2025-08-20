import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, Phone, MessageSquare } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: <Settings className="w-8 h-8" />,
      step: "STEP 1",
      title: "Train Availabee on your business",
      description: "Use your Google Business profile, website address or simple business information to get started."
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      step: "STEP 2", 
      title: "Confirm Availabee has things right",
      description: "Availabee will be trained on your specific business information. Make adjustments, add questions you want asked when taking a message, and more."
    },
    {
      icon: <Phone className="w-8 h-8" />,
      step: "STEP 3",
      title: "Forward your calls to Availabee",
      description: "No need to change your existing business number. Just forward calls to Availabee when you want her to answer."
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      step: "STEP 4",
      title: "Availabee answers your calls and takes messages",
      description: "When a call comes in, Availabee will answer the call, answer questions, and take a message according to your needs. You'll then be notified by email and/or text, and every call recording and transcript is saved in your calls inbox."
    }
  ];

  return (
    <section className="py-20 bg-background">
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