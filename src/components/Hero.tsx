import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RotatingText from "./RotatingText";


const Hero = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);

    try {
      // Use the kit-subscribe edge function for secure API key handling
      const response = await fetch('/api/kit-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
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
      toast({
        title: "Error",
        description: "Failed to join waitlist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <section className="relative min-h-screen bg-gradient-subtle pt-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-32">
        <div className="grid lg:grid-cols-3 gap-12 items-center animate-slide-up">
          {/* Left Column - Text Content */}
          <div className="space-y-8 text-center lg:text-left lg:col-span-2">
            <div className="space-y-6">
              <h1>
                <RotatingText 
                  words={["lead", "sale", "call", "appointment", "customer"]}
                  className="text-primary"
                />
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Transform missed calls into business opportunities. Our intelligent AI receptionist answers every call professionally, captures leads, and ensures you never lose a potential customer again.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto lg:mx-0">
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
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>First 30 minutes completely free</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span>No credit card required to start</span>
              </div>
            </div>
          </div>

          {/* Right Column - Phone Image */}
          <div className="lg:flex lg:justify-end lg:col-span-1">
            <div className="relative flex justify-center lg:block">
              <img 
                src="/lovable-uploads/62b4af60-ae09-4e9c-b770-04925e6bb2f8.png" 
                alt="Availabee call assistant interface on smartphone showing customer conversation and appointment booking for air conditioning service"
                className="w-80 sm:w-96 lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-auto lg:mx-0"
              />
              <div className="absolute inset-0 from-primary/20 to-transparent rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;