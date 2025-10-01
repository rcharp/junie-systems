import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [extractingData, setExtractingData] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationData, setVerificationData] = useState<any>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Business types list for Claude matching
  const businessTypesList = [
    'electric', 'garage-door', 'handyman', 'hvac', 'landscaping', 
    'other', 'pest-control', 'plumbing', 'pool-spa', 'cleaning', 'roofing'
  ];

  // US states list for Claude matching
  const statesList = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        // Check if user has already completed setup
        const { data: businessSettings } = await supabase
          .from('business_settings')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        // Only redirect to dashboard if they've completed business setup
        if (businessSettings) {
          navigate("/dashboard");
        }
      }
    };
    checkUser();
  }, [navigate]);

  // Auto-proceed to business setup for authenticated users at step 2
  useEffect(() => {
    if (step === 2 && isAuthenticated) {
      // Automatically trigger business data saving for already-authenticated users
      handleAuthenticatedUserSetup();
    }
  }, [step, isAuthenticated]);

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

      setSearchLoading(true);
      setShowResults(true);
      
      const performSearch = async () => {
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

    // Fetch detailed business information
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-business-details', {
        body: { placeId: business.place_id }
      });

      if (error) throw error;

      // Store business data for later use
      sessionStorage.setItem('selectedBusiness', JSON.stringify(data));

      // Automatically move to next step
      setTimeout(() => {
        setStep(2);
        isSelectingBusinessRef.current = false;
      }, 500);
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

  const handleAuthenticatedUserSetup = async () => {
    // This function handles business setup for users who are already authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found for authenticated user');
        return;
      }

      console.log('Setting up business data for authenticated user:', session.user.id);
      
      // Show extraction overlay
      setExtractingData(true);
      setExtractionProgress(10);
      
      // Save business data
      const savedBusiness = sessionStorage.getItem('selectedBusiness');
      const savedWebsiteUrl = useWebsite ? websiteUrl : null;
      
      if ((savedBusiness || savedWebsiteUrl)) {
        try {
          setExtractionProgress(20);
          let businessData: any = {};
          
          // If user provided a website URL, extract data from it
          if (savedWebsiteUrl) {
            console.log('Extracting business data from website:', savedWebsiteUrl);
            try {
              const { data: extractedData, error: extractError } = await supabase.functions.invoke('extract-business-data', {
                body: { url: savedWebsiteUrl }
              });

              if (!extractError && extractedData?.success && extractedData?.data) {
                console.log('Successfully extracted data from website:', extractedData.data);
                businessData = {
                  name: extractedData.data.business_name,
                  phone: extractedData.data.business_phone,
                  address: extractedData.data.business_address,
                  website: savedWebsiteUrl,
                  description: extractedData.data.business_description,
                  types: extractedData.data.business_type ? [extractedData.data.business_type] : [],
                  services: extractedData.data.services_offered,
                  pricing: extractedData.data.pricing_structure,
                  hours: extractedData.data.business_hours
                };
              } else {
                console.error('Error extracting data from website:', extractError);
                // Continue with minimal data
                businessData = {
                  name: businessSearch || 'My Business',
                  website: savedWebsiteUrl
                };
              }
            } catch (extractError) {
              console.error('Error calling extract-business-data function:', extractError);
              // Continue with minimal data
              businessData = {
                name: businessSearch || 'My Business',
                website: savedWebsiteUrl
              };
            }
          } else if (savedBusiness) {
            businessData = JSON.parse(savedBusiness);
          }
          
          console.log('Saving business data:', businessData);
          setExtractionProgress(30);
          
          // Ensure user profile exists
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: session.user.id,
              company_name: businessData.name || businessSearch || 'My Business',
              subscription_plan: 'free',
              subscription_status: 'active'
            }, { onConflict: 'id' });
          
          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
          
          setExtractionProgress(40);
          
          // Use Claude to determine business type, state, and description
          let claudeData: any = {};
          try {
            const { data: generatedData, error: claudeError } = await supabase.functions.invoke('generate-business-description', {
              body: {
                businessName: businessData.name || businessSearch || 'My Business',
                businessType: businessData.types?.[0] || 'other',
                services: [],
                address: businessData.address || null,
                phone: businessData.phone || null,
                website: savedWebsiteUrl || businessData.website || null,
                businessTypesList,
                statesList
              }
            });
            
            if (!claudeError && generatedData) {
              claudeData = generatedData;
              console.log('Claude generated data:', claudeData);
            }
          } catch (error) {
            console.error('Error generating with Claude:', error);
          }
          
          setExtractionProgress(60);
          
          // Default business hours
          const defaultHours = [
            { id: 1, day: 'monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
            { id: 2, day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
            { id: 3, day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
            { id: 4, day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
            { id: 5, day: 'friday', isOpen: true, openTime: '09:00', closeTime: '17:00' }
          ];
          
          // Save business settings
          const { data: businessSettingsResult, error: businessError } = await supabase
            .from('business_settings')
            .upsert({
              user_id: session.user.id,
              business_name: businessData.name || businessSearch || 'My Business',
              business_type: claudeData.businessType || businessData.types?.[0] || 'other',
              business_phone: businessData.phone || null,
              business_address: businessData.address || null,
              business_address_state_full: claudeData.state || null,
              business_website: savedWebsiteUrl || businessData.website || null,
              business_hours: JSON.stringify(defaultHours),
              business_description: claudeData.description || businessData.editorial_summary?.overview || null,
              business_type_full_name: businessData.types?.join(', ') || null,
              business_timezone: 'America/New_York',
            }, { 
              onConflict: 'user_id'
            })
            .select('id')
            .single();
          
          setExtractionProgress(70);
          
          if (businessError) {
            console.error('Error saving business settings:', businessError);
          } else {
            console.log('Business data saved successfully');
            
            // Extract services
            if (businessSettingsResult?.id) {
              try {
                setExtractionProgress(80);
                const { data: servicesData, error: servicesError } = await supabase.functions.invoke('extract-services', {
                  body: {
                    businessName: businessData.name || businessSearch || 'My Business',
                    businessType: claudeData.businessType || businessData.types?.[0] || 'other',
                    website: savedWebsiteUrl || businessData.website,
                    businessDescription: claudeData.description || businessData.editorial_summary?.overview
                  }
                });
                
                setExtractionProgress(90);
                
                if (!servicesError && servicesData?.services) {
                  const businessId = businessSettingsResult.id;
                  
                  const servicesToInsert = servicesData.services.map((service: any, index: number) => ({
                    business_id: businessId,
                    name: service.name,
                    price: service.price,
                    description: service.description,
                    display_order: index,
                    is_active: true
                  }));
                  
                  await supabase.from('services').insert(servicesToInsert);
                  console.log('Services saved successfully');
                }
              } catch (servicesError) {
                console.error('Error extracting services:', servicesError);
              }
            }
          }
          
          // Clear sessionStorage
          sessionStorage.removeItem('selectedBusiness');
          
          setExtractionProgress(100);
          
          // Show verification step
          setExtractingData(false);
          setShowVerification(true);
          setVerificationData({
            business_name: businessData.name || businessSearch || 'My Business',
            business_phone: businessData.phone || null,
            business_address: businessData.address || null,
            business_type: claudeData.businessType || businessData.types?.[0] || 'other',
            business_website: savedWebsiteUrl || businessData.website || null,
            business_timezone: 'America/New_York',
          });
        } catch (error: any) {
          console.error('Setup error:', error);
          setExtractingData(false);
          toast({
            title: "Setup failed",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Error in authenticated user setup:', error);
      setExtractingData(false);
      toast({
        title: "Error",
        description: "Failed to complete setup. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
              
              // Show extraction overlay
              setExtractingData(true);
              setExtractionProgress(10);
              
              // Save business data if available
              const savedBusiness = sessionStorage.getItem('selectedBusiness');
              const savedWebsiteUrl = useWebsite ? websiteUrl : null;
              
              if ((savedBusiness || savedWebsiteUrl) && data.session?.user.id) {
                try {
                  setExtractionProgress(20);
                  let businessData: any = {};
                  
                  // If user provided a website URL, extract data from it
                  if (savedWebsiteUrl) {
                    console.log('Extracting business data from website:', savedWebsiteUrl);
                    try {
                      const { data: extractedData, error: extractError } = await supabase.functions.invoke('extract-business-data', {
                        body: { url: savedWebsiteUrl }
                      });

                      if (!extractError && extractedData?.success && extractedData?.data) {
                        console.log('Successfully extracted data from website:', extractedData.data);
                        businessData = {
                          name: extractedData.data.business_name,
                          phone: extractedData.data.business_phone,
                          address: extractedData.data.business_address,
                          website: savedWebsiteUrl,
                          description: extractedData.data.business_description,
                          types: extractedData.data.business_type ? [extractedData.data.business_type] : [],
                          services: extractedData.data.services_offered,
                          pricing: extractedData.data.pricing_structure,
                          hours: extractedData.data.business_hours
                        };
                      } else {
                        console.error('Error extracting data from website:', extractError);
                        // Continue with minimal data
                        businessData = {
                          name: businessSearch || 'My Business',
                          website: savedWebsiteUrl
                        };
                      }
                    } catch (extractError) {
                      console.error('Error calling extract-business-data function:', extractError);
                      // Continue with minimal data
                      businessData = {
                        name: businessSearch || 'My Business',
                        website: savedWebsiteUrl
                      };
                    }
                  } else if (savedBusiness) {
                    businessData = JSON.parse(savedBusiness);
                  }
                  
                  console.log('Saving business data:', businessData);
                  setExtractionProgress(30);
                  
                  // Create user profile if it doesn't exist
                  const { error: profileError } = await supabase
                    .from('user_profiles')
                    .upsert({
                      id: data.session.user.id,
                      company_name: businessData.name || businessSearch || 'My Business',
                      subscription_plan: 'free',
                      subscription_status: 'active'
                    }, { onConflict: 'id' });
                  
                  if (profileError) {
                    console.error('Error creating profile:', profileError);
                  }
                  
                  setExtractionProgress(40);
                  
                  // Use Claude to determine business type, state, and description
                  let claudeData: any = {};
                  try {
                    const { data: generatedData, error: claudeError } = await supabase.functions.invoke('generate-business-description', {
                      body: {
                        businessName: businessData.name || businessSearch || 'My Business',
                        businessType: businessData.types?.[0] || 'other',
                        services: [],
                        address: businessData.address || null,
                        phone: businessData.phone || null,
                        website: savedWebsiteUrl || businessData.website || null,
                        businessTypesList,
                        statesList
                      }
                    });
                    
                    if (!claudeError && generatedData) {
                      claudeData = generatedData;
                      console.log('Claude generated data:', claudeData);
                    }
                  } catch (error) {
                    console.error('Error generating with Claude:', error);
                  }
                  
                  setExtractionProgress(60);
                  
                  // Default business hours: M-F 9am-5pm
                  const defaultHours = [
                    { id: 1, day: 'monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    { id: 2, day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    { id: 3, day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    { id: 4, day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
                    { id: 5, day: 'friday', isOpen: true, openTime: '09:00', closeTime: '17:00' }
                  ];
                  
                  // Determine which hours to save - use Google hours if available, otherwise default
                  let businessHoursToSave = defaultHours;
                  
                  // If Google Business Profile has hours, try to use them
                  if (businessData.openingHours && Array.isArray(businessData.openingHours) && businessData.openingHours.length > 0) {
                    try {
                      // Parse Google hours from weekday_text format (e.g., "Monday: 9:00 AM – 5:00 PM")
                      businessHoursToSave = businessData.openingHours.map((hourText: string, index: number) => {
                        // Extract day and hours from the text
                        const match = hourText.match(/^(\w+):\s*(.+)$/);
                        if (!match) return null;
                        
                        const day = match[1].toLowerCase();
                        const hoursText = match[2];
                        
                        // Check if open 24 hours
                        if (hoursText.includes('Open 24 hours')) {
                          return {
                            id: index + 1,
                            day,
                            isOpen: true,
                            openTime: '00:00',
                            closeTime: '23:59'
                          };
                        }
                        
                        // Check if closed
                        if (hoursText.includes('Closed')) {
                          return {
                            id: index + 1,
                            day,
                            isOpen: false,
                            openTime: '09:00',
                            closeTime: '17:00'
                          };
                        }
                        
                        // Parse time range (e.g., "9:00 AM – 5:00 PM")
                        const timeMatch = hoursText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/);
                        if (timeMatch) {
                          let openHour = parseInt(timeMatch[1]);
                          const openMin = timeMatch[2];
                          const openPeriod = timeMatch[3];
                          let closeHour = parseInt(timeMatch[4]);
                          const closeMin = timeMatch[5];
                          const closePeriod = timeMatch[6];
                          
                          // Convert to 24-hour format
                          if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
                          if (openPeriod === 'AM' && openHour === 12) openHour = 0;
                          if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
                          if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;
                          
                          return {
                            id: index + 1,
                            day,
                            isOpen: true,
                            openTime: `${String(openHour).padStart(2, '0')}:${openMin}`,
                            closeTime: `${String(closeHour).padStart(2, '0')}:${closeMin}`
                          };
                        }
                        
                        // Default fallback
                        return {
                          id: index + 1,
                          day,
                          isOpen: true,
                          openTime: '09:00',
                          closeTime: '17:00'
                        };
                      }).filter(Boolean); // Remove any null entries
                    } catch (error) {
                      console.error('Error parsing Google hours, using defaults:', error);
                      businessHoursToSave = defaultHours;
                    }
                  }
                  
                  // Save business settings with Claude-enhanced data
                  const { data: businessSettingsResult, error: businessError } = await supabase
                    .from('business_settings')
                    .upsert({
                      user_id: data.session.user.id,
                      business_name: businessData.name || businessSearch || 'My Business',
                      business_type: claudeData.businessType || businessData.types?.[0] || 'other',
                      business_phone: businessData.phone || null,
                      business_address: businessData.address || null,
                      business_address_state_full: claudeData.state || null,
                      business_website: savedWebsiteUrl || businessData.website || null,
                      business_hours: JSON.stringify(businessHoursToSave),
                      business_description: claudeData.description || businessData.editorial_summary?.overview || null,
                      business_type_full_name: businessData.types?.join(', ') || null,
                      business_timezone: 'America/New_York',
                    }, { 
                      onConflict: 'user_id'
                    })
                    .select('id')
                    .single();
                  
                  setExtractionProgress(70);
                  
                  if (businessError) {
                    console.error('Error saving business settings:', businessError);
                  } else {
                    console.log('Business data saved successfully');
                    
                    // Extract services using Claude API
                    if (businessSettingsResult?.id) {
                      try {
                        setExtractionProgress(80);
                        const { data: servicesData, error: servicesError } = await supabase.functions.invoke('extract-services', {
                          body: {
                            businessName: businessData.name || businessSearch || 'My Business',
                            businessType: claudeData.businessType || businessData.types?.[0] || 'other',
                            website: savedWebsiteUrl || businessData.website,
                            businessDescription: claudeData.description || businessData.editorial_summary?.overview
                          }
                        });
                        
                        setExtractionProgress(90);
                        
                        if (!servicesError && servicesData?.services) {
                          const businessId = businessSettingsResult.id;
                          
                          // Save extracted services to database
                          const servicesToInsert = servicesData.services.map((service: any, index: number) => ({
                            business_id: businessId,
                            name: service.name,
                            price: service.price,
                            description: service.description,
                            display_order: index,
                            is_active: true
                          }));
                          
                          await supabase.from('services').insert(servicesToInsert);
                          console.log('Services saved successfully');
                        }
                      } catch (servicesError) {
                        console.error('Error extracting services:', servicesError);
                      }
                    }
                  }
                  
                  // Clear the sessionStorage
                  sessionStorage.removeItem('selectedBusiness');
                  
                  setExtractionProgress(100);
                  
                  // Show verification step
                  setExtractingData(false);
                  setShowVerification(true);
                  setVerificationData({
                    business_name: businessData.name || businessSearch || 'My Business',
                    business_phone: businessData.phone || null,
                    business_address: businessData.address || null,
                    business_type: claudeData.businessType || businessData.types?.[0] || 'other',
                    business_website: savedWebsiteUrl || businessData.website || null,
                    business_timezone: 'America/New_York',
                  });
                } catch (error) {
                  console.error('Error processing business data:', error);
                }
              } else {
                // No business data - just show basic verification
                setExtractionProgress(100);
                setExtractingData(false);
                setShowVerification(true);
                setVerificationData({
                  business_name: businessSearch || 'My Business',
                  business_phone: null,
                  business_address: null,
                  business_type: 'other',
                  business_website: null,
                  business_timezone: 'America/New_York',
                });
              }
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
        // Show extraction overlay
        setExtractingData(true);
        setExtractionProgress(10);
        
        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            company_name: businessSearch || 'My Business',
            subscription_plan: 'free',
            subscription_status: 'active'
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
        
        setExtractionProgress(20);
        
        // Get saved business data
        const savedBusiness = sessionStorage.getItem('selectedBusiness');
        const savedWebsiteUrl = useWebsite ? websiteUrl : null;
        
        let businessData: any = {};
        
        if (savedBusiness) {
          businessData = JSON.parse(savedBusiness);
        }
        
        setExtractionProgress(30);
        
        // Use Claude to determine business type, state, and description
        let claudeData: any = {};
        try {
          const { data: generatedData, error: claudeError } = await supabase.functions.invoke('generate-business-description', {
            body: {
              businessName: businessData.name || businessSearch || 'My Business',
              businessType: businessData.types?.[0] || 'other',
              services: [],
              address: businessData.address || null,
              phone: businessData.phone || null,
              website: savedWebsiteUrl || businessData.website || null,
              businessTypesList,
              statesList
            }
          });
          
          if (!claudeError && generatedData) {
            claudeData = generatedData;
            console.log('Claude generated data:', claudeData);
          }
        } catch (error) {
          console.error('Error generating with Claude:', error);
        }
        
        setExtractionProgress(60);
        
        // Default business hours: M-F 9am-5pm
        const defaultHours = [
          { id: 1, day: 'monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { id: 2, day: 'tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { id: 3, day: 'wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { id: 4, day: 'thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { id: 5, day: 'friday', isOpen: true, openTime: '09:00', closeTime: '17:00' }
        ];
        
        // Determine which hours to save - use Google hours if available, otherwise default
        let businessHoursToSave = defaultHours;
        
        // If Google Business Profile has hours, try to use them
        if (businessData.openingHours && Array.isArray(businessData.openingHours) && businessData.openingHours.length > 0) {
          try {
            // Parse Google hours from weekday_text format (e.g., "Monday: 9:00 AM – 5:00 PM")
            businessHoursToSave = businessData.openingHours.map((hourText: string, index: number) => {
              // Extract day and hours from the text
              const match = hourText.match(/^(\w+):\s*(.+)$/);
              if (!match) return null;
              
              const day = match[1].toLowerCase();
              const hoursText = match[2];
              
              // Check if open 24 hours
              if (hoursText.includes('Open 24 hours')) {
                return {
                  id: index + 1,
                  day,
                  isOpen: true,
                  openTime: '00:00',
                  closeTime: '23:59'
                };
              }
              
              // Check if closed
              if (hoursText.includes('Closed')) {
                return {
                  id: index + 1,
                  day,
                  isOpen: false,
                  openTime: '09:00',
                  closeTime: '17:00'
                };
              }
              
              // Parse time range (e.g., "9:00 AM – 5:00 PM")
              const timeMatch = hoursText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/);
              if (timeMatch) {
                let openHour = parseInt(timeMatch[1]);
                const openMin = timeMatch[2];
                const openPeriod = timeMatch[3];
                let closeHour = parseInt(timeMatch[4]);
                const closeMin = timeMatch[5];
                const closePeriod = timeMatch[6];
                
                // Convert to 24-hour format
                if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
                if (openPeriod === 'AM' && openHour === 12) openHour = 0;
                if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
                if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;
                
                return {
                  id: index + 1,
                  day,
                  isOpen: true,
                  openTime: `${String(openHour).padStart(2, '0')}:${openMin}`,
                  closeTime: `${String(closeHour).padStart(2, '0')}:${closeMin}`
                };
              }
              
              // Default fallback
              return {
                id: index + 1,
                day,
                isOpen: true,
                openTime: '09:00',
                closeTime: '17:00'
              };
            }).filter(Boolean); // Remove any null entries
          } catch (error) {
            console.error('Error parsing Google hours, using defaults:', error);
            businessHoursToSave = defaultHours;
          }
        }
        
        // Save business settings with Claude-enhanced data
        const { data: businessSettingsResult, error: businessError } = await supabase
          .from('business_settings')
          .upsert({
            user_id: data.user.id,
            business_name: businessData.name || businessSearch || 'My Business',
            business_type: claudeData.businessType || businessData.types?.[0] || 'other',
            business_phone: businessData.phone || null,
            business_address: businessData.address || null,
            business_address_state_full: claudeData.state || null,
            business_website: savedWebsiteUrl || businessData.website || null,
            business_hours: JSON.stringify(businessHoursToSave),
            business_description: claudeData.description || businessData.editorial_summary?.overview || null,
            business_type_full_name: businessData.types?.join(', ') || null,
            business_timezone: 'America/New_York',
          }, { 
            onConflict: 'user_id'
          })
          .select('id')
          .single();
        
        setExtractionProgress(70);
        
        if (businessError) {
          console.error('Error saving business settings:', businessError);
        } else {
          console.log('Business data saved successfully');
          
          // Extract services using Claude API
          if (businessSettingsResult?.id) {
            try {
              setExtractionProgress(80);
              const { data: servicesData, error: servicesError } = await supabase.functions.invoke('extract-services', {
                body: {
                  businessName: businessData.name || businessSearch || 'My Business',
                  businessType: claudeData.businessType || businessData.types?.[0] || 'other',
                  website: savedWebsiteUrl || businessData.website,
                  businessDescription: claudeData.description || businessData.editorial_summary?.overview
                }
              });
              
              setExtractionProgress(90);
              
              if (!servicesError && servicesData?.services) {
                const businessId = businessSettingsResult.id;
                
                // Save extracted services to database
                const servicesToInsert = servicesData.services.map((service: any, index: number) => ({
                  business_id: businessId,
                  name: service.name,
                  price: service.price,
                  description: service.description,
                  display_order: index,
                  is_active: true
                }));
                
                await supabase.from('services').insert(servicesToInsert);
                console.log('Services saved successfully');
              }
            } catch (servicesError) {
              console.error('Error extracting services:', servicesError);
            }
          }
        }
        
        // Clear the sessionStorage
        sessionStorage.removeItem('selectedBusiness');
        
        setExtractionProgress(100);
        
        // Show verification step
        setExtractingData(false);
        setShowVerification(true);
        setVerificationData({
          business_name: businessData.name || businessSearch || 'My Business',
          business_phone: businessData.phone || null,
          business_address: businessData.address || null,
          business_type: claudeData.businessType || businessData.types?.[0] || 'other',
          business_website: savedWebsiteUrl || businessData.website || null,
          business_timezone: 'America/New_York',
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setExtractingData(false);
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
                <p className="text-xs text-center text-muted-foreground">
                  {extractionProgress}% complete
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Verification Step Overlay */}
      {showVerification && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Verify Your Business Details</CardTitle>
              <p className="text-muted-foreground">Please review and update your information as needed</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-name">Business Name</Label>
                <Input
                  id="verify-name"
                  value={verificationData.business_name || ''}
                  onChange={(e) => setVerificationData({...verificationData, business_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-phone">Phone Number</Label>
                <Input
                  id="verify-phone"
                  value={verificationData.business_phone || ''}
                  onChange={(e) => setVerificationData({...verificationData, business_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-address">Business Address</Label>
                <Input
                  id="verify-address"
                  value={verificationData.business_address || ''}
                  onChange={(e) => setVerificationData({...verificationData, business_address: e.target.value})}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-type">Business Type</Label>
                <select
                  id="verify-type"
                  value={verificationData.business_type || 'other'}
                  onChange={(e) => setVerificationData({...verificationData, business_type: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="electric">Electric</option>
                  <option value="garage-door">Garage Door</option>
                  <option value="handyman">Handyman</option>
                  <option value="hvac">HVAC</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="pest-control">Pest Control</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="pool-spa">Pool & Spa</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="roofing">Roofing</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-website">Website</Label>
                <Input
                  id="verify-website"
                  value={verificationData.business_website || ''}
                  onChange={(e) => setVerificationData({...verificationData, business_website: e.target.value})}
                  placeholder="https://yourbusiness.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-timezone">Timezone</Label>
                <select
                  id="verify-timezone"
                  value={verificationData.business_timezone || 'America/New_York'}
                  onChange={(e) => setVerificationData({...verificationData, business_timezone: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="America/Phoenix">Arizona Time</option>
                  <option value="America/Anchorage">Alaska Time</option>
                  <option value="Pacific/Honolulu">Hawaii Time</option>
                </select>
              </div>

              <Button
                onClick={() => {
                  setShowVerification(false);
                  toast({
                    title: "Setup complete!",
                    description: "Welcome to your AI assistant dashboard",
                  });
                  setTimeout(() => {
                    window.location.href = '/settings?onboarding_complete=true';
                  }, 500);
                }}
                className="w-full mt-6"
                size="lg"
              >
                Let's Go!
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
      
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
                  Let&apos;s find your business
                </h1>
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
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !loading) {
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
                            if (e.key === 'Enter' && !loading) {
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
