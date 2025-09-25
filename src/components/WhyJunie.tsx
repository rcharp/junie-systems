import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Bell, MessageSquare, FileText } from "lucide-react";

const WhyJunie = () => {
  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Next-generation AI voice technology",
      description: "Powered by advanced conversational AI that understands context, handles complex requests, and provides a superior customer experience."
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Stay connected to your business",
      description: "Receive instant notifications via text and email for every call. Stay informed and respond to urgent matters immediately, even when you're away."
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Intelligent information gathering",
      description: "Configure exactly what information matters most for your business. Junie asks the right questions and captures complete, actionable details from every caller."
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Complete call documentation",
      description: "Access detailed call recordings, AI-generated transcripts, and organized conversation summaries all in one convenient dashboard."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">Why Junie</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Built specifically for 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> growing businesses</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Intelligent call handling that grows with your business and adapts to your unique needs.
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

export default WhyJunie;