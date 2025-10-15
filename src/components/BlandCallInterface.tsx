import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Loader2 } from 'lucide-react';
import { formatPhoneNumber, normalizePhoneNumber } from '@/lib/phone-utils';

export const BlandCallInterface = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone_number: '',
    business_name: '',
    business_type: '',
    custom_greeting: '',
    common_questions: '',
    business_hours: '',
    task: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMakeCall = async () => {
    if (!formData.phone_number) {
      toast({
        title: "Error",
        description: "Phone number is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Send normalized phone number to API
      const { data, error } = await supabase.functions.invoke('bland-call', {
        body: {
          ...formData,
          phone_number: normalizePhoneNumber(formData.phone_number)
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Call Initiated",
          description: `Call started successfully. Call ID: ${data.call_id}`,
        });
        
        // Reset phone number but keep business settings
        setFormData(prev => ({ ...prev, phone_number: '' }));
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error making call:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Bland AI Call Service
        </CardTitle>
        <CardDescription>
          Make AI-powered phone calls using Bland AI's voice technology
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number *</Label>
            <Input
              id="phone_number"
              type="tel"
              placeholder="(555) 123-4567"
              value={formatPhoneNumber(formData.phone_number)}
              onChange={(e) => handleInputChange('phone_number', normalizePhoneNumber(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_name">Business Name</Label>
            <Input
              id="business_name"
              placeholder="Junie"
              value={formData.business_name}
              onChange={(e) => handleInputChange('business_name', e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="business_type">Business Type</Label>
            <Input
              id="business_type"
              placeholder="AI Call Service"
              value={formData.business_type}
              onChange={(e) => handleInputChange('business_type', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business_hours">Business Hours</Label>
            <Input
              id="business_hours"
              placeholder="9 AM - 5 PM EST"
              value={formData.business_hours}
              onChange={(e) => handleInputChange('business_hours', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="custom_greeting">Custom Greeting</Label>
          <Textarea
            id="custom_greeting"
            placeholder="Thank you for calling [Business Name]. This is Junie, your AI assistant..."
            value={formData.custom_greeting}
            onChange={(e) => handleInputChange('custom_greeting', e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="common_questions">Common Questions & Answers</Label>
          <Textarea
            id="common_questions"
            placeholder="Q: What are your hours? A: We're open 9 AM to 5 PM EST..."
            value={formData.common_questions}
            onChange={(e) => handleInputChange('common_questions', e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task">Custom Task (Optional)</Label>
          <Textarea
            id="task"
            placeholder="Override the default AI instructions with custom task..."
            value={formData.task}
            onChange={(e) => handleInputChange('task', e.target.value)}
            rows={3}
          />
        </div>

        <Button 
          onClick={handleMakeCall} 
          disabled={isLoading || !formData.phone_number}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initiating Call...
            </>
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
              Make Call
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
