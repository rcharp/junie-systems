import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building, Phone, Bot, Bell, User, Shield, Save } from "lucide-react";

const Settings = () => {
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Business Info State
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

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
    // This would load settings from your database
    // For now, we'll use default values
  };

  const saveSettings = async (section: string) => {
    setSaving(true);
    try {
      // Here you would save the settings to your database
      // For now, we'll just show a success message
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Settings saved",
        description: `Your ${section.toLowerCase()} settings have been updated successfully.`,
      });
    } catch (error: any) {
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
            <a href="/" className="flex items-center">
              <img 
                src="/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png" 
                alt="Availabee Logo" 
                className="h-8 w-8"
              />
            </a>
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
              Configure your Availabee AI assistant and account preferences.
            </p>
          </div>

          <Tabs defaultValue="business" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="business">
                <Building className="w-4 h-4 mr-2" />
                Business
              </TabsTrigger>
              <TabsTrigger value="calls">
                <Phone className="w-4 h-4 mr-2" />
                Call Settings
              </TabsTrigger>
              <TabsTrigger value="ai">
                <Bot className="w-4 h-4 mr-2" />
                AI Assistant
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="account">
                <User className="w-4 h-4 mr-2" />
                Account
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
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="medical">Medical Practice</SelectItem>
                          <SelectItem value="legal">Legal Services</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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

                  <div className="space-y-2">
                    <Label htmlFor="businessHours">Business Hours</Label>
                    <Textarea
                      id="businessHours"
                      value={businessHours}
                      onChange={(e) => setBusinessHours(e.target.value)}
                      placeholder="Monday - Friday: 9:00 AM - 5:00 PM"
                      rows={3}
                    />
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

            {/* Notifications */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive call summaries and alerts via email
                        </p>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get text message alerts for important calls
                        </p>
                      </div>
                      <Switch
                        checked={smsNotifications}
                        onCheckedChange={setSmsNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Browser notifications for real-time updates
                        </p>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Instant Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Immediate notifications for urgent calls
                        </p>
                      </div>
                      <Switch
                        checked={instantAlerts}
                        onCheckedChange={setInstantAlerts}
                      />
                    </div>
                  </div>

                  <Button onClick={() => saveSettings("Notification")} disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? "Saving..." : "Save Notification Settings"}
                  </Button>
                </CardContent>
              </Card>
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