import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Play } from "lucide-react";
import heroPhone from "@/assets/hero-phone.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen bg-gradient-subtle pt-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10" />
      
      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                <span>Trusted by 500+ businesses</span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                AI answering service for
                <span className="bg-gradient-hero bg-clip-text text-transparent"> small businesses</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                10x better than voicemail. 10x cheaper than hiring staff. Let CallMind answer your calls, book appointments, and capture leads while you focus on running your business.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="xl" className="group">
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="outline" size="xl" className="group">
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Free 25 minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Setup in 5 minutes</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="relative z-10">
              <img 
                src={heroPhone} 
                alt="AI phone answering service interface" 
                className="w-full h-auto rounded-2xl shadow-elegant animate-float"
              />
            </div>
            
            {/* Floating cards */}
            <Card className="absolute -top-4 -left-4 p-4 bg-card/90 backdrop-blur-sm border-success/20 animate-float" style={{animationDelay: "1s"}}>
              <div className="text-success text-sm font-medium">📞 Call answered</div>
              <div className="text-xs text-muted-foreground">Lead captured automatically</div>
            </Card>
            
            <Card className="absolute -bottom-4 -right-4 p-4 bg-card/90 backdrop-blur-sm border-accent/20 animate-float" style={{animationDelay: "2s"}}>
              <div className="text-accent text-sm font-medium">📅 Appointment booked</div>
              <div className="text-xs text-muted-foreground">Calendar updated instantly</div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;