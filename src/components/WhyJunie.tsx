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
        <div className="text-center space-y-4 mb-12 sm:mb-16 px-4 sm:px-0">
          <Badge variant="outline" className="text-primary">Why Junie</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Built specifically for 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> growing businesses</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Intelligent call handling that grows with your business and adapts to your unique needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto px-4 sm:px-0">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-gradient-hero text-white group-hover:shadow-glow transition-all duration-300 flex-shrink-0">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg sm:text-xl font-semibold leading-tight">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyJunie;