import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Calendar, 
  MessageSquare, 
  Clock, 
  TrendingUp,
  Zap,
  Brain,
  Search
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: <Phone className="w-8 h-8" />,
      title: "24/7 Call Answering",
      description: "Never miss a call again. Our AI answers instantly, capturing every lead and opportunity.",
      badge: "Always On"
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Smart Appointment Booking",
      description: "Automatically schedule appointments and sync with your calendar. No back-and-forth required.",
      badge: "Automated"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Lead Qualification",
      description: "Pre-qualify leads with intelligent questions and route urgent calls to you instantly.",
      badge: "AI-Powered"
    },
    {
      icon: <Brain className="w-8 h-8" />,
      title: "Natural Conversations",
      description: "Advanced AI that sounds human, understands context, and adapts to your business needs.",
      badge: "Human-Like"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Instant Notifications",
      description: "Get real-time alerts via SMS or email for important calls and bookings.",
      badge: "Real-Time"
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Call Analytics",
      description: "Detailed insights and reports to understand your call patterns and optimize performance.",
      badge: "Insights"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Instant Setup",
      description: "Get started in minutes with our simple setup wizard. No technical expertise required.",
      badge: "Easy Setup"
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "SEO Optimization",
      description: "Boost your online visibility with AI-generated, SEO-optimized content that helps customers find you.",
      badge: "Growth"
    }
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16 px-4 sm:px-0">
          <Badge variant="outline" className="text-primary">Features</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-muted-foreground leading-tight">
            Everything you need to 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> never miss a call</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Junie combines cutting-edge AI with business intelligence to create the perfect virtual receptionist for your company.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-4 sm:px-0">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50">
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-gradient-hero text-white group-hover:shadow-glow transition-all duration-300">
                    {feature.icon}
                  </div>
                  <Badge variant="secondary" className="text-xs">{feature.badge}</Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl font-medium text-muted-foreground leading-tight">{feature.title}</CardTitle>
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

export default Features;