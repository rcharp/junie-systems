import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Industries = () => {
  const industries = [
    {
      name: "Home Services",
      image: "/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png"
    },
    {
      name: "Law Firms", 
      image: "/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png"
    },
    {
      name: "Property Management",
      image: "/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png"
    },
    {
      name: "Construction",
      image: "/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png"
    },
    {
      name: "Real Estate",
      image: "/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png"
    },
    {
      name: "Plumbing",
      image: "/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png"
    },
    {
      name: "Automotive",
      image: "/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png"
    },
    {
      name: "Salons",
      image: "/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png"
    }
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">Built for businesses like yours</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Perfect for businesses across 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> every industry</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {industries.map((industry, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="relative">
                  <img 
                    src={industry.image} 
                    alt={`${industry.name} industry`}
                    className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-semibold text-sm">
                      {industry.name}
                    </h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-muted-foreground">
            And many other small businesses that need to answer the phone...
          </p>
        </div>
      </div>
    </section>
  );
};

export default Industries;