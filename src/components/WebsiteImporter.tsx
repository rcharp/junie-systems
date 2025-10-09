import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, Building2, MapPin } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BusinessPrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface WebsiteImporterProps {
  onDataExtracted?: (data: any) => void;
  className?: string;
}

export const WebsiteImporter = ({ onDataExtracted, className }: WebsiteImporterProps) => {
  const { toast } = useToast();
  const [businessSearch, setBusinessSearch] = useState('');
  const [searchResults, setSearchResults] = useState<BusinessPrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSelectingBusinessRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Search for businesses as user types
    if (businessSearch.trim().length >= 2 && !isSelectingBusinessRef.current && !selectedBusiness) {
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
  }, [businessSearch, selectedBusiness, toast]);

  const handleBusinessSelect = async (business: BusinessPrediction) => {
    isSelectingBusinessRef.current = true;
    setSelectedBusiness(business);
    setBusinessSearch(business.structured_formatting.main_text);
    setShowResults(false);
    setIsLoading(true);

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

      if (onDataExtracted) {
        onDataExtracted({
          business_name: businessDetails.name,
          business_phone: businessDetails.formatted_phone_number,
          business_address: businessDetails.formatted_address,
          business_description: descData.description,
          business_type: descData.businessType,
          business_website: businessDetails.website,
        });
      }

      toast({
        title: "Success",
        description: "Business data imported successfully!",
      });

      // Clear selection
      setBusinessSearch('');
      setSelectedBusiness(null);
    } catch (error: any) {
      console.error('Error importing business data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to import business data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        isSelectingBusinessRef.current = false;
      }, 500);
    }
  };

  return (
    <Card className={`bg-primary/5 border-primary/20 ${className}`}>
      <CardContent className="pt-6">
        <div className="space-y-2 mb-3">
          <Label htmlFor="businessSearch">Import Business Information</Label>
          <p className="text-sm text-muted-foreground">
            Search for your business to automatically import details
          </p>
        </div>
        <div className="relative" ref={searchContainerRef}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <Input
            id="businessSearch"
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
            className="pl-12 h-12"
            disabled={isLoading}
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
                      disabled={isLoading}
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
        {isLoading && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Importing business data...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};