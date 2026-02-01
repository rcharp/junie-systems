import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Star } from "lucide-react";

const Hero = () => {
  const handleBookCall = () => {
    // Replace with your actual booking link (Calendly, Cal.com, etc.)
    window.open("https://calendly.com/your-link", "_blank");
  };

  return (
    <section className="relative min-h-screen bg-gradient-subtle pt-20 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_50%)] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent))_0%,transparent_50%)] opacity-10 pointer-events-none" />

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center animate-slide-up">
          {/* Left Column - Text Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="space-y-4 sm:space-y-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Website Design & 
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Marketing Systems</span>
                <br />For Contractors
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Cut the BS. Marketing isn't rocket science. We give you the tools to win — 
                you just need to commit to using them. No magic solutions, just systems that work.
              </p>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-gradient-hero border-2 border-background flex items-center justify-center text-primary-foreground text-xs font-bold"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-muted-foreground">100+ contractors served</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto lg:mx-0">
              <Button
                onClick={handleBookCall}
                variant="hero"
                size="lg"
                className="group min-w-[180px] h-14 text-base"
              >
                Book A Call
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14 text-base"
                asChild
              >
                <a href="tel:+1234567890">
                  <Phone className="w-5 h-5 mr-2" />
                  (123) 456-7890
                </a>
              </Button>
            </div>

            {/* Review Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4">
              <div className="flex items-center gap-2">
                <img 
                  src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" 
                  alt="Google" 
                  className="h-6 object-contain"
                />
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-muted-foreground">Facebook</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Image */}
          <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="relative max-w-md lg:max-w-lg xl:max-w-xl">
              <img
                src="/lovable-uploads/junie-hero-phone.png"
                alt="Marketing dashboard showing contractor website and lead management"
                className="w-full h-auto rounded-2xl shadow-elegant"
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
