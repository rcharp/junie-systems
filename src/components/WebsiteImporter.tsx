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
        throw error;
      }

      if (data.success && data.data) {
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

  const parseAddress = (addressString: string): AddressData => {
    if (!addressString) return { street: '', city: '', state: '', zip: '' };
    
    // Simple address parsing - this could be improved with more sophisticated regex
    const parts = addressString.split(',').map(part => part.trim());
    
    if (parts.length >= 3) {
      const street = parts[0] || '';
      const city = parts[1] || '';
      const stateZip = parts[2] || '';
      
      // Extract state and ZIP from the last part
      const stateZipMatch = stateZip.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
      const state = stateZipMatch ? stateZipMatch[1] : stateZip;
      const zip = stateZipMatch ? stateZipMatch[2] : '';
      
      return { street, city, state, zip };
    }
    
    return { street: addressString, city: '', state: '', zip: '' };
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Import from Website
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website URL</Label>
          <Input
            id="websiteUrl"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://yourbusiness.com or google.com/maps/place/..."
            disabled={isLoading}
          />
        </div>
        
        <Button 
          onClick={handleImport}
          disabled={isLoading || !websiteUrl.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Extracting Data...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import Business Data
            </>
          )}
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Enter your business website, Google My Business, Yelp page, or any webpage with your business information.
          We'll extract relevant details like business name, phone, address, and services.
        </p>
      </CardContent>
    </Card>
  );
};