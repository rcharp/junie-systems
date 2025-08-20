import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Bell, MessageSquare, FileText } from "lucide-react";

const WhyAvailabee = () => {
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Amazing human-like AI to answer your phone",
      description: "You'll outshine your competition with the most modern AI voice tech."
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Get notified right away",
      description: "Availabee will email and/or text you every time a new call comes in, so you can quickly decide how best to handle it."
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Custom message taking",
      description: "You determine the most important information that your business needs in a message, and Availabee will make sure to get it from your callers."
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Recordings, transcripts, call management",
      description: "Every call is recorded and transcribed for you in your inbox."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">Why Availabee</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Why Availabee is right for 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> your small business</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            The power of the latest AI tech, working for you 24/7.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 rounded-lg bg-gradient-hero text-white group-hover:shadow-glow transition-all duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-semibold">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyAvailabee;