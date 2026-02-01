import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react";
import heroContractor from "@/assets/hero-contractor.jpg";
import heroPlumber from "@/assets/hero-plumber.jpg";
import heroHvac from "@/assets/hero-hvac.jpg";
import heroRoofer from "@/assets/hero-roofer.jpg";
import heroElectrician from "@/assets/hero-electrician.jpg";
import heroLandscaper from "@/assets/hero-landscaper.jpg";
import headshot1 from "@/assets/headshot-1.jpg";
import headshot2 from "@/assets/headshot-2.jpg";
import headshot3 from "@/assets/headshot-3.jpg";
import headshot4 from "@/assets/headshot-4.jpg";
import headshot5 from "@/assets/headshot-5.jpg";

const heroImages = [
  { src: heroContractor, alt: "General contractor at construction site" },
  { src: heroPlumber, alt: "Professional plumber at work" },
  { src: heroHvac, alt: "HVAC technician installing AC unit" },
  { src: heroRoofer, alt: "Roofers installing shingles" },
  { src: heroElectrician, alt: "Electrician working on electrical panel" },
  { src: heroLandscaper, alt: "Landscaper trimming hedges" },
];

const headshots = [headshot1, headshot2, headshot3, headshot4, headshot5];

const Hero = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  };

  const handleBookCall = () => {
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
                Close More Jobs.
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Grow Your Business.</span>
                <br />Work Less.
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                We build the websites and automation systems that help home service pros capture more leads, follow up faster, and turn more calls into booked jobs.
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
                onClick={handleBookCall}
                variant="hero"
                size="lg"
                className="group min-w-[180px] h-14 text-base"
              >
                Book A Call
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

          {/* Right Column - Hero Image Carousel */}
          <div className="flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="relative max-w-md lg:max-w-lg xl:max-w-xl w-full">
              {/* Carousel Container */}
              <div className="relative overflow-hidden rounded-2xl shadow-elegant aspect-[4/3]">
                {heroImages.map((image, index) => (
                  <img
                    key={index}
                    src={image.src}
                    alt={image.alt}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
                      index === currentIndex ? "opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
              </div>

              {/* Navigation Arrows */}
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-all"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-md transition-all"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {heroImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex 
                        ? "bg-primary w-6" 
                        : "bg-background/60 hover:bg-background/80"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
