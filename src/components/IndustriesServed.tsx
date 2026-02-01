import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  Flame, 
  Droplets, 
  Zap, 
  Trees, 
  Home, 
  Paintbrush,
  Bug,
  Truck,
  Hammer
} from "lucide-react";

const IndustriesServed = () => {
  const industries = [
    { name: "Roofing", icon: <Home className="w-8 h-8" /> },
    { name: "HVAC", icon: <Flame className="w-8 h-8" /> },
    { name: "Plumbing", icon: <Droplets className="w-8 h-8" /> },
    { name: "Electrician", icon: <Zap className="w-8 h-8" /> },
    { name: "Landscaping", icon: <Trees className="w-8 h-8" /> },
    { name: "Painting", icon: <Paintbrush className="w-8 h-8" /> },
    { name: "Pest Control", icon: <Bug className="w-8 h-8" /> },
    { name: "Moving", icon: <Truck className="w-8 h-8" /> },
    { name: "Handyman", icon: <Wrench className="w-8 h-8" /> },
    { name: "General Contractor", icon: <Hammer className="w-8 h-8" /> }
  ];

  return (
    <section id="industries" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Industries We Serve</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Serving all these trades 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> and more</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            We specialize in home service businesses. If you work with your hands, we work with you.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {industries.map((industry, index) => (
            <div 
              key={index} 
              className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-elegant hover:-translate-y-2 transition-all duration-300"
            >
              <div className="p-3 rounded-xl bg-gradient-hero text-white mb-3 group-hover:shadow-glow transition-all duration-300">
                {industry.icon}
              </div>
              <span className="text-sm sm:text-base font-medium text-foreground text-center">
                {industry.name}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            Don't see your trade? <a href="#contact" className="text-primary hover:underline font-medium">Contact us</a> — we probably work with you too!
          </p>
        </div>
      </div>
    </section>
  );
};

export default IndustriesServed;
