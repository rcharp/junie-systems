import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Loader2, Download } from 'lucide-react';

interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface ExtractedData {
  business_name?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_hours?: string;
  services_offered?: string;
  pricing_structure?: string;
  business_description?: string;
  business_type?: string;
  business_website?: string;
  address?: AddressData;
}

interface WebsiteImporterProps {
  onDataExtracted: (data: ExtractedData) => void;
  autoSave?: boolean;
  className?: string;
}

export const WebsiteImporter = ({ onDataExtracted, autoSave = false, className }: WebsiteImporterProps) => {
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleImport = async () => {
    if (!websiteUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a website URL",
        variant: "destructive",
      });
      return;
    }

    // Add protocol if missing
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setIsLoading(true);

    try {
      console.log('Extracting data from:', url);
      
      const { data, error } = await supabase.functions.invoke('extract-business-data', {
        body: { url }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to extract business data');
      }

      console.log('Extraction response:', data);

      if (data?.success && data?.data) {
        console.log('Extracted data:', data.data);
        
        // Parse address into separate fields
        const parsedData = {
          ...data.data,
          business_website: url,
          address: parseAddress(data.data.business_address || '')
        };
        
        onDataExtracted(parsedData);
        
        // Always auto-save the extracted data
        try {
          await saveBusinessData(parsedData);
          console.log('Data auto-saved to database');
        } catch (saveError) {
          console.error('Auto-save failed:', saveError);
          // Don't show error for auto-save failure, just log it
        }
        
        toast({
          title: "Success",
          description: "Business data extracted and saved successfully! Please review and correct any information as needed.",
        });
        
        setWebsiteUrl('');
      } else {
        throw new Error(data.error || 'Failed to extract business data');
      }
    } catch (error) {
      console.error('Error extracting business data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to extract business data from the website",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeStreetTypes = (street: string): string => {
    const streetTypes = {
      'St.': 'Street', 'St': 'Street',
      'Ave.': 'Avenue', 'Ave': 'Avenue',
      'Blvd.': 'Boulevard', 'Blvd': 'Boulevard',
      'Dr.': 'Drive', 'Dr': 'Drive',
      'Rd.': 'Road', 'Rd': 'Road',
      'Ln.': 'Lane', 'Ln': 'Lane',
      'Ct.': 'Court', 'Ct': 'Court',
      'Pl.': 'Place', 'Pl': 'Place',
      'Pkwy.': 'Parkway', 'Pkwy': 'Parkway',
      'Cir.': 'Circle', 'Cir': 'Circle',
      'Ter.': 'Terrace', 'Ter': 'Terrace',
      'Way.': 'Way', 'Wy': 'Way'
    };

    const directions = {
      'N.': 'North', 'N': 'North',
      'S.': 'South', 'S': 'South',
      'E.': 'East', 'E': 'East',
      'W.': 'West', 'W': 'West',
      'NE.': 'Northeast', 'NE': 'Northeast',
      'NW.': 'Northwest', 'NW': 'Northwest',
      'SE.': 'Southeast', 'SE': 'Southeast',
      'SW.': 'Southwest', 'SW': 'Southwest'
    };

    let normalized = street;
    
    // Replace street types (with word boundaries)
    Object.entries(streetTypes).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    });

    // Replace directions (with word boundaries)
    Object.entries(directions).forEach(([abbrev, full]) => {
      const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    });

    return normalized;
  };

  const normalizeState = (state: string): string => {
    const stateMap = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
      'DC': 'District of Columbia'
    };

    return stateMap[state.toUpperCase()] || state;
  };

  const parseAddress = (addressString: string): AddressData => {
    if (!addressString) return { street: '', city: '', state: '', zip: '' };
    
    // Simple address parsing - this could be improved with more sophisticated regex
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length >= 3) {
      const street = normalizeStreetTypes(parts[0] || '');
      const city = parts[1] || '';
      const stateZip = parts[2] || '';
      
      // Extract state and ZIP from the last part
      const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
      const state = stateZipMatch ? normalizeState(stateZipMatch[1]) : normalizeState(stateZip);
      const zip = stateZipMatch ? stateZipMatch[2] : '';
      
      return { street, city, state, zip };
    }
    
    return { street: normalizeStreetTypes(addressString), city: '', state: '', zip: '' };
  };

  const saveBusinessData = async (extractedData: ExtractedData) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('business_settings')
        .upsert({
          user_id: user.data.user.id,
          business_name: extractedData.business_name,
          business_phone: extractedData.business_phone,
          business_address: extractedData.business_address,
          business_hours: extractedData.business_hours,
          services_offered: extractedData.services_offered,
          pricing_structure: extractedData.pricing_structure,
          business_description: extractedData.business_description,
          business_type: extractedData.business_type,
          business_website: extractedData.business_website,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Database save error:', error);
        throw error;
      }
      
      console.log('Business data saved successfully to database');
    } catch (error) {
      console.error('Error saving business data:', error);
      throw error;
    }
  };

  return (
    <Card className={`bg-primary/5 border-primary/20 ${className}`}>
      <CardContent className="pt-6">
        <div className="space-y-2 mb-3">
          <Label htmlFor="websiteUrl">Import Business Information</Label>
          <p className="text-sm text-muted-foreground">
            Enter a Google Business Profile, Yelp page, or website URL to extract and auto-fill your business details
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1">
            <Input
              id="websiteUrl"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Enter Google Business, Yelp, or website URL..."
              disabled={isLoading}
            />
          </div>
          <Button 
            onClick={handleImport}
            disabled={isLoading || !websiteUrl.trim()}
            className="bg-gradient-primary hover:opacity-90 text-white border-none w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};