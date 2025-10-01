import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRight, CheckCircle2, Sparkles, Clock, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessSearch, setBusinessSearch] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useWebsite, setUseWebsite] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleBusinessContinue = () => {
    if (useWebsite && !websiteUrl) {
      toast({
        title: "Website required",
        description: "Please enter your business website",
        variant: "destructive"
      });
      return;
    }
    if (!useWebsite && !businessSearch) {
      toast({
        title: "Business name required",
        description: "Please search for your business",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });

      if (error) throw error;

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: data.user.id,
              subscription_plan: 'free',
              subscription_status: 'active'
            }
          ]);

        if (profileError) throw profileError;

        toast({
          title: "Account created!",
          description: "Welcome to your AI assistant dashboard",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const progressValue = (step / 2) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Progress indicator */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <span className="font-semibold text-foreground">{step}/2</span>
          </div>
          <Progress value={progressValue} className="h-2 max-w-md mx-auto" />
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Left side - Information */}
          <div className="space-y-6">
            {step === 1 ? (
              <>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Train your AI with your{" "}
                    <span className="text-primary">Google Business Profile</span>
                  </h1>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Search className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Find your profile by entering your business name.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Your AI agent will be trained on your Google profile.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Takes less than a minute!</p>
                    </div>
                  </div>
                </div>
                <Card className="p-4 bg-primary/5 border-primary/20">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-medium">Start risk-free: 7-day trial with all features</span>
                  </div>
                </Card>
              </>
            ) : (
              <>
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    <span className="text-primary">Claim</span> Your Custom AI Agent.
                  </h1>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Grow your business while your AI answers calls 24/7.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">7-day trial with all features.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Our support team is here for you and ready to help.</p>
                    </div>
                  </div>
                </div>
                <Card className="p-6 bg-muted/50 border-border">
                  <blockquote className="italic text-foreground/90 mb-4">
                    "This AI assistant is the real deal. We've tried all the others and this is the only one that is easy to set up and sounds so realistic."
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="font-bold text-primary">CF</span>
                    </div>
                    <div>
                      <p className="font-semibold">Crunch Fitness</p>
                      <p className="text-sm text-muted-foreground">Franchisee</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Right side - Form */}
          <Card className="p-8 shadow-xl border-border/50 bg-card">
            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Find your Google Business Profile</h2>
                </div>

                {!useWebsite ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Type your business name..."
                        value={businessSearch}
                        onChange={(e) => setBusinessSearch(e.target.value)}
                        className="pl-12"
                      />
                    </div>

                    <Button
                      onClick={handleBusinessContinue}
                      className="w-full"
                      size="lg"
                      disabled={!businessSearch}
                    >
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setUseWebsite(true)}
                      className="w-full"
                    >
                      Use my website instead
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Input
                        type="url"
                        placeholder="https://yourbusiness.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleBusinessContinue}
                      className="w-full"
                      size="lg"
                      disabled={!websiteUrl}
                    >
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => setUseWebsite(false)}
                      className="w-full"
                    >
                      Search for my business instead
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Create Your Account</h2>
                  <p className="text-sm text-muted-foreground">Free for 7 days</p>
                </div>

                <Button
                  onClick={handleGoogleSignup}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                {!showEmailForm ? (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowEmailForm(true)}
                      className="w-full"
                      size="lg"
                    >
                      Continue with Email
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Password must be at least 8 characters and include a number or symbol.
                      </p>
                    </div>

                    <Button
                      onClick={handleEmailSignup}
                      className="w-full"
                      size="lg"
                      disabled={loading}
                    >
                      Create Account
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree with our{" "}
                  <a href="/privacy" className="underline hover:text-foreground">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/terms" className="underline hover:text-foreground">
                    Terms of Service
                  </a>
                  .
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Bottom navigation */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
