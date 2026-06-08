import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star } from "lucide-react";
import junieRobot from "@/assets/junie-bot.png.asset.json";
import headshot1 from "@/assets/headshot-1.jpg";
import headshot2 from "@/assets/headshot-2.jpg";
import headshot3 from "@/assets/headshot-3.jpg";
import headshot4 from "@/assets/headshot-4.jpg";
import headshot5 from "@/assets/headshot-5.jpg";

const headshots = [headshot1, headshot2, headshot3, headshot4, headshot5];

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-gradient-subtle pt-20 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-glow))_0%,transparent_55%)] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_80%,hsl(var(--accent))_0%,transparent_55%)] opacity-15 pointer-events-none" />

      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center animate-slide-up">
          {/* Left Column - Text Content */}
          <div className="space-y-6 sm:space-y-8 text-center lg:text-left">
            <div className="space-y-4 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs sm:text-sm font-semibold uppercase tracking-wider">
                The Job Engine™ for Contractors
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                While you do the work,
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Junie books the next one.</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                One system that captures leads, follows up with AI, books appointments, and turns happy customers into 5-star reviews — all on autopilot.
              </p>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {headshots.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Happy customer ${i + 1}`}
                      className="w-8 h-8 rounded-full border-2 border-background object-cover"
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">100+ contractors served</span>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto lg:mx-0">
              <Button
                onClick={() => navigate("/grow")}
                variant="hero"
                size="lg"
                className="group min-w-[180px] h-14 text-base"
              >
                Get Started Today
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Review Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-4">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Google</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Facebook</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Junie Robot */}
          <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="relative max-w-md lg:max-w-lg xl:max-w-xl w-full">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary-glow))_0%,transparent_70%)] opacity-40 blur-2xl" />
              <img
                src={junieRobot.url}
                alt="Junie — the Job Engine for contractors"
                className="relative w-full h-auto drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

