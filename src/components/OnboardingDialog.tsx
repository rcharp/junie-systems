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
}

export const OnboardingDialog = ({ open, onOpenChange }: OnboardingDialogProps) => {
  const [step, setStep] = useState(1);
  const [businessSearch, setBusinessSearch] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [useWebsite, setUseWebsite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<BusinessPrediction[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessPrediction | null>(null);
  const [forwardingNumber, setForwardingNumber] = useState("");
  const [forwardingNumberError, setForwardingNumberError] = useState(false);
  const [savingForwarding, setSavingForwarding] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
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
    setStep(2);
    setTimeout(() => {
      isSelectingBusinessRef.current = false;
    }, 500);
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

  const handleClose = () => {
    setStep(1);
    setBusinessSearch("");
    setWebsiteUrl("");
    setUseWebsite(false);
    setSelectedBusiness(null);
    setForwardingNumber("");
    setSmsOptIn(false);
    onOpenChange(false);
  };

  const progressValue = step === 1 ? 50 : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 1 ? "Update Business Information" : "Update Call Transfer Settings"}
          </DialogTitle>
        </DialogHeader>

        <Progress value={progressValue} className="h-2 mb-4" />

        {step === 1 ? (
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
                      />
                    </div>

                    <Button
                      onClick={handleBusinessContinue}
                      className="w-full"
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
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-2">
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="forwarding-number">Call Transfer Number</Label>
                  <Input
                    id="forwarding-number"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={forwardingNumber}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, "");
                      if (value.length > 10) value = value.slice(0, 10);
                      
                      let formatted = value;
                      if (value.length >= 6) {
                        formatted = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
                      } else if (value.length >= 3) {
                        formatted = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                      }
                      
                      setForwardingNumber(formatted);
                      setForwardingNumberError(value.length > 0 && value.length !== 10);
                    }}
                    className={forwardingNumberError ? "border-destructive" : ""}
                    autoFocus
                  />
                    {forwardingNumberError && (
                      <p className="text-sm text-destructive">Please enter a valid 10-digit phone number</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Enter the phone number that you want urgent customer calls to be transferred to if they request to speak with a human. You will also receive SMS notifications here.
                    </p>
                  </div>

                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="sms-opt-in"
                      checked={smsOptIn}
                      onCheckedChange={(checked) => setSmsOptIn(checked === true)}
                    />
                    <div className="space-y-1 flex-1">
                      <label
                        htmlFor="sms-opt-in"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Receive SMS notifications <span className="text-red-500">*</span>
                      </label>
                      <p className="text-sm text-muted-foreground">
                        By checking this box, you agree to receive text messages (SMS) about appointments, 
                        call notifications, and service updates at this number. Message and data rates may apply. 
                        Reply STOP to opt out anytime.
                      </p>
                    </div>
                  </div>
                  {!smsOptIn && (
                    <p className="text-sm text-destructive">
                      You must agree to receive SMS notifications to continue
                    </p>
                  )}
                </div>

                <Button
                  onClick={async () => {
                    const digits = forwardingNumber.replace(/\D/g, "");
                    if (digits.length !== 10) {
                      setForwardingNumberError(true);
                      return;
                    }

                    if (!smsOptIn) {
                      toast({
                        title: "SMS consent required",
                        description: "Please agree to receive SMS notifications to continue",
                        variant: "destructive"
                      });
                      return;
                    }

                    setSavingForwarding(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        throw new Error("Not authenticated");
                      }

                      const { error } = await supabase
                        .from("business_settings")
                        .update({ 
                          forwarding_number: forwardingNumber,
                          sms_notifications: smsOptIn
                        })
                        .eq("user_id", session.user.id);

                      if (error) throw error;

                      toast({
                        title: "Settings updated!",
                        description: "Your call transfer settings have been saved",
                      });
                      
                      handleClose();
                    } catch (error: any) {
                      console.error("Error saving settings:", error);
                      toast({
                        title: "Error",
                        description: "Failed to save settings. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setSavingForwarding(false);
                    }
                  }}
                  className="w-full"
                  disabled={savingForwarding || forwardingNumberError || !forwardingNumber || !smsOptIn}
                >
                  {savingForwarding ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save Settings
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full"
                  disabled={savingForwarding}
                >
                  ← Back
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
