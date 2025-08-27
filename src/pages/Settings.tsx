import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building, Phone, Bot, Bell, User, Shield, Save, Plus, Trash2, Globe } from "lucide-react";
import { WebhookInfo } from "@/components/WebhookInfo";
import NotificationSettings from "@/components/NotificationSettings";

// Fixed: Removed servicesOffered and pricingStructure state variables

const Settings = () => {
  console.log("Settings component rendering...");
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  console.log("Settings state:", { user: user?.email, loading });

  // Business Info State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessHours, setBusinessHours] = useState([
    { day: "sunday", isOpen: false, openTime: "09:00", closeTime: "17:00" },
    { day: "monday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { day: "tuesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { day: "wednesday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { day: "thursday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { day: "friday", isOpen: true, openTime: "09:00", closeTime: "17:00" },
    { day: "saturday", isOpen: false, openTime: "09:00", closeTime: "17:00" },
  ]);
  const [services, setServices] = useState<{name: string, price: string}[]>([
    { name: "", price: "" }
  ]);

  // Call Settings State
  const [forwardingNumber, setForwardingNumber] = useState("");
  const [urgentKeywords, setUrgentKeywords] = useState("");
  const [autoForward, setAutoForward] = useState(false);
  const [recordCalls, setRecordCalls] = useState(true);
  const [maxCallDuration, setMaxCallDuration] = useState("5");

  // AI Settings State
  const [aiPersonality, setAiPersonality] = useState("professional");
  const [customGreeting, setCustomGreeting] = useState("");
  const [commonQuestions, setCommonQuestions] = useState("");
  const [appointmentBooking, setAppointmentBooking] = useState(false);
  const [leadCapture, setLeadCapture] = useState(true);

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [instantAlerts, setInstantAlerts] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    } else if (user) {
      loadUserSettings(user.id);
    }
  }, [loading, user, navigate]);

  const loadUserSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setBusinessName(data.business_name || "");
        setBusinessType(data.business_type || "");
        setBusinessPhone(data.business_phone || "");
        setBusinessAddress(data.business_address || "");
        // Parse business hours
        if (data.business_hours) {
          try {
            const hoursData = JSON.parse(data.business_hours);
            if (Array.isArray(hoursData)) {
              setBusinessHours(hoursData);
            }
          } catch (e) {
            // Keep default hours if parsing fails
          }
        }
        setBusinessDescription(data.business_description || "");
        setBusinessWebsite(data.business_website || "");
        setForwardingNumber(data.forwarding_number || "");
        setUrgentKeywords(data.urgent_keywords || "");
        setAutoForward(data.auto_forward || false);
        setRecordCalls(data.record_calls !== false);
        setMaxCallDuration(data.max_call_duration?.toString() || "5");
        setAiPersonality(data.ai_personality || "professional");
        setCustomGreeting(data.custom_greeting || "");
        setCommonQuestions(data.common_questions || "");
        setAppointmentBooking(data.appointment_booking || false);
        setLeadCapture(data.lead_capture !== false);
        setEmailNotifications(data.email_notifications !== false);
        setSmsNotifications(data.sms_notifications || false);
        setPushNotifications(data.push_notifications !== false);
        setInstantAlerts(data.instant_alerts !== false);
        
        // Parse services from pricing_structure and services_offered
        if (data.services_offered) {
          try {
            const servicesData = JSON.parse(data.services_offered);
            if (Array.isArray(servicesData)) {
              setServices(servicesData.length > 0 ? servicesData : [{ name: "", price: "" }]);
            }
          } catch (e) {
            setServices([{ name: "", price: "" }]);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const addService = () => {
    setServices([...services, { name: "", price: "" }]);
  };

  const removeService = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const updateService = (index: number, field: 'name' | 'price', value: string) => {
    const newServices = [...services];
    newServices[index][field] = value;
    setServices(newServices);
  };

  const updateBusinessHours = (index: number, field: keyof typeof businessHours[0], value: string | boolean) => {
    const newHours = [...businessHours];
    newHours[index] = { ...newHours[index], [field]: value };
    setBusinessHours(newHours);
  };

  const dayNames = {
    sunday: "Sunday",
    monday: "Monday", 
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday"
  };

  const saveSettings = async (section: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      let updateData: any = {};

      if (section === "Business") {
        updateData = {
          business_name: businessName,
          business_type: businessType,
          business_phone: businessPhone,
          business_address: businessAddress,
          business_hours: JSON.stringify(businessHours),
          business_description: businessDescription,
          business_website: businessWebsite,
          services_offered: JSON.stringify(services.filter(s => s.name.trim() !== "")),
          pricing_structure: services.map(s => `${s.name}: ${s.price}`).join(', ')
        };
      } else if (section === "Call") {
        updateData = {
          forwarding_number: forwardingNumber,
          urgent_keywords: urgentKeywords,
          auto_forward: autoForward,
          record_calls: recordCalls,
          max_call_duration: parseInt(maxCallDuration)
        };
      } else if (section === "AI Assistant") {
        updateData = {
          ai_personality: aiPersonality,
          custom_greeting: customGreeting,
          common_questions: commonQuestions,
          appointment_booking: appointmentBooking,
          lead_capture: leadCapture
        };
      } else if (section === "Notifications") {
        updateData = {
          email_notifications: emailNotifications,
          sms_notifications: smsNotifications,
          push_notifications: pushNotifications,
          instant_alerts: instantAlerts
        };
      }

      const { data, error } = await supabase
        .from('business_settings')
        .upsert({
          user_id: user.id,
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      toast({
        title: "Settings saved",
        description: `Your ${section.toLowerCase()} settings have been updated successfully.`,
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center">
              <img 
                src="/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png" 
                alt="Availabee Logo" 
                className="h-8 w-8"
              />
            </Link>
            <h1 className="text-xl font-bold text-primary">Settings</h1>
          </div>
          
          <Badge variant="outline">
            {user?.email}
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Account Settings</h2>
            <p className="text-muted-foreground">
              Configure your Availabee assistant and account preferences.
            </p>
          </div>

          <Tabs defaultValue="business" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                <span className="hidden sm:inline">Business</span>
              </TabsTrigger>
              <TabsTrigger value="calls" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Calls</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">AI</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
            </TabsList>

            {/* Business Information */}
            <TabsContent value="business">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Your Business Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select value={businessType} onValueChange={setBusinessType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="electric">Electric Services</SelectItem>
                          <SelectItem value="garage-door">Garage Door Services</SelectItem>
                          <SelectItem value="handyman">Handyman Services</SelectItem>
                          <SelectItem value="hvac">HVAC & Air Conditioning</SelectItem>
                          <SelectItem value="landscaping">Landscaping</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="pest-control">Pest Control</SelectItem>
                          <SelectItem value="plumbing">Plumbing</SelectItem>
                          <SelectItem value="pool-spa">Pool & Spa Services</SelectItem>
                          <SelectItem value="cleaning">Professional Cleaning</SelectItem>
                          <SelectItem value="roofing">Roofing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone Number</Label>
                    <Input
                      id="businessPhone"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                      id="businessAddress"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="123 Main St, City, State 12345"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-4">
                    <Label>Business Hours</Label>
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-3 text-sm font-medium text-muted-foreground">
                        <div>Open</div>
                        <div>Day</div>
                        <div>Opening Time</div>
                        <div>Closing Time</div>
                      </div>
                      {businessHours.map((hour, index) => (
                        <div key={hour.day} className="grid grid-cols-4 gap-3 items-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={hour.isOpen}
                              onCheckedChange={(checked) => 
                                updateBusinessHours(index, 'isOpen', !!checked)
                              }
                            />
                          </div>
                          <div>
                            <Select
                              value={hour.day}
                              onValueChange={(value) => updateBusinessHours(index, 'day', value)}
                              disabled={!hour.isOpen}
                            >
                              <SelectTrigger className={!hour.isOpen ? "opacity-50" : ""}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(dayNames).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Input
                              type="time"
                              value={hour.openTime}
                              onChange={(e) => updateBusinessHours(index, 'openTime', e.target.value)}
                              disabled={!hour.isOpen}
                              className={!hour.isOpen ? "opacity-50" : ""}
                            />
                          </div>
                          <div>
                            <Input
                              type="time"
                              value={hour.closeTime}
                              onChange={(e) => updateBusinessHours(index, 'closeTime', e.target.value)}
                              disabled={!hour.isOpen}
                              className={!hour.isOpen ? "opacity-50" : ""}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Configure your operating hours for each day of the week
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessDescription">Business Description</Label>
                    <Textarea
                      id="businessDescription"
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Brief description of your business and services..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessWebsite">Business Website</Label>
                    <Input
                      id="businessWebsite"
                      value={businessWebsite}
                      onChange={(e) => setBusinessWebsite(e.target.value)}
                      placeholder="https://www.yourbusiness.com"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Services & Pricing</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addService}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {services.map((service, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <div className="flex-1">
                            <Input
                              placeholder="Service name (e.g., Consultation)"
                              value={service.name}
                              onChange={(e) => updateService(index, 'name', e.target.value)}
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              placeholder="Price"
                              value={service.price}
                              onChange={(e) => updateService(index, 'price', e.target.value)}
                            />
                          </div>
                          {services.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Add your services and their corresponding prices that can be shared with potential clients
                    </p>
                  </div>

                  <Button onClick={() => saveSettings("Business")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Business Info"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Call Settings */}
            <TabsContent value="calls">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Phone className="w-5 h-5 mr-2" />
                    Call Handling Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="forwardingNumber">Call Forwarding Number</Label>
                    <Input
                      id="forwardingNumber"
                      value={forwardingNumber}
                      onChange={(e) => setForwardingNumber(e.target.value)}
                      placeholder="+1 (555) 987-6543"
                    />
                    <p className="text-sm text-muted-foreground">
                      Urgent calls will be forwarded to this number
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgentKeywords">Urgent Keywords</Label>
                    <Textarea
                      id="urgentKeywords"
                      value={urgentKeywords}
                      onChange={(e) => setUrgentKeywords(e.target.value)}
                      placeholder="emergency, urgent, asap, immediately"
                      rows={2}
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated keywords that trigger urgent call forwarding
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCallDuration">Maximum Call Duration (minutes)</Label>
                    <Select value={maxCallDuration} onValueChange={setMaxCallDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 minutes</SelectItem>
                        <SelectItem value="3">3 minutes</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="10">10 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Forward Urgent Calls</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically forward calls containing urgent keywords
                        </p>
                      </div>
                      <Switch
                        checked={autoForward}
                        onCheckedChange={setAutoForward}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Record All Calls</Label>
                        <p className="text-sm text-muted-foreground">
                          Keep recordings of all answered calls
                        </p>
                      </div>
                      <Switch
                        checked={recordCalls}
                        onCheckedChange={setRecordCalls}
                      />
                    </div>
                  </div>

                  <Button onClick={() => saveSettings("Call")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Call Settings"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Assistant */}
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="w-5 h-5 mr-2" />
                    AI Assistant Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="aiPersonality">AI Personality</Label>
                    <Select value={aiPersonality} onValueChange={setAiPersonality}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional & Formal</SelectItem>
                        <SelectItem value="friendly">Friendly & Warm</SelectItem>
                        <SelectItem value="casual">Casual & Relaxed</SelectItem>
                        <SelectItem value="energetic">Energetic & Enthusiastic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customGreeting">Custom Greeting</Label>
                    <Textarea
                      id="customGreeting"
                      value={customGreeting}
                      onChange={(e) => setCustomGreeting(e.target.value)}
                      placeholder="Thank you for calling [Business Name]. This is Availabee, your AI assistant. How can I help you today?"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commonQuestions">Common Questions & Answers</Label>
                    <Textarea
                      id="commonQuestions"
                      value={commonQuestions}
                      onChange={(e) => setCommonQuestions(e.target.value)}
                      placeholder="Q: What are your hours? A: We're open Monday-Friday 9AM-5PM..."
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      Format: Q: Question? A: Answer. One per line.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Appointment Booking</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow AI to schedule appointments directly
                        </p>
                      </div>
                      <Switch
                        checked={appointmentBooking}
                        onCheckedChange={setAppointmentBooking}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Lead Capture</Label>
                        <p className="text-sm text-muted-foreground">
                          Collect contact information from callers
                        </p>
                      </div>
                      <Switch
                        checked={leadCapture}
                        onCheckedChange={setLeadCapture}
                      />
                    </div>
                  </div>

                  <Button onClick={() => saveSettings("AI")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save AI Settings"}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* AI Setup */}
            <TabsContent value="ai-setup">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Answering Service Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <WebhookInfo />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>

            {/* Account */}
            <TabsContent value="account">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-4">
                     <div className="space-y-2">
                       <Label>User ID</Label>
                       <div className="flex items-center space-x-2">
                         <Input value={user?.id || ""} disabled className="font-mono text-sm" />
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => {
                             if (user?.id) {
                               navigator.clipboard.writeText(user.id);
                               toast({
                                 title: "Copied!",
                                 description: "User ID copied to clipboard",
                               });
                             }
                           }}
                         >
                           Copy
                         </Button>
                       </div>
                     </div>
                     
                     <div className="space-y-2">
                       <Label>Email Address</Label>
                       <Input value={user?.email || ""} disabled />
                     </div>
                     <div className="space-y-2">
                       <Label>Account Status</Label>
                       <Badge variant="secondary">Active</Badge>
                     </div>
                     <div className="space-y-2">
                       <Label>Plan</Label>
                       <Badge variant="outline">Professional</Badge>
                     </div>
                   </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-destructive">
                      <Shield className="w-5 h-5 mr-2" />
                      Danger Zone
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-destructive">Delete Account</Label>
                      <p className="text-sm text-muted-foreground">
                        Once you delete your account, there is no going back. Please be certain.
                      </p>
                      <Button variant="destructive" disabled>
                        Delete Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Settings;