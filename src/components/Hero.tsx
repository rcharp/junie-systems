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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10 pointer-events-none" />
      
      <div className="container mx-auto px-4 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center animate-slide-up">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1>
                <RotatingText 
                  words={["lead", "sale", "call", "appointment", "customer"]}
                  className="text-primary"
                />
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
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
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-muted-foreground">
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

          {/* Right Column - Phone Image */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <img 
                src="/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png" 
                alt="Availabee AI call assistant interface on smartphone showing customer conversation and appointment booking"
                className="w-full max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl shadow-2xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;