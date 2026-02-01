import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Mike S.",
      business: "Roofing Contractor",
      quote: "If you're looking for someone to get that phone ringing, they're the right fit for you! I'm so happy with them!",
      rating: 5
    },
    {
      name: "James R.",
      business: "HVAC Business Owner",
      quote: "After going through 2-3 other people I finally found someone that told me the truth. Really easy to work with and very respectable.",
      rating: 5
    },
    {
      name: "Amanda T.",
      business: "Plumbing Company",
      quote: "They built me a new website and within 10 days I got my first unpaid lead! Best money spent.",
      rating: 5
    },
    {
      name: "Frank D.",
      business: "Landscaping",
      quote: "My business has ramped up literally overnight and their prices are very affordable. Would recommend to anyone!",
      rating: 5
    },
    {
      name: "David L.",
      business: "General Contractor",
      quote: "I've seen a significant improvement in my business. They've made my life so much easier!",
      rating: 5
    },
    {
      name: "Ryan M.",
      business: "Pressure Washing",
      quote: "They've made it so easy with all their automations and the awesome website. I can't thank them enough!",
      rating: 5
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-12 sm:mb-16">
          <Badge variant="outline" className="text-primary">Testimonials</Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            The proof is in the 
            <span className="bg-gradient-hero bg-clip-text text-transparent"> pudding</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Let's see what our clients have to say about working with us.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 hover:-translate-y-2 border-border/50">
              <CardContent className="pt-6 pb-6 px-6">
                <div className="flex flex-col space-y-4">
                  {/* Stars */}
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <blockquote className="text-base sm:text-lg text-foreground leading-relaxed italic">
                    "{testimonial.quote}"
                  </blockquote>
                  
                  {/* Author */}
                  <div className="pt-4 border-t border-border">
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.business}</p>
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