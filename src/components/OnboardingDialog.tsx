import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ArrowRight, Loader2, Globe, MapPin, Building2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface BusinessPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataImported?: () => void;
}

export const OnboardingDialog = ({ open, onOpenChange, onDataImported }: OnboardingDialogProps) => {
  const [businessSearch, setBusinessSearch] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useWebsite, setUseWebsite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BusinessPrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPrediction | null>(null);
  const isSelectingBusinessRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Search for businesses as user types
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
    setLoading(true);

    try {
      // Get business details
      const { data: detailsData, error: detailsError } = await supabase.functions.invoke('get-business-details', {
        body: { placeId: business.place_id }
      });

      if (detailsError) throw detailsError;

      const businessDetails = detailsData?.result || detailsData;
      
      if (!businessDetails) {
        throw new Error('No business details found');
      }

      // Generate business description
      const { data: descData, error: descError } = await supabase.functions.invoke('generate-business-description', {
        body: {
          businessName: businessDetails.name,
          businessType: businessDetails.types?.[0] || 'business',
          address: businessDetails.formatted_address
        }
      });

      if (descError) throw descError;

      // Extract services
      const { data: servicesData, error: servicesError } = await supabase.functions.invoke('extract-services', {
        body: {
          businessName: businessDetails.name,
          businessType: descData.businessType || businessDetails.types?.[0] || 'business',
          businessDescription: descData.description
        }
      });

      if (servicesError) throw servicesError;

      // Save to database
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) {
        throw new Error('User not authenticated');
      }

      const { error: saveError } = await supabase
        .from('business_settings')
        .upsert({
          user_id: user.data.user.id,
          business_name: businessDetails.name,
          business_phone: businessDetails.formatted_phone_number,
          business_address: businessDetails.formatted_address,
          business_hours: businessDetails.opening_hours?.weekday_text?.join('\n'),
          business_description: descData.description,
          business_type: descData.businessType,
          business_website: businessDetails.website,
        }, {
          onConflict: 'user_id'
        });

      if (saveError) throw saveError;

      // Save services
      if (servicesData?.services && Array.isArray(servicesData.services)) {
        const { data: businessData } = await supabase
          .from('business_settings')
          .select('id')
          .eq('user_id', user.data.user.id)
          .single();

        if (businessData) {
          const servicesWithBusinessId = servicesData.services.map((service: any, index: number) => ({
            business_id: businessData.id,
            name: service.name,
            description: service.description,
            price: service.price,
            display_order: index,
            is_active: true
          }));

          await supabase.from('services').upsert(servicesWithBusinessId, {
            onConflict: 'business_id,name'
          });
        }
      }

      toast({
        title: "Success",
        description: "Business data imported successfully!",
      });

      // Notify parent component
      if (onDataImported) {
        onDataImported();
      }

      // Close dialog
      handleClose();
    } catch (error: any) {
      console.error('Error importing business data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to import business data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => {
        isSelectingBusinessRef.current = false;
      }, 500);
    }
  };


  const handleClose = () => {
    setBusinessSearch("");
    setWebsiteUrl("");
    setUseWebsite(false);
    setSelectedBusiness(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Import Business Information
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-center">
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
                        className="pl-12 h-12"
                        autoFocus
                        disabled={loading}
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                      )}
                      
                      {showResults && searchResults.length > 0 && (
                        <Card className="absolute w-full mt-2 z-50 shadow-lg border-2">
                          <ScrollArea className="h-[200px]">
                            <div className="p-2">
                              {searchResults.map((result) => (
                                <button
                                  key={result.place_id}
                                  onClick={() => handleBusinessSelect(result)}
                                  disabled={loading}
                                  className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors flex items-start gap-3 group disabled:opacity-50"
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
                    </div>

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
                      disabled={loading}
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
                        className="pl-12 h-12"
                        autoFocus
                        disabled={loading}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setUseWebsite(false)}
                      className="w-full"
                      disabled={loading}
                    >
                      Search for my business instead
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loading} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              Importing Business Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Fetching business details...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-75" />
                <span>Generating business description...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150" />
                <span>Extracting services...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300" />
                <span>Saving to database...</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              This may take a few moments. Please don't close this window.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
