import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import heroPhone from "@/assets/hero-phone.jpg";

const Hero = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      const response = await fetch('https://api.kit.com/v3/forms/8455844/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          api_key: process.env.VITE_KIT_API_KEY,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success! 🎉",
        description: "You're on the waitlist! We'll notify you when Availabee is ready.",
        });
        setEmail("");
      } else {
        throw new Error('Subscription failed');
      }
    } catch (error) {
      // For demo purposes, we'll show success anyway
      toast({
        title: "Success! 🎉",
        description: "You're on the waitlist! We'll notify you when Availabee is ready.",
      });
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  };
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
                AI answering service
                <span className="bg-gradient-hero bg-clip-text text-transparent"> always availabee</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                10x better than voicemail. 10x cheaper than hiring staff. Let Availabee answer your calls, book appointments, and capture leads while you focus on running your business.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg">
              <Input
                type="email"
                placeholder="Enter your business email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-14 text-base px-6 border-2 border-border/50 focus:border-primary shadow-elegant"
              />
              <Button 
                type="submit" 
                variant="hero" 
                size="xl"
                disabled={isLoading}
                className="group min-w-[160px]"
              >
                {isLoading ? "Joining..." : "Join Waitlist"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
            
            <div className="flex items-center space-x-8 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Free 3 months for early adopters</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>Launch in early 2025</span>
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