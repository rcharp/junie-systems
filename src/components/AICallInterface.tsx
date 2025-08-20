import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Loader2 } from "lucide-react";

interface BusinessSettings {
  business_name?: string;
  business_type?: string;
  business_phone?: string;
  business_hours?: string;
  custom_greeting?: string;
  common_questions?: string;
}

const AICallInterface = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({});
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBusinessSettings();
    }
  }, [user]);

  const fetchBusinessSettings = async () => {
    try {
      setIsFetching(true);
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setBusinessSettings(data);
      }
    } catch (error: any) {
      console.error('Error fetching business settings:', error);
      toast({
        title: "Error",
        description: "Failed to load business settings",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleMakeCall = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to call",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    
    if (!phoneRegex.test(cleanedNumber)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('bland-call', {
        body: {
          phone_number: cleanedNumber,
          business_name: businessSettings.business_name || 'Your Business',
          business_type: businessSettings.business_type || 'General Business',
          custom_greeting: businessSettings.custom_greeting,
          common_questions: businessSettings.common_questions,
          business_hours: businessSettings.business_hours,
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Call initiated successfully! 📞",
          description: `AI assistant is calling ${phoneNumber}. The call will be logged in your dashboard.`,
        });
        setPhoneNumber("");
      } else {
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (error: any) {
      console.error('Error making call:', error);
      toast({
        title: "Call failed",
        description: error.message || "Failed to initiate the call. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Call Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Phone className="w-5 h-5" />
            <span>AI Call Assistant</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter the phone number you want the AI assistant to call
            </p>
          </div>
          
          <Button 
            onClick={handleMakeCall} 
            disabled={isLoading || !phoneNumber.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Initiating Call...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Make AI Call
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Business Information Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current AI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Name</Label>
              <p className="mt-1">{businessSettings.business_name || "Not configured"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Type</Label>
              <p className="mt-1">{businessSettings.business_type || "Not configured"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Hours</Label>
              <p className="mt-1">{businessSettings.business_hours || "Not configured"}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Business Phone</Label>
              <p className="mt-1">{businessSettings.business_phone || "Not configured"}</p>
            </div>
          </div>

          {businessSettings.custom_greeting && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Custom Greeting</Label>
              <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                {businessSettings.custom_greeting}
              </p>
            </div>
          )}

          {businessSettings.common_questions && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Common Questions & Answers</Label>
              <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md whitespace-pre-wrap">
                {businessSettings.common_questions}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/settings'}
            >
              Configure AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <p>Enter a phone number and click "Make AI Call" to have your AI assistant call that number</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <p>Your AI assistant will introduce itself using your business information and custom greeting</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <p>The AI will handle the conversation professionally, answer questions, and capture important information</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                4
              </div>
              <p>All call details, messages, and recordings will appear in your dashboard for follow-up</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICallInterface;