import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EmailCapture = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Redirect to onboarding with email
    navigate(`/onboarding?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="relative overflow-hidden border-2 border-primary/20 shadow-elegant">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-hero opacity-5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent/20 to-transparent rounded-full -translate-y-32 translate-x-32" />
            
            <CardHeader className="text-center space-y-4 relative z-10">
              <Badge variant="outline" className="mx-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                Early Access
              </Badge>
              <CardTitle className="text-3xl lg:text-4xl font-bold">
                Be the first to experience
                <span className="bg-gradient-hero bg-clip-text text-transparent"> Junie</span>
              </CardTitle>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Join our exclusive early access program and get 3 months free when we launch. 
                Limited spots available for the beta program.
              </p>
            </CardHeader>
            
            <CardContent className="space-y-8 relative z-10">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your business email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-12 text-base"
                />
                <Button 
                  type="submit" 
                  variant="cta" 
                  size="lg"
                  className="group"
                >
                  Get Started for Free
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>3 months free for early adopters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>Priority customer support</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span>No spam, unsubscribe anytime</span>
                </div>
              </div>
              
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default EmailCapture;