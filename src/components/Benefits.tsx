import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, PhoneOff, DollarSign } from "lucide-react";

const Benefits = () => {
  const benefits = [
    {
      icon: <Phone className="w-12 h-12" />,
      title: "Capture every business opportunity",
      description: "Your AI assistant is available 24/7, ensuring no potential customer goes unanswered. Turn every call into a chance to grow your business."
    },
    {
      icon: <PhoneOff className="w-12 h-12" />,
      title: "Real conversations, not voicemail",
      description: "Customers prefer talking to someone who can help immediately. Availabee engages callers in natural conversation and captures detailed messages you actually need."
    },
    {
      icon: <DollarSign className="w-12 h-12" />,
      title: "Enterprise quality at startup prices",
      description: "Get professional call handling that rivals expensive call centers at a fraction of the cost. Pay for results, not overhead."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold">
            Transform every missed call into a 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> business opportunity</span>
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