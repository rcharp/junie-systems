import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const PathwayUpdater = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pathwayUpdated, setPathwayUpdated] = useState(false);
  const [formData, setFormData] = useState({
    pathway_id: '5e56349e-f1a5-488c-b0c3-e20b3169ba61',
    business_name: 'Professional Home Services',
    business_type: 'Home Service Company',
    business_hours: 'Monday-Friday 8AM-6PM, Saturday 9AM-4PM',
    services_offered: ['Plumbing', 'Electrical', 'HVAC', 'General Repairs', 'Water Heater Service', 'Drain Cleaning', 'Emergency Repairs'],
    service_areas: ['Metro Area', 'Suburbs', '30-mile radius'],
    emergency_available: true,
    pricing_structure: 'Free estimates, competitive pricing, no hidden fees',
    license_info: 'Licensed, bonded, and insured',
    insurance_info: 'Fully insured for your protection',
    warranty_info: 'All work guaranteed - 1 year warranty',
    payment_methods: ['Cash', 'Check', 'All major credit cards', 'Financing available']
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdatePathway = async () => {
    if (!formData.pathway_id) {
      toast({
        title: "Error",
        description: "Pathway ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-pathway', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        setPathwayUpdated(true);
        toast({
          title: "Pathway Updated Successfully!",
          description: `Updated ${data.updated_nodes} conversation nodes with comprehensive home service flows.`,
        });
      } else {
        throw new Error(data.error || 'Failed to update pathway');
      }
    } catch (error) {
      console.error('Error updating pathway:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update pathway",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (pathwayUpdated) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            Pathway Updated Successfully!
          </CardTitle>
          <CardDescription>
            Your pathway now includes comprehensive home service conversation flows and edge cases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
              Pathway ID: {formData.pathway_id}
            </h3>
            <p className="text-green-700 dark:text-green-300 text-sm mb-3">
              Your AI assistant now handles these scenarios professionally:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <Badge variant="outline" className="text-green-700">Emergency Triage</Badge>
                <Badge variant="outline" className="text-green-700">Quote Generation</Badge>
                <Badge variant="outline" className="text-green-700">Appointment Scheduling</Badge>
                <Badge variant="outline" className="text-green-700">Service Information</Badge>
              </div>
              <div className="space-y-1">
                <Badge variant="outline" className="text-green-700">Warranty Claims</Badge>
                <Badge variant="outline" className="text-green-700">Follow-up Support</Badge>
                <Badge variant="outline" className="text-green-700">Payment Discussion</Badge>
                <Badge variant="outline" className="text-green-700">Technical Support</Badge>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Edge Cases Covered:</h3>
            <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 text-sm space-y-1">
              <li>Emergency vs non-emergency classification</li>
              <li>Complex quote requests requiring on-site evaluation</li>
              <li>Outside service area handling with referrals</li>
              <li>Budget constraint discussions and financing options</li>
              <li>Same-day service requests and availability</li>
              <li>Warranty claims and troubleshooting</li>
              <li>Follow-up calls and complaint resolution</li>
              <li>Multiple property types and access requirements</li>
            </ul>
          </div>

          <Button 
            onClick={() => {
              setPathwayUpdated(false);
            }}
            variant="outline"
            className="w-full"
          >
            Update Pathway Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Update Existing Pathway
        </CardTitle>
        <CardDescription>
          Update pathway ID: <code className="bg-muted px-2 py-1 rounded text-sm">{formData.pathway_id}</code> with comprehensive home service conversation flows and edge cases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="pathway_id">Pathway ID *</Label>
          <Input
            id="pathway_id"
            value={formData.pathway_id}
            onChange={(e) => handleInputChange('pathway_id', e.target.value)}
            placeholder="Enter pathway ID to update"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              value={formData.business_name}
              onChange={(e) => handleInputChange('business_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type *</Label>
            <Input
              id="business_type"
              value={formData.business_type}
              onChange={(e) => handleInputChange('business_type', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_hours">Business Hours</Label>
          <Input
            id="business_hours"
            value={formData.business_hours}
            onChange={(e) => handleInputChange('business_hours', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="services_offered">Services Offered</Label>
          <Textarea
            id="services_offered"
            value={formData.services_offered.join(', ')}
            onChange={(e) => handleInputChange('services_offered', e.target.value.split(', '))}
            placeholder="Plumbing, Electrical, HVAC, General Repairs..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="service_areas">Service Areas</Label>
          <Textarea
            id="service_areas"
            value={formData.service_areas.join(', ')}
            onChange={(e) => handleInputChange('service_areas', e.target.value.split(', '))}
            placeholder="Metro Area, Suburbs, 30-mile radius..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pricing_structure">Pricing Structure</Label>
            <Input
              id="pricing_structure"
              value={formData.pricing_structure}
              onChange={(e) => handleInputChange('pricing_structure', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="warranty_info">Warranty Information</Label>
            <Input
              id="warranty_info"
              value={formData.warranty_info}
              onChange={(e) => handleInputChange('warranty_info', e.target.value)}
            />
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Conversation Flows Being Added:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-amber-700 dark:text-amber-300 text-sm">
            <div>• Emergency service triage</div>
            <div>• Detailed quote collection</div>
            <div>• Smart appointment scheduling</div>
            <div>• Service information hub</div>
            <div>• Follow-up & warranty support</div>
            <div>• Payment options discussion</div>
            <div>• Technical troubleshooting</div>
            <div>• Professional call transfers</div>
          </div>
        </div>

        <Button 
          onClick={handleUpdatePathway} 
          disabled={isLoading || !formData.pathway_id}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Pathway...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Pathway with Home Service Flows
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};