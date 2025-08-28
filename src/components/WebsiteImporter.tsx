import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Globe, Loader2, Download } from 'lucide-react';

interface ExtractedData {
  business_name?: string;
  business_phone?: string;
  business_email?: string;
  business_address?: string;
  business_hours?: string;
  services_offered?: string;
  pricing_structure?: string;
  business_description?: string;
}

interface WebsiteImporterProps {
  onDataExtracted: (data: ExtractedData) => void;
  className?: string;
}

export const WebsiteImporter = ({ onDataExtracted, className }: WebsiteImporterProps) => {
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
        
        onDataExtracted(data.data);
        
        toast({
          title: "Success",
          description: "Business data extracted successfully! Please review and correct any information as needed.",
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