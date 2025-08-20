import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, DollarSign } from "lucide-react";

const Benefits = () => {
  const benefits = [
    {
      icon: <Phone className="w-12 h-12" />,
      title: "Never miss another call or opportunity",
      description: "Availabee is there anytime you're not available. You'll never miss another opportunity just because you can't answer the phone."
    },
    {
      icon: <PhoneOff className="w-12 h-12" />,
      title: "No more hangups on voicemail",
      description: "No one leaves a voicemail anymore. But everyone talks to Availabee. She'll answer the phone, take a message for you, and send it your way."
    },
    {
      icon: <DollarSign className="w-12 h-12" />,
      title: "10x cheaper than an answering service",
      description: "There's no need to spend a bunch of money on an outsourced answering service. Availabee can do it for you for a fraction of the cost."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold">
            Never miss an opportunity because you 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> can't answer the phone</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 text-center">
              <CardContent className="pt-8 pb-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-4 rounded-full bg-gradient-hero text-white group-hover:shadow-glow transition-all duration-300">
                    {benefit.icon}
                  </div>
                  <h3 className="text-xl font-bold">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;