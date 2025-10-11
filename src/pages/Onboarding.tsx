import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, ArrowLeft, ArrowRight, Loader2, Globe, MapPin, Building2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const isSelectingBusinessRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [extractingData, setExtractingData] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationData, setVerificationData] = useState<any>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isCheckingAuthRef = useRef(false);
  const isOnboardingFlowRef = useRef(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [businessTypesList, setBusinessTypesList] = useState<Array<{ value: string; label: string }>>([]);

  // Call transfer state
  const [transferNumber, setTransferNumber] = useState("");
  const [transferNumberError, setTransferNumberError] = useState(false);
  const [savingTransfer, setSavingTransfer] = useState(false);

  // US states list for Claude matching
  const statesList = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
  ];

  // Fetch business types from database
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      const { data, error } = await supabase
        .from("business_types")
        .select("value, label")
        .eq("is_active", true)
        .order("label"); // Sort alphabetically by label

      if (!error && data) {
        setBusinessTypesList(data);
      }
    };

    fetchBusinessTypes();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      // Prevent multiple simultaneous auth checks
      if (isCheckingAuthRef.current) {
        return;
      }

      isCheckingAuthRef.current = true;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        
        // Don't redirect if user is in the middle of onboarding flow
        if (isOnboardingFlowRef.current) {
          isCheckingAuthRef.current = false;
          return;
        }
        
        // Check if user has already completed setup
        const { data: businessSettings } = await supabase
          .from("business_settings")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // Only redirect to dashboard if they've completed business setup
        if (businessSettings) {
          navigate("/dashboard");
        }
      }

      isCheckingAuthRef.current = false;
    };
    checkUser();
  }, [navigate]);

  // Helper function to find the best matching business type
  const findBestBusinessType = (googleTypes: string[] = []): string => {
    // Filter out generic types
    const genericTypes = ["establishment", "point_of_interest"];
    const specificTypes = googleTypes.filter((t) => !genericTypes.includes(t));

    // Try to match against our business types list
    for (const type of specificTypes) {
      const match = businessTypesList.find(
        (bt) => bt.value === type || type.includes(bt.value) || bt.value.includes(type),
      );
      if (match) return match.value;
    }

    // If no match, return the first specific type or 'other'
    return specificTypes[0] || "other";
  };


  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    if (showResults) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showResults]);

  useEffect(() => {
    // Search for businesses as user types - but not when we're selecting a business
    if (businessSearch.trim().length >= 2 && !useWebsite && !isSelectingBusinessRef.current && !selectedBusiness) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      setSearchLoading(true);
      setShowResults(true);

      const performSearch = async () => {
        try {
          const { data, error } = await supabase.functions.invoke("search-business", {
            body: { query: businessSearch },
          });

          if (error) throw error;

          setSearchResults(data.predictions || []);
        } catch (error: any) {
          console.error("Error searching businesses:", error);
          toast({
            title: "Search error",
            description: "Failed to search for businesses. Please try again.",
            variant: "destructive",
          });
        } finally {
          setSearchLoading(false);
        }
      };

      performSearch();
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

    try {
      setLoading(true);
      
      // Fetch detailed business information
      const { data, error } = await supabase.functions.invoke("get-business-details", {
        body: { placeId: business.place_id },
      });

      if (error) throw error;

      // Store business data
      sessionStorage.setItem("selectedBusiness", JSON.stringify(data));
      
      let businessData = data;
      
      // Use Claude to enhance the data (no overlay)
      let claudeData: any = {};
      try {
        const { data: generatedData } = await supabase.functions.invoke("generate-business-description", {
          body: {
            businessName: businessData.name,
            businessType: businessData.types?.[0] || "other",
            services: [],
            address: businessData.address,
            phone: businessData.phone,
            website: businessData.website,
            businessTypesList: businessTypesList.map((t) => t.value),
            statesList,
          },
        });
        if (generatedData) claudeData = generatedData;
      } catch (error) {
        console.error("Error generating with Claude:", error);
      }
      
      // Set verification data with extracted information
      setVerificationData({
        business_name: businessData.name || businessSearch,
        business_phone: businessData.phone || "",
        business_address: businessData.address || "",
        business_type: claudeData.businessType || findBestBusinessType(businessData.types),
        business_website: businessData.website || "",
        business_timezone: "America/New_York",
      });
      
      // Move to verification step
      setStep(2);
      isSelectingBusinessRef.current = false;
    } catch (error: any) {
      console.error("Error getting business details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch business details",
        variant: "destructive",
      });
      isSelectingBusinessRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessContinue = async () => {
    if (useWebsite && !websiteUrl) {
      toast({
        title: "Website required",
        description: "Please enter your business website",
        variant: "destructive",
      });
      return;
    }
    if (!useWebsite && (!businessSearch || !selectedBusiness)) {
      toast({
        title: "Business selection required",
        description: "Please select a business from the search results",
        variant: "destructive",
      });
      return;
    }
    
    // Extract data from website (no overlay)
    try {
      setLoading(true);
      
      const { data: extractedData } = await supabase.functions.invoke("extract-business-data", {
        body: { url: websiteUrl },
      });
      
      let businessData: any = {};
      if (extractedData?.success && extractedData?.data) {
        businessData = {
          name: extractedData.data.business_name,
          phone: extractedData.data.business_phone,
          address: extractedData.data.business_address,
          website: websiteUrl,
          types: extractedData.data.business_type ? [extractedData.data.business_type] : [],
        };
      } else {
        businessData = {
          name: businessSearch || "My Business",
          website: websiteUrl,
        };
      }
      
      // Store for later
      sessionStorage.setItem("selectedBusiness", JSON.stringify(businessData));
      
      // Use Claude to enhance
      let claudeData: any = {};
      try {
        const { data: generatedData } = await supabase.functions.invoke("generate-business-description", {
          body: {
            businessName: businessData.name,
            businessType: businessData.types?.[0] || "other",
            services: [],
            address: businessData.address,
            phone: businessData.phone,
            website: websiteUrl,
            businessTypesList: businessTypesList.map((t) => t.value),
            statesList,
          },
        });
        if (generatedData) claudeData = generatedData;
      } catch (error) {
        console.error("Error with Claude:", error);
      }
      
      setVerificationData({
        business_name: businessData.name || businessSearch || "My Business",
        business_phone: businessData.phone || "",
        business_address: businessData.address || "",
        business_type: claudeData.businessType || "other",
        business_website: websiteUrl,
        business_timezone: "America/New_York",
      });
      
      setStep(2);
    } catch (error: any) {
      console.error("Error extracting data:", error);
      toast({
        title: "Error",
        description: "Failed to extract business data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleSignup = async () => {
    setLoading(true);
    isOnboardingFlowRef.current = true;
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/google-auth-callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error("Google sign-in error:", error);
        throw error;
      }

      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.url,
          "google-oauth",
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`,
        );

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;

          if (event.data?.type === "google-oauth-success") {
            window.removeEventListener("message", handleMessage);
            popup?.close();

            console.log("Received session tokens from popup");

            if (event.data.session) {
              const { data, error } = await supabase.auth.setSession({
                access_token: event.data.session.access_token,
                refresh_token: event.data.session.refresh_token,
              });

              if (error) {
                console.error("Error setting session:", error);
                toast({
                  title: "Session error",
                  description: "Failed to establish session. Please try logging in.",
                  variant: "destructive",
                });
                setLoading(false);
                return;
              }

              console.log("Session established successfully:", data.session?.user.id);

              // Now extract and save business data
              await saveBusinessData(data.session.user.id);
            }
          } else if (event.data?.type === "google-oauth-error") {
            window.removeEventListener("message", handleMessage);
            popup?.close();
            toast({
              title: "Authentication failed",
              description: event.data.error || "Failed to authenticate with Google",
              variant: "destructive",
            });
            setLoading(false);
          }
        };

        window.addEventListener("message", handleMessage);
      }
    } catch (error: any) {
      console.error("Error during Google signup:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign up with Google",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const saveBusinessData = async (userId: string) => {
    try {
      console.log("saveBusinessData called with userId:", userId);
      console.log("verificationData:", verificationData);
      console.log("transferNumber:", transferNumber);
      
      setExtractingData(true);
      setExtractionProgress(10);

      const savedBusiness = sessionStorage.getItem("selectedBusiness");
      console.log("savedBusiness from sessionStorage:", savedBusiness);

      if (!verificationData.business_name && !savedBusiness) {
        console.error("No business data available to save");
        throw new Error("No business data available");
      }

      setExtractionProgress(30);
      
      let businessData: any = savedBusiness ? JSON.parse(savedBusiness) : {};
      console.log("businessData:", businessData);
      
      // Create user profile
      const { data: profileData, error: profileError } = await supabase.from("user_profiles").upsert({
        id: userId,
        company_name: verificationData.business_name || "My Business",
        subscription_plan: "free",
        subscription_status: "active",
      }, { onConflict: "id" });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        throw profileError;
      }
      console.log("Profile created:", profileData);

      setExtractionProgress(50);

      const defaultHours = [
        { id: 1, day: "monday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
        { id: 2, day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
        { id: 3, day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
        { id: 4, day: "thursday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
        { id: 5, day: "friday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
      ];

      // Save business settings with verified data
      const { data: businessSettingsResult, error: businessError } = await supabase.from("business_settings")
        .upsert({
          user_id: userId,
          business_name: verificationData.business_name,
          business_type: verificationData.business_type,
          business_phone: verificationData.business_phone,
          business_address: verificationData.business_address,
          business_website: verificationData.business_website,
          business_hours: JSON.stringify(defaultHours),
          business_timezone: verificationData.business_timezone || "America/New_York",
          transfer_number: transferNumber.replace(/\D/g, ""),
        }, { onConflict: "user_id" })
        .select("id")
        .single();

      if (businessError) {
        console.error("Error saving business settings:", businessError);
        throw businessError;
      }
      console.log("Business settings saved:", businessSettingsResult);

      setExtractionProgress(70);

      // Extract and save services
      if (businessSettingsResult?.id) {
        const { data: servicesData, error: servicesError } = await supabase.functions.invoke("extract-services", {
          body: {
            businessName: verificationData.business_name,
            businessType: verificationData.business_type,
            website: verificationData.business_website,
          },
        });

        if (servicesError) {
          console.error("Error extracting services:", servicesError);
        } else {
          console.log("Services extracted:", servicesData);
        }

        setExtractionProgress(85);

        if (servicesData?.services) {
          const servicesToInsert = servicesData.services.map((service: any, index: number) => ({
            business_id: businessSettingsResult.id,
            name: service.name,
            price: service.price,
            description: service.description,
            display_order: index,
            is_active: true,
          }));
          
          const { error: insertError } = await supabase.from("services").insert(servicesToInsert);
          if (insertError) {
            console.error("Error inserting services:", insertError);
          } else {
            console.log("Services inserted successfully");
          }
        }

        // Purchase Twilio number
        try {
          let areaCode = "800";
          if (verificationData.business_phone) {
            const phoneMatch = verificationData.business_phone.match(/\(?(\d{3})\)?/);
            if (phoneMatch?.[1]) areaCode = phoneMatch[1];
          }

          const { data: twilioData, error: twilioError } = await supabase.functions.invoke("purchase-twilio-number", {
            body: { areaCode, businessId: businessSettingsResult.id },
          });
          
          if (twilioError) {
            console.error("Error purchasing Twilio number:", twilioError);
          } else {
            console.log("Twilio number purchased:", twilioData);
          }
        } catch (twilioError) {
          console.error("Error purchasing Twilio number:", twilioError);
        }
      }

      sessionStorage.removeItem("selectedBusiness");
      setExtractionProgress(100);
      setExtractingData(false);

      toast({
        title: "Setup complete!",
        description: "Welcome to Junie! Let's get started.",
      });

      setTimeout(() => {
        navigate("/settings");
      }, 500);
    } catch (error: any) {
      console.error("Error saving business data:", error);
      setExtractingData(false);
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    isOnboardingFlowRef.current = true;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/settings`,
        },
      });

      if (error) {
        if (error.message.includes("User already registered") || error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "Looks like you signed up by Connecting to Google. Please login with Google instead.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw error;
      }

      if (data.user) {
        // Now extract and save business data
        await saveBusinessData(data.user.id);
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      setExtractingData(false);
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const progressValue = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <Header showAuthButtons={false} />

      {/* Data Extraction Loading Overlay */}
      {extractingData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-full max-w-md mx-4 p-8">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Junie is extracting business details</h3>
                <p className="text-sm text-muted-foreground">
                  Please wait while we analyze and set up your business information...
                </p>
              </div>

              <div className="space-y-2">
                <Progress value={extractionProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">{extractionProgress}% complete</p>
              </div>
            </div>
          </Card>
        </div>
      )}


      {/* Progress indicator */}
      <div className="container mx-auto px-4 py-2">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>Step {Math.min(step, 4)} of 4</span>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Progress Bar */}
          <Progress value={progressValue} className="h-2" />

          {step === 1 ? (
            /* Step 1: Business Information */
            <div className="space-y-6 animate-slide-up" key="step-1">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Let&apos;s find your business</h1>
                <p className="text-muted-foreground text-lg">
                  We&apos;ll use your Google business profile to train Junie
                </p>
              </div>

              <Card className="border-2 shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-center text-xl">
                    {useWebsite ? "Enter Your Website" : "Search for your business"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!useWebsite ? (
                    <div className="space-y-4">
                      <div className="relative" ref={searchContainerRef}>
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                        <Input
                          type="text"
                          placeholder="Enter your business name"
                          value={businessSearch}
                          onChange={(e) => {
                            setBusinessSearch(e.target.value);
                            setSelectedBusiness(null);
                            isSelectingBusinessRef.current = false;
                            setHighlightedIndex(-1);
                          }}
                          onFocus={() => {
                            if (businessSearch.length >= 2 && !selectedBusiness) {
                              setShowResults(true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!showResults || searchResults.length === 0) return;

                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setHighlightedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                            } else if (e.key === "Enter" && highlightedIndex >= 0) {
                              e.preventDefault();
                              handleBusinessSelect(searchResults[highlightedIndex]);
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
                                {searchResults.map((result, index) => (
                                  <button
                                    key={result.place_id}
                                    onClick={() => handleBusinessSelect(result)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                    className={`w-full text-left p-3 rounded-lg transition-colors flex items-start gap-3 group ${
                                      highlightedIndex === index ? "bg-muted" : "hover:bg-muted"
                                    }`}
                                  >
                                    <Building2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`font-medium truncate ${
                                          highlightedIndex === index
                                            ? "text-primary"
                                            : "text-foreground group-hover:text-primary"
                                        }`}
                                      >
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

                      {loading && (
                        <div className="text-center py-4">
                          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground mt-2">Loading business details...</p>
                        </div>
                      )}

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">or</span>
                        </div>
                      </div>

                      <Button variant="outline" onClick={() => setUseWebsite(true)} className="w-full">
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

                      <Button variant="ghost" onClick={() => setUseWebsite(false)} className="w-full">
                        Search for my business instead
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => (window.location.href = "/")} className="text-muted-foreground">
                  ← Back
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <a href="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </a>
                </p>
              </div>
            </div>
          ) : step === 2 ? (
            /* Step 2: Verify Business Details */
            <div className="space-y-6 animate-slide-up" key="step-2">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Verify Your Business Details</h1>
                <p className="text-muted-foreground text-lg">
                  Please review and update your information as needed
                </p>
              </div>

              <Card className="border-2 shadow-elegant">
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verify-name">Business Name</Label>
                    <Input
                      id="verify-name"
                      value={verificationData.business_name || ""}
                      onChange={(e) => setVerificationData({ ...verificationData, business_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-phone">Phone Number</Label>
                    <Input
                      id="verify-phone"
                      value={verificationData.business_phone || ""}
                      onChange={(e) => setVerificationData({ ...verificationData, business_phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-address">Business Address</Label>
                    <Input
                      id="verify-address"
                      value={verificationData.business_address || ""}
                      onChange={(e) => setVerificationData({ ...verificationData, business_address: e.target.value })}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-type">Business Type</Label>
                    <select
                      id="verify-type"
                      value={verificationData.business_type || "other"}
                      onChange={(e) => setVerificationData({ ...verificationData, business_type: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {businessTypesList.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-website">Website</Label>
                    <Input
                      id="verify-website"
                      value={verificationData.business_website || ""}
                      onChange={(e) => setVerificationData({ ...verificationData, business_website: e.target.value })}
                      placeholder="https://yourbusiness.com"
                    />
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={() => {
                        setStep(1);
                        setSelectedBusiness(null);
                        setBusinessSearch("");
                        setWebsiteUrl("");
                        setUseWebsite(false);
                        setVerificationData({});
                        sessionStorage.removeItem("selectedBusiness");
                      }}
                      variant="outline"
                      className="flex-1"
                      size="lg"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1"
                      size="lg"
                    >
                      Continue
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : step === 3 ? (
            /* Step 3: Call Transfer Setup */
            <div className="space-y-6 animate-slide-up" key="step-3">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Set your call transfer number</h1>
                <p className="text-muted-foreground text-lg">
                  Where should we transfer calls when a caller wants to speak to you immediately?
                </p>
              </div>

              <Card className="border-2 shadow-elegant">
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="transfer-number">
                      Call Transfer Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="transfer-number"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={transferNumber}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, "");
                        if (value.length > 10) value = value.slice(0, 10);

                        let formatted = value;
                        if (value.length >= 6) {
                          formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                        } else if (value.length >= 3) {
                          formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                        }

                        setTransferNumber(formatted);
                        setTransferNumberError(value.length > 0 && value.length !== 10);
                      }}
                      className={transferNumberError ? "border-destructive" : ""}
                      autoFocus
                    />
                    {transferNumberError && (
                      <p className="text-sm text-destructive">Please enter a valid 10-digit phone number</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Enter the phone number where calls will be transferred when a caller requests to speak with you
                      immediately.
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      const digits = transferNumber.replace(/\D/g, "");
                      if (digits.length !== 10) {
                        setTransferNumberError(true);
                        return;
                      }
                      // Just move to next step, don't save yet
                      setStep(4);
                    }}
                    className="w-full h-12 text-base"
                    size="lg"
                    disabled={transferNumberError || !transferNumber}
                  >
                    Create Account
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : step === 4 ? (
            /* Step 4: Create Account */
            <div className="space-y-6 animate-slide-up" key="step-4">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Create your account</h1>
                <p className="text-muted-foreground text-lg">Start your 7-day free trial</p>
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
                      <img src="/src/assets/google-logo.svg" alt="Google" className="w-5 h-5 mr-2" />
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !loading) {
                              handleEmailSignup();
                            }
                          }}
                          className="h-12 text-base"
                        />
                        <Input
                          type="password"
                          placeholder="Password (min 8 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !loading) {
                              handleEmailSignup();
                            }
                          }}
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
                <Button variant="ghost" onClick={() => setStep(3)} className="text-muted-foreground">
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
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
