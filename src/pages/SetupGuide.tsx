import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { 
  ArrowLeft, 
  CheckCircle, 
  Phone, 
  Settings,
  Bell,
  MessageSquare, 
  Brain, 
  Calendar,
  Users,
  PlayCircle,
  FileText,
  ExternalLink,
  Copy,
  Clock
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SetupGuide = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/login");
        return;
      }
      
      setUser(session.user);
      setLoading(false);
      fetchRecentActivity();
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          navigate("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Effect to mark setup as completed when all steps are done
  useEffect(() => {
    if (completedSteps.length === setupSteps.length && user) {
      markSetupComplete();
    }
  }, [completedSteps.length, user]);

  const markSetupComplete = async () => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ setup_completed: true })
        .eq('id', user?.id);

      if (error) {
        console.error('Error marking setup as complete:', error);
      }
    } catch (error) {
      console.error('Error marking setup as complete:', error);
    }
  };

  const handleStepComplete = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
      toast({
        title: "Step completed! ✅",
        description: `Step ${stepNumber} has been marked as complete.`,
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: callMessages, error } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentActivity(callMessages || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Text copied to clipboard",
    });
  };

  const setupSteps = [
    {
      id: 1,
      title: "Account Setup",
      icon: <Users className="w-6 h-6" />,
      description: "Configure your business profile and preferences"
    },
    {
      id: 2,
      title: "Phone Configuration",
      icon: <Phone className="w-6 h-6" />,
      description: "Connect your business phone number"
    },
    {
      id: 3,
      title: "AI Training",
      icon: <Brain className="w-6 h-6" />,
      description: "Train your AI assistant with your business information"
    },
    {
      id: 4,
      title: "Call Handling",
      icon: <MessageSquare className="w-6 h-6" />,
      description: "Set up call routing and message templates"
    },
    {
      id: 5,
      title: "Notifications",
      icon: <Bell className="w-6 h-6" />,
      description: "Configure alerts and notification preferences"
    },
    {
      id: 6,
      title: "Testing",
      icon: <PlayCircle className="w-6 h-6" />,
      description: "Test your setup with sample calls"
    }
  ];

  const progress = (completedSteps.length / setupSteps.length) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
            <a href="/" className="flex items-center">
              <img 
                src="/lovable-uploads/junie-logo.png" 
                alt="Junie Logo" 
                className="h-8 w-8"
              />
            </a>
            <div>
              <h1 className="text-xl font-bold text-primary">Setup Guide</h1>
              <p className="text-sm text-muted-foreground">Get your AI assistant ready in minutes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate("/settings")} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 3).map((activity) => (
                    <DropdownMenuItem key={activity.id} className="cursor-pointer">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{activity.caller_name} - {activity.call_type}</p>
                        <p className="text-xs text-muted-foreground">{activity.message.substring(0, 60)}...</p>
                      </div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    <p className="text-sm text-muted-foreground">No recent notifications</p>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="text-right">
              <p className="text-sm font-medium">{completedSteps.length} of {setupSteps.length} completed</p>
              <Progress value={progress} className="w-32" />
            </div>
            <Badge variant={completedSteps.length === setupSteps.length ? "default" : "secondary"}>
              {Math.round(progress)}% Complete
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Setup Steps</CardTitle>
                <CardDescription>Follow these steps to get started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {setupSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      currentStep === step.id
                        ? 'bg-primary/10 border border-primary/20'
                        : completedSteps.includes(step.id)
                        ? 'bg-green-50 border border-green-200'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <div className={`p-2 rounded-full ${
                      completedSteps.includes(step.id)
                        ? 'bg-green-500 text-white'
                        : currentStep === step.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {completedSteps.includes(step.id) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={currentStep.toString()} onValueChange={(value) => setCurrentStep(Number(value))}>
              {/* Step 1: Account Setup */}
              <TabsContent value="1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Step 1: Account Setup
                    </CardTitle>
                    <CardDescription>
                      Configure your business profile to personalize your AI assistant
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold">Business Information</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Business Name</label>
                            <p className="text-sm text-muted-foreground">This will be used in your AI's greeting</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Industry Type</label>
                            <p className="text-sm text-muted-foreground">Help the AI understand your business context</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Business Hours</label>
                            <p className="text-sm text-muted-foreground">When your business is typically open</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="font-semibold">Contact Preferences</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Primary Email</label>
                            <p className="text-sm text-muted-foreground">Where call summaries will be sent</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium">SMS Number</label>
                            <p className="text-sm text-muted-foreground">For urgent call notifications</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => navigate("/settings")}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configure in Settings
                      </Button>
                      <Button onClick={() => handleStepComplete(1)}>
                        Mark as Complete
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 2: Phone Configuration */}
              <TabsContent value="2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="w-5 h-5" />
                      Step 2: Phone Configuration
                    </CardTitle>
                    <CardDescription>
                      Connect your business phone number to Junie
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">📞 Call Forwarding Setup</h3>
                      <p className="text-blue-800 text-sm mb-3">
                        Forward your business calls to Junie when you can't answer. No new phone system required!
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-white rounded p-2">
                          <span className="font-mono text-sm">+1 (555) 123-AVAI</span>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard("+15551234284")}>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs text-blue-700">Use this number for call forwarding setup</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Common Carriers</h3>
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Verizon</h4>
                            <p className="text-sm text-muted-foreground mb-2">Dial *72 + forwarding number</p>
                            <Button size="sm" variant="outline" className="w-full">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Instructions
                            </Button>
                          </div>
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">AT&T</h4>
                            <p className="text-sm text-muted-foreground mb-2">Dial *72 + forwarding number</p>
                            <Button size="sm" variant="outline" className="w-full">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Instructions
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">VoIP Systems</h3>
                        <div className="space-y-3">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">RingCentral</h4>
                            <p className="text-sm text-muted-foreground mb-2">Configure in admin portal</p>
                            <Button size="sm" variant="outline" className="w-full">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Guide
                            </Button>
                          </div>
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Other VoIP</h4>
                            <p className="text-sm text-muted-foreground mb-2">Custom setup instructions</p>
                            <Button size="sm" variant="outline" className="w-full">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Contact Support
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>
                        Previous Step
                      </Button>
                      <Button onClick={() => handleStepComplete(2)}>
                        Mark as Complete
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 3: AI Training */}
              <TabsContent value="3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Step 3: AI Training
                    </CardTitle>
                    <CardDescription>
                      Train your AI assistant with your business knowledge
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Business Knowledge</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              FAQ Content
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Upload your frequently asked questions
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              Upload FAQ Document
                            </Button>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Services & Pricing</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              What services do you offer and pricing info
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              Add Services
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">Communication Style</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Greeting Template</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              How should your AI greet callers?
                            </p>
                            <div className="text-xs bg-muted p-2 rounded">
                              "Thank you for calling [Business Name]. This is Junie, your AI assistant. How can I help you today?"
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Tone & Personality</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Professional, friendly, casual, etc.
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              Customize Tone
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2">💡 Pro Tip</h3>
                      <p className="text-green-800 text-sm">
                        The more information you provide, the better your AI assistant will be at handling calls. 
                        You can always update this information later as your business evolves.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(2)}>
                        Previous Step
                      </Button>
                      <Button onClick={() => handleStepComplete(3)}>
                        Mark as Complete
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 4: Call Handling */}
              <TabsContent value="4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Step 4: Call Handling
                    </CardTitle>
                    <CardDescription>
                      Configure how your AI handles different types of calls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Call Routing</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Urgent Calls</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              How should urgent calls be handled?
                            </p>
                            <div className="space-y-2">
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="urgent" className="w-4 h-4" />
                                <span className="text-sm">Take message and notify immediately</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="radio" name="urgent" className="w-4 h-4" defaultChecked />
                                <span className="text-sm">Attempt to transfer to you</span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Business Hours</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Different handling for business vs. after hours
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              Configure Hours
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">Message Collection</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Required Information</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              What info should AI always collect?
                            </p>
                            <div className="space-y-1">
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className="w-4 h-4" defaultChecked />
                                <span className="text-sm">Name</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className="w-4 h-4" defaultChecked />
                                <span className="text-sm">Phone number</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className="w-4 h-4" />
                                <span className="text-sm">Email address</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input type="checkbox" className="w-4 h-4" defaultChecked />
                                <span className="text-sm">Reason for calling</span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Appointment Booking</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Enable AI to book appointments
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              <Calendar className="w-3 h-3 mr-1" />
                              Connect Calendar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(3)}>
                        Previous Step
                      </Button>
                      <Button onClick={() => handleStepComplete(4)}>
                        Mark as Complete
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 5: Notifications */}
              <TabsContent value="5">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5" />
                      Step 5: Notifications
                    </CardTitle>
                    <CardDescription>
                      Set up alerts and notifications for incoming calls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Email Notifications</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Call Summaries</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Receive detailed email after each call
                            </p>
                            <label className="flex items-center space-x-2">
                              <input type="checkbox" className="w-4 h-4" defaultChecked />
                              <span className="text-sm">Enable email summaries</span>
                            </label>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Daily Reports</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Daily summary of all calls received
                            </p>
                            <label className="flex items-center space-x-2">
                              <input type="checkbox" className="w-4 h-4" defaultChecked />
                              <span className="text-sm">Enable daily reports</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">SMS Alerts</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Urgent Calls</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Immediate SMS for urgent matters
                            </p>
                            <label className="flex items-center space-x-2">
                              <input type="checkbox" className="w-4 h-4" defaultChecked />
                              <span className="text-sm">Enable SMS alerts</span>
                            </label>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Missed Calls</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Alert when AI couldn't handle a call
                            </p>
                            <label className="flex items-center space-x-2">
                              <input type="checkbox" className="w-4 h-4" defaultChecked />
                              <span className="text-sm">Enable missed call alerts</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Important</h3>
                      <p className="text-yellow-800 text-sm">
                        Make sure to whitelist our email address (notifications@getjunie.com) and SMS number 
                        to ensure you receive all important alerts.
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(4)}>
                        Previous Step
                      </Button>
                      <Button onClick={() => handleStepComplete(5)}>
                        Mark as Complete
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Step 6: Testing */}
              <TabsContent value="6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" />
                      Step 6: Testing
                    </CardTitle>
                    <CardDescription>
                      Test your setup to ensure everything is working correctly
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold mb-3">Test Scenarios</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Basic Call Test</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Test a simple inquiry call
                            </p>
                            <Button size="sm" className="w-full">
                              <Phone className="w-3 h-3 mr-1" />
                              Start Test Call
                            </Button>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Appointment Booking</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Test appointment scheduling flow
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              <Calendar className="w-3 h-3 mr-1" />
                              Test Booking
                            </Button>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Urgent Call Transfer</h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              Test urgent call handling
                            </p>
                            <Button size="sm" variant="outline" className="w-full">
                              <Bell className="w-3 h-3 mr-1" />
                              Test Transfer
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-3">Test Results</h3>
                        <div className="space-y-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Recent Test Calls
                            </h4>
                            <div className="mt-2 space-y-2">
                              <div className="text-xs bg-muted p-2 rounded">
                                No test calls yet. Run your first test to see results here.
                              </div>
                            </div>
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium">Performance Metrics</h4>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Call Answer Rate:</span>
                                <span className="font-medium">--</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Avg Call Duration:</span>
                                <span className="font-medium">--</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Success Rate:</span>
                                <span className="font-medium">--</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-900 mb-2">🎉 You're Almost Done!</h3>
                      <p className="text-green-800 text-sm mb-2">
                        Once you've completed all tests, your AI assistant will be ready to handle real calls. 
                        Remember, you can always make adjustments and improvements over time.
                      </p>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        Complete Setup
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(5)}>
                        Previous Step
                      </Button>
                      <Button onClick={() => handleStepComplete(6)}>
                        Mark as Complete
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Completion Message */}
        {completedSteps.length === setupSteps.length && (
          <Card className="mt-8 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-green-900">Setup Complete! 🎉</h2>
                <p className="text-green-800">
                  Your AI assistant is now ready to handle calls. You can monitor performance and make adjustments in your dashboard.
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/settings")}>
                    Adjust Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default SetupGuide;