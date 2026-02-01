import { Badge } from "@/components/ui/badge";
import industryHvac from "@/assets/industry-hvac.jpg";
import industryPlumbing from "@/assets/industry-plumbing.jpg";
import industryRoofing from "@/assets/industry-roofing.jpg";
import industryElectrical from "@/assets/industry-electrical.jpg";
import industryLandscaping from "@/assets/industry-landscaping.jpg";

const IndustriesServed = () => {
  const industries = [
    { name: "Roofing", image: industryRoofing },
    { name: "HVAC", image: industryHvac },
    { name: "Plumbing", image: industryPlumbing },
    { name: "Electrician", image: industryElectrical },
    { name: "Landscaping", image: industryLandscaping },
  ];

  const additionalTrades = [
    "Painting",
    "Pest Control", 
    "Moving",
    "Handyman",
    "General Contractor",
    "Flooring",
    "Fencing",
    "Concrete",
    "Garage Doors",
    "Pool & Spa"
  ];

  return (
    <section id="industries" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Who We Help</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Built for contractors 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> like you</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            We specialize in home service businesses. If you work with your hands, we work with you.
          </p>
        </div>

        {/* Featured Industries with Images */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
          {industries.map((industry, index) => (
            <div 
              key={index} 
              className="group relative overflow-hidden rounded-2xl aspect-square hover:shadow-elegant hover:-translate-y-2 transition-all duration-300"
            >
              <img 
                src={industry.image} 
                alt={industry.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-4 left-4 text-white font-semibold text-lg">
                {industry.name}
              </span>
            </div>
          ))}
        </div>

        {/* Additional Trades */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {additionalTrades.map((trade, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="px-4 py-2 text-sm hover:bg-primary hover:text-primary-foreground transition-colors cursor-default"
            >
              {trade}
            </Badge>
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
