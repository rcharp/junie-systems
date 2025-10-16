import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RotatingText from "./RotatingText";

const Hero = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Redirect to onboarding with email
    navigate(`/onboarding?email=${encodeURIComponent(email)}`);
  };
  return (
    <section className="relative min-h-screen bg-gradient-subtle pt-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10 pointer-events-none" />

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 items-center animate-slide-up">
          {/* Left Column - Text Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="space-y-4 sm:space-y-6">
              <h1>
                <RotatingText words={["lead", "sale", "call", "appointment", "customer"]} className="text-primary" />
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0 px-2 sm:px-0">
                Transform missed calls into business opportunities. Junie is an intelligent AI receptionist that answers
                every call professionally, captures leads, and ensures you never lose a potential customer again.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-lg mx-auto lg:mx-0 px-4 sm:px-0"
            >
              <Input
                type="email"
                placeholder="Enter your business email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 h-12 sm:h-14 text-sm sm:text-base px-4 sm:px-6 border-2 border-border/50 focus:border-primary shadow-elegant"
              />
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="group min-w-[140px] sm:min-w-[160px] h-12 sm:h-14 text-sm sm:text-base"
              >
                Get Started for Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground px-4 sm:px-0">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                <span>First 30 minutes completely free</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-success flex-shrink-0" />
                <span>No credit card required to start</span>
              </div>
            </div>
          </div>

          {/* Right Column - Phone Image */}
          <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="relative max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
              <img
                src="/lovable-uploads/junie-hero-phone.png"
                alt="Junie AI answering service interface showing customer Olivia Wilson booking an air conditioning appointment with automatic AI responses"
                className="w-full h-auto"
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
