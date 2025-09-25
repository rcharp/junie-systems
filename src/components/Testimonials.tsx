import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      quote: "As someone with 50 years of business experience, I've hired many live receptionists and used answering services over the years. One of the biggest challenges I faced was inconsistency in customer interactions, high costs, and employee turnover. After using Junie, I fired my live answering service yesterday because Junie provides more accuracy, faster responses, and 24/7 availability—all at a fraction of the cost.",
      name: "James Hanner",
      title: "Owner Southern Indiana Driving School",
      image: "/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png"
    },
    {
      quote: "My colleagues in the industry call our number and talk to Junie and they can't believe how good it is. I've already recommended two friends to Junie.",
      name: "Classic City Transportation",
      title: "Owner",
      image: "/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png"
    },
    {
      quote: "Junie is the real deal. We've tried all the others and Junie is the only one that is easy to set up and sounds so realistic.",
      name: "Crunch Fitness",
      title: "Franchisee",
      image: "/lovable-uploads/6c473fae-e0b3-44ab-bb60-c373e617ab26.png"
    }
  ];

  return (
    <section className="py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <Badge variant="outline" className="text-primary">What Our Customers Say</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold">
            Real businesses, 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> real results</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50 relative">
              <CardContent className="pt-8 pb-6">
                <div className="space-y-6">
                  <Quote className="w-8 h-8 text-primary opacity-50" />
                  <blockquote className="text-muted-foreground leading-relaxed italic">
                    "{testimonial.quote}"
                  </blockquote>
                  <div className="flex items-center space-x-4">
                    <img 
                      src={testimonial.image}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;