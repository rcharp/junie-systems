import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowRight, Loader2, Globe, MapPin, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";

interface BusinessPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [businessSearch, setBusinessSearch] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useWebsite, setUseWebsite] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [searchResults, setSearchResults] = useState<BusinessPrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPrediction | null>(null);
  const isSelectingBusinessRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showResults]);

  useEffect(() => {
    // Search for businesses as user types - but not when we're selecting a business
    if (businessSearch.trim().length >= 2 && !useWebsite && !isSelectingBusinessRef.current && !selectedBusiness) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setSearchLoading(true);
        setShowResults(true);
        
        try {
          const { data, error } = await supabase.functions.invoke('search-business', {
            body: { query: businessSearch }
          });

          if (error) throw error;

          setSearchResults(data.predictions || []);
        } catch (error: any) {
          console.error('Error searching businesses:', error);
          toast({
            title: "Search error",
            description: "Failed to search for businesses. Please try again.",
            variant: "destructive"
          });
        } finally {
          setSearchLoading(false);
        }
      }, 500); // Debounce for 500ms
    } else {
      setSearchResults([]);
      if (!isSelectingBusinessRef.current && !selectedBusiness) {
        setShowResults(false);
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [businessSearch, useWebsite, selectedBusiness, toast]);

  const handleBusinessSelect = async (business: BusinessPrediction) => {
    isSelectingBusinessRef.current = true;
    setSelectedBusiness(business);
    setBusinessSearch(business.structured_formatting.main_text);
    setShowResults(false);

    // Fetch detailed business information
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-business-details', {
        body: { placeId: business.place_id }
      });

      if (error) throw error;

      // Store business data for later use
      sessionStorage.setItem('selectedBusiness', JSON.stringify(data));
      
      toast({
        title: "Business found!",
        description: `Selected ${data.name}`,
      });

      // Automatically move to next step
      setTimeout(() => {
        setStep(2);
        isSelectingBusinessRef.current = false;
      }, 800);
    } catch (error: any) {
      console.error('Error getting business details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch business details",
        variant: "destructive"
      });
      isSelectingBusinessRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessContinue = () => {
    if (useWebsite && !websiteUrl) {
      toast({
        title: "Website required",
        description: "Please enter your business website",
        variant: "destructive"
      });
      return;
    }
    if (!useWebsite && (!businessSearch || !selectedBusiness)) {
      toast({
        title: "Business selection required",
        description: "Please select a business from the search results",
        variant: "destructive"
      });
      return;
    }
    setStep(2);
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/google-auth-callback`,
          skipBrowserRedirect: true,
        }
      });

      if (error) {
        console.error('Google sign-in error:', error);
        throw error;
      }

      if (data?.url) {
        // Open OAuth in popup window (like calendar integration)
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        const popup = window.open(
          data.url,
          'google-oauth',
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        // Listen for OAuth completion
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data?.type === 'google-oauth-success') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            
            console.log('Received session tokens from popup');
            
            // Establish session in parent window using tokens from popup
            if (event.data.session) {
              const { data, error } = await supabase.auth.setSession({
                access_token: event.data.session.access_token,
                refresh_token: event.data.session.refresh_token,
              });
              
              if (error) {
                console.error('Error setting session:', error);
                toast({
                  title: "Session error",
                  description: "Failed to establish session. Please try logging in.",
                  variant: "destructive",
                });
                setLoading(false);
                return;
              }
              
              console.log('Session established successfully:', data.session?.user.id);
              
              // Save business data if available
              const savedBusiness = sessionStorage.getItem('selectedBusiness');
              if (savedBusiness && data.session?.user.id) {
                try {
                  const businessData = JSON.parse(savedBusiness);
                  console.log('Saving business data:', businessData);
                  
                  // Create user profile if it doesn't exist
                  const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert({
                      id: data.session.user.id,
                      company_name: businessData.name,
                      subscription_plan: 'free',
                      subscription_status: 'active'
                    }, { onConflict: 'id' });
                  
                  if (profileError) {
                    console.error('Error creating profile:', profileError);
                  }
                  
                  // Save business settings
                  const { error: businessError } = await supabase
                    .from('business_settings')
                    .upsert({
                      user_id: data.session.user.id,
                      business_name: businessData.name,
                      business_type: businessData.types?.[0] || businessData.businessType,
                      business_phone: businessData.formatted_phone_number || businessData.international_phone_number,
                      business_address: businessData.formatted_address,
                      business_website: businessData.website,
                      business_hours: businessData.opening_hours ? JSON.stringify(businessData.opening_hours) : null,
                      business_description: businessData.editorial_summary?.overview || null,
                      business_address_state_full: businessData.address_components?.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name,
                      business_type_full_name: businessData.types?.join(', '),
                      business_timezone: businessData.utc_offset_minutes ? `UTC${businessData.utc_offset_minutes >= 0 ? '+' : ''}${businessData.utc_offset_minutes / 60}` : 'America/New_York',
                    }, { onConflict: 'user_id' });
                  
                  if (businessError) {
                    console.error('Error saving business settings:', businessError);
                  } else {
                    console.log('Business data saved successfully');
                  }
                  
                  // Clear the sessionStorage
                  sessionStorage.removeItem('selectedBusiness');
                } catch (error) {
                  console.error('Error processing business data:', error);
                }
              }
              
              toast({
                title: "Welcome!",
                description: "Successfully signed in with Google.",
              });
              
              // Navigate to settings
              window.location.href = '/settings';
            } else {
              console.error('No session data received from popup');
              toast({
                title: "Session error",
                description: "Please try again.",
                variant: "destructive",
              });
              setLoading(false);
            }
          } else if (event.data?.type === 'google-oauth-error') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            setLoading(false);
            toast({
              title: "Sign-in error",
              description: event.data?.error || "Failed to sign in with Google.",
              variant: "destructive",
            });
          }
        };

        window.addEventListener('message', handleMessage);

        // Check if popup was closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setLoading(false);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      toast({
        title: "Sign-in error",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive"
      });
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
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <Header />
      
      {/* Progress indicator */}
      <div className="container mx-auto px-4 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {step} of 2</span>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Progress Bar */}
          <Progress value={progressValue} className="h-2" />

          {step === 1 ? (
            /* Step 1: Business Information */
            <div className="space-y-6 animate-slide-up">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Let's find your business
                </h1>
                <p className="text-muted-foreground text-lg">
                  We'll use your business information to train your AI assistant
                </p>
              </div>

              <Card className="border-2 shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    {useWebsite ? "Enter Your Website" : "Search Your Business"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!useWebsite ? (
                    <div className="space-y-4">
                      <div className="relative" ref={searchContainerRef}>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                        <Input
                          type="text"
                          placeholder="Search for your business..."
                          value={businessSearch}
                          onChange={(e) => {
                            setBusinessSearch(e.target.value);
                            setSelectedBusiness(null);
                            isSelectingBusinessRef.current = false;
                          }}
                          onFocus={() => {
                            if (businessSearch.length >= 2 && !selectedBusiness) {
                              setShowResults(true);
                            }
                          }}
                          className="pl-12 h-14 text-base"
                          autoFocus
                        />
                        {searchLoading && (
                          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                        )}
                        
                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                          <Card className="absolute w-full mt-2 z-50 shadow-lg border-2">
                            <ScrollArea className="h-[300px]">
                              <div className="p-2">
                                {searchResults.map((result) => (
                                  <button
                                    key={result.place_id}
                                    onClick={() => handleBusinessSelect(result)}
                                    className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors flex items-start gap-3 group"
                                  >
                                    <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-foreground group-hover:text-primary truncate">
                                        {result.structured_formatting.main_text}
                                      </p>
                                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {result.structured_formatting.secondary_text}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </ScrollArea>
                          </Card>
                        )}

                        {showResults && searchResults.length === 0 && !searchLoading && businessSearch.length >= 2 && (
                          <Card className="absolute w-full mt-2 z-50 shadow-lg border-2">
                            <div className="p-4 text-center text-muted-foreground">
                              No businesses found. Try a different search term.
                            </div>
                          </Card>
                        )}
                      </div>

                      <Button
                        onClick={handleBusinessContinue}
                        className="w-full h-12 text-base"
                        size="lg"
                        disabled={!selectedBusiness || loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Continue
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
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
                        variant="outline"
                        onClick={() => setUseWebsite(true)}
                        className="w-full"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Use my website instead
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="url"
                          placeholder="https://yourbusiness.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          className="pl-12 h-14 text-base"
                          autoFocus
                        />
                      </div>

                      <Button
                        onClick={handleBusinessContinue}
                        className="w-full h-12 text-base"
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
                </CardContent>
              </Card>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </div>
          ) : (
            /* Step 2: Create Account */
            <div className="space-y-6 animate-slide-up">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Create your account
                </h1>
                <p className="text-muted-foreground text-lg">
                  Start your 7-day free trial
                </p>
              </div>

              <Card className="border-2 shadow-elegant">
                <CardContent className="pt-6 space-y-6">
                  <Button
                    onClick={handleGoogleSignup}
                    variant="outline"
                    className="w-full h-12 text-base"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
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
                    )}
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
                        className="w-full h-12 text-base"
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
                          className="h-12 text-base"
                        />
                        <Input
                          type="password"
                          placeholder="Password (min 8 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 text-base"
                        />
                      </div>

                      <Button
                        onClick={handleEmailSignup}
                        className="w-full h-12 text-base"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-center text-muted-foreground">
                    By creating an account, you agree to our{" "}
                    <a href="/terms" className="underline hover:text-foreground">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" className="underline hover:text-foreground">
                      Privacy Policy
                    </a>
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-muted-foreground"
                >
                  ← Back
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
