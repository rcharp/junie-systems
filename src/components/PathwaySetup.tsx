import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Loader2, Settings, CheckCircle } from 'lucide-react';

export const PathwaySetup = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pathwayCreated, setPathwayCreated] = useState(false);
  const [pathwayId, setPathwayId] = useState('');
  const [formData, setFormData] = useState({
    business_name: 'Availabee',
    business_type: 'AI Answering Service',
    business_hours: '24/7 - Always Available',
    business_address: 'Available Nationwide',
    business_phone: '',
    custom_greeting: '',
    common_questions: `Q: What services do you offer?
A: We provide 24/7 AI answering services, appointment booking, lead capture, and customer service support.

Q: How does your AI answering service work?
A: Our AI assistant answers your calls professionally, captures customer information, books appointments, and handles inquiries naturally.

Q: What are your rates?
A: We offer flexible pricing plans starting from basic call handling to comprehensive business solutions. I can schedule a consultation to discuss pricing.

Q: Can you integrate with my existing systems?
A: Yes, we can integrate with most scheduling systems, CRMs, and business tools. Let me connect you with our technical team.`,
    forwarding_number: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreatePathway = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-answering-pathway', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        setPathwayCreated(true);
        setPathwayId(data.pathway_id);
        toast({
          title: "Pathway Created Successfully!",
          description: `Your AI answering service is now configured. Pathway ID: ${data.pathway_id}`,
        });
      } else {
        throw new Error(data.error || 'Failed to create pathway');
      }
    } catch (error) {
      console.error('Error creating pathway:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create answering service pathway",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (pathwayCreated) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-6 w-6" />
            AI Answering Service Pathway Created!
          </CardTitle>
          <CardDescription>
            Your comprehensive AI answering service is now active and ready to handle incoming calls.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">Pathway ID: {pathwayId}</h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Your AI assistant is configured with American female voice and can handle:
            </p>
            <ul className="list-disc list-inside text-green-700 dark:text-green-300 text-sm mt-2 space-y-1">
              <li>Professional greeting and call routing</li>
              <li>Appointment booking and scheduling</li>
              <li>Customer service inquiries</li>
              <li>Urgent issue handling and escalation</li>
              <li>Call transfers when needed</li>
              <li>Lead capture and information gathering</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Next Steps:</h3>
            <ol className="list-decimal list-inside text-blue-700 dark:text-blue-300 text-sm space-y-1">
              <li>Configure your phone number with Bland AI to use this pathway</li>
              <li>Test the system by calling your configured number</li>
              <li>Monitor call logs and messages in your dashboard</li>
              <li>Adjust settings as needed for your business</li>
            </ol>
          </div>

          <Button 
            onClick={() => {
              setPathwayCreated(false);
              setPathwayId('');
            }}
            variant="outline"
            className="w-full"
          >
            Create Another Pathway
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Create AI Answering Service Pathway
        </CardTitle>
        <CardDescription>
          Set up a comprehensive AI answering service using Bland AI's Pathway technology. 
          This will create a natural, conversational AI that handles appointments, inquiries, and customer service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name *</Label>
            <Input
              id="business_name"
              placeholder="Availabee"
              value={formData.business_name}
              onChange={(e) => handleInputChange('business_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type *</Label>
            <Input
              id="business_type"
              placeholder="AI Answering Service"
              value={formData.business_type}
              onChange={(e) => handleInputChange('business_type', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_hours">Business Hours</Label>
            <Input
              id="business_hours"
              placeholder="9 AM - 5 PM EST"
              value={formData.business_hours}
              onChange={(e) => handleInputChange('business_hours', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_phone">Business Phone</Label>
            <Input
              id="business_phone"
              placeholder="Main business line"
              value={formData.business_phone}
              onChange={(e) => handleInputChange('business_phone', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="business_address">Business Address/Service Area</Label>
          <Input
            id="business_address"
            placeholder="Available Nationwide"
            value={formData.business_address}
            onChange={(e) => handleInputChange('business_address', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom_greeting">Custom Greeting (Optional)</Label>
          <Textarea
            id="custom_greeting"
            placeholder="Hello! Thank you for calling [Business Name]. This is your AI assistant..."
            value={formData.custom_greeting}
            onChange={(e) => handleInputChange('custom_greeting', e.target.value)}
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Leave blank to use the default professional greeting
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="common_questions">Common Questions & Answers</Label>
          <Textarea
            id="common_questions"
            value={formData.common_questions}
            onChange={(e) => handleInputChange('common_questions', e.target.value)}
            rows={8}
          />
          <p className="text-sm text-muted-foreground">
            Pre-loaded with Availabee service information. Customize for your business.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="forwarding_number">Forwarding Number (Optional)</Label>
          <Input
            id="forwarding_number"
            placeholder="+1234567890"
            value={formData.forwarding_number}
            onChange={(e) => handleInputChange('forwarding_number', e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Number to transfer calls to when human assistance is needed
          </p>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">AI Features Included:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-amber-700 dark:text-amber-300 text-sm">
            <div>• Professional American female voice</div>
            <div>• Natural conversation flow</div>
            <div>• Appointment booking system</div>
            <div>• Customer inquiry handling</div>
            <div>• Urgent issue escalation</div>
            <div>• Call transfer capabilities</div>
            <div>• Lead capture & contact collection</div>
            <div>• Multi-scenario handling</div>
          </div>
        </div>

        <Button 
          onClick={handleCreatePathway} 
          disabled={isLoading || !formData.business_name || !formData.business_type}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Pathway...
            </>
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
              Create AI Answering Service
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};