import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const features = [
  "Complete website redesigned for conversion",
  "Chat widget auto-response automation",
  "Quote form auto-response automation",
  "Missed Call Text Back",
  "Google 5-star review automation",
];

const GrowthPage = () => {
  const handleStart = () => {
    window.open("https://api.juniesystems.com/payment-link/69d31bddc6a0e600f4d07b30", "_blank");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Card className="relative border-primary shadow-lg">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground">Growth</Badge>
          </div>
          <CardHeader className="text-center pb-4 px-6 pt-10">
            <div className="space-y-2">
              <h3 className="text-xl font-bold uppercase tracking-wide text-foreground">Growth Plan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Everything in Presence plus missed call text back and review automation.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8">
            <ul className="space-y-4">
              {features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-base text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full h-12" variant="hero" onClick={handleStart}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GrowthPage;
