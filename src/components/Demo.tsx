import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Volume2, MessageSquare, Calendar, CheckCircle } from "lucide-react";
import dashboardPreview from "@/assets/dashboard-preview.jpg";

const Demo = () => {
  const demoScenarios = [
    {
      title: "Scheduling a consultation",
      description: "Customer calls to book a business consultation",
      badge: "Sales Call",
      color: "text-success"
    },
    {
      title: "Emergency service request",
      description: "Urgent plumbing issue needs immediate attention",
      badge: "Urgent",
      color: "text-destructive"
    },
    {
      title: "General inquiry",
      description: "Questions about services and pricing",
      badge: "Info Request",
      color: "text-primary"
    },
    {
      title: "Follow-up appointment",
      description: "Existing customer rescheduling their appointment",
      badge: "Existing Client",
      color: "text-accent"
    }
  ];

  return (
    <section id="demo" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">Live Demo</Badge>
          <h2 className="text-4xl lg:text-5xl font-semibold text-muted-foreground">
            See Junie 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> in action</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Listen to real conversations handled by our AI. Each call is perfectly managed, 
            with leads captured and appointments booked automatically.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {demoScenarios.map((scenario, index) => (
              <Card key={index} className="group hover:shadow-elegant transition-all duration-300 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Button size="icon" variant="outline" className="rounded-full">
                        <Play className="w-4 h-4" />
                      </Button>
                      <div>
                        <CardTitle className="text-lg">{scenario.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className={scenario.color}>
                      {scenario.badge}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Volume2 className="w-4 h-4" />
                      <span>2:15</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>Lead captured</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>Appointment set</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card className="bg-gradient-subtle border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-full bg-success/10">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg text-muted-foreground">100% Success Rate</h3>
                    <p className="text-muted-foreground">Every demo call results in a captured lead or booked appointment</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-elegant">
              <img 
                src={dashboardPreview}
                alt="Junie dashboard showing call analytics and performance metrics"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4">
                  <h4 className="font-medium text-lg mb-2 text-muted-foreground">Real-time Analytics</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-2xl font-bold text-success">247</div>
                      <div className="text-muted-foreground">Calls Today</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">89%</div>
                      <div className="text-muted-foreground">Conversion</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-accent">156</div>
                      <div className="text-muted-foreground">Appointments</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Demo;