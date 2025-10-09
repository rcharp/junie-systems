import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Clock,
  Users,
  Settings,
  LogOut,
  Bell,
  Plus,
  Phone,
  BarChart3,
  TrendingUp,
  MessageSquare,
  Bot,
  Shield,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CallList from "@/components/CallList";
import NotificationSettings from "@/components/NotificationSettings";
import CallAnalytics from "@/components/CallAnalytics";
import { WebhookInfo } from "@/components/WebhookInfo";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { FeatureGate } from "@/components/FeatureGate";
import { useSubscription } from "@/hooks/useSubscription";
import { JuniePhoneDisplay } from "@/components/JuniePhoneDisplay";

interface RecentActivity {
  id: string;
  time: string;
  action: string;
  type: "success" | "warning" | "error";
  caller_name: string;
  call_type: string;
  created_at: string;
  source: "call" | "message"; // Track whether it's from call_logs or call_messages
}

interface DashboardStats {
  totalCalls: number;
  totalMessages: number;
  hoursSaved: number;
  leadsCount: number;
  successRate: number;
}

const Dashboard = () => {
  const { user, loading, isAdmin, setSigningOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { subscriptionPlan, featureAccess } = useSubscription();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeFeatureName, setUpgradeFeatureName] = useState("");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [activityPage, setActivityPage] = useState(0);
  const itemsPerPage = 5;
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalCalls: 0,
    totalMessages: 0,
    hoursSaved: 0,
    leadsCount: 0,
    successRate: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Update active tab when URL parameter changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  // Check if new user needs onboarding FIRST, before loading any dashboard data
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingOnboarding(false);
        return;
      }

      const { data: businessSettings } = await supabase
        .from("business_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Redirect to onboarding if no business settings exist
      if (!businessSettings) {
        navigate("/onboarding");
        return;
      }

      // User has completed onboarding, allow dashboard to render
      setCheckingOnboarding(false);
    };

    checkOnboardingStatus();
  }, [user, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
      fetchDashboardStats();
      checkSetupStatus();
    }
  }, [user]);

  const checkSetupStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("setup_completed")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking setup status:", error);
        return;
      }

      // Show setup guide if user hasn't completed it yet
      setShowSetupGuide(!data?.setup_completed);
    } catch (error) {
      console.error("Error checking setup status:", error);
      // Default to showing setup guide if we can't determine status
      setShowSetupGuide(true);
    }
  };

  const getContextualCallerName = (callerName: string, callType: string) => {
    // If caller name is provided and not "Unknown" variations, use it
    if (
      callerName &&
      !callerName.toLowerCase().includes("unknown") &&
      callerName.trim() !== "" &&
      callerName !== "Unknown Caller"
    ) {
      return callerName;
    }

    // Return contextual name based on call type
    const lowerCallType = callType.toLowerCase();

    switch (lowerCallType) {
      case "appointment":
        return "A potential client";
      case "sales":
        return "A potential customer";
      case "support":
        return "A customer";
      case "complaint":
        return "A customer";
      case "inquiry":
        return "A potential customer";
      default:
        return "A potential customer";
    }
  };

  const summarizeMessage = (message: string, callType: string): string => {
    if (!message) return "left a voicemail";

    const lowerMessage = message.toLowerCase();

    // Check for appointment scheduling
    if (lowerMessage.includes("scheduled") || lowerMessage.includes("appointment")) {
      // Try to extract service type and time details
      const serviceMatch = message.match(/for\s+([^.]+?)(?:\s+on|\.|at)/i);
      const dateMatch = message.match(/(?:on|for)\s+([A-Z][a-z]+day,\s+[A-Z][a-z]+\s+\d+(?:st|nd|rd|th)?)/i);
      const timeMatch = message.match(/at\s+(\d+:\d+\s*(?:am|pm)?)/i);
      
      if (serviceMatch && (dateMatch || timeMatch)) {
        const service = serviceMatch[1].trim();
        const dateStr = dateMatch ? dateMatch[1] : "";
        const timeStr = timeMatch ? ` at ${timeMatch[1]}` : "";
        return `scheduled an appointment for ${service}${dateStr ? ` on ${dateStr}` : ""}${timeStr}`;
      }
      return "scheduled an appointment";
    }

    // Check for availability inquiries
    if (lowerMessage.includes("availability") || lowerMessage.includes("available")) {
      return "called to ask what available times you have for a service call. Junie gave them the available times.";
    }

    // Check for pricing inquiries
    if (lowerMessage.includes("price") || lowerMessage.includes("cost") || lowerMessage.includes("quote")) {
      return "called to ask about pricing. Junie provided the information.";
    }

    // Check for service inquiries
    if (lowerMessage.includes("service") || lowerMessage.includes("repair")) {
      return "called to inquire about your services. Junie provided the details.";
    }

    // Check for emergency calls
    if (lowerMessage.includes("emergency") || lowerMessage.includes("urgent")) {
      return "called with an urgent request. Junie handled the call.";
    }

    // Check for general questions
    if (lowerMessage.includes("question") || lowerMessage.includes("ask")) {
      return "called with a question. Junie provided assistance.";
    }

    // Default: return a shortened version
    const firstSentence = message.split('.')[0];
    if (firstSentence.length > 80) {
      return firstSentence.substring(0, 80) + "...";
    }
    return firstSentence;
  };

  const extractCallAction = (message: string, callType: string, callSummary?: string) => {
    if (!message && !callSummary) return "called";

    // Combine message and summary for better context
    const fullText = `${message} ${callSummary || ""}`.toLowerCase();
    const lowerCallType = callType.toLowerCase();

    // Service type patterns - more specific
    const servicePatterns = {
      "hvac|a/c|air conditioning|heating|cooling|furnace|ac unit": "A/C repair",
      "plumbing|plumber|leak|drain|pipe|toilet|sink|water heater": "plumbing services",
      "electrical|electrician|wiring|power|outlet|breaker": "electrical work",
      "roofing|roof|shingle|gutter": "roofing services",
      "cleaning|clean|maid|house cleaning": "cleaning services",
      "lawn|landscaping|yard|garden|grass": "landscaping",
      "pest|exterminator|bug|termite|ant": "pest control",
      "locksmith|lock|key|security": "locksmith services",
      "moving|mover|relocation": "moving services",
      "painting|paint|painter": "painting services",
      "flooring|carpet|tile|hardwood": "flooring installation",
      "appliance|washer|dryer|refrigerator": "appliance repair",
    };

    let detectedService = "";
    for (const [pattern, service] of Object.entries(servicePatterns)) {
      if (new RegExp(pattern, "i").test(fullText)) {
        detectedService = service;
        break;
      }
    }

    // Define detailed action patterns based on call type and message content
    if (lowerCallType === "appointment") {
      if (fullText.includes("scheduled") || fullText.includes("appointment")) {
        return detectedService ? `scheduled an appointment for ${detectedService}` : "scheduled a service appointment";
      }
      if (fullText.includes("reschedule") || fullText.includes("change")) {
        return detectedService
          ? `requested to reschedule their ${detectedService} appointment`
          : "requested to reschedule their appointment";
      }
      return detectedService ? `called about scheduling ${detectedService}` : "called about scheduling an appointment";
    }

    if (lowerCallType === "sales" || lowerCallType === "inquiry") {
      if (
        fullText.includes("price") ||
        fullText.includes("cost") ||
        fullText.includes("quote") ||
        fullText.includes("estimate")
      ) {
        return detectedService ? `inquired about ${detectedService} pricing` : "inquired about pricing";
      }
      if (fullText.includes("service") || fullText.includes("available")) {
        return detectedService ? `asked about ${detectedService} availability` : "inquired about services";
      }
      if (fullText.includes("information") || fullText.includes("details")) {
        return detectedService ? `requested information about ${detectedService}` : "requested service information";
      }
      return detectedService ? `inquired about ${detectedService}` : "made a service inquiry";
    }

    if (lowerCallType === "support") {
      if (fullText.includes("problem") || fullText.includes("issue") || fullText.includes("not working")) {
        return detectedService
          ? `reported an issue with their ${detectedService.replace(" services", " system")}`
          : "reported a service issue";
      }
      if (fullText.includes("help") || fullText.includes("assistance")) {
        return detectedService ? `requested help with ${detectedService}` : "requested technical support";
      }
      return detectedService ? `called for ${detectedService} support` : "called for technical assistance";
    }

    if (lowerCallType === "complaint") {
      return detectedService ? `filed a complaint about ${detectedService}` : "filed a service complaint";
    }

    if (lowerCallType === "emergency") {
      return detectedService
        ? `called with an emergency ${detectedService.replace(" services", "")} issue`
        : "called with an emergency issue";
    }

    // General patterns for any call type
    if (fullText.includes("emergency") || fullText.includes("urgent")) {
      return detectedService ? `called with an urgent ${detectedService} request` : "called with an urgent request";
    }
    if (fullText.includes("price") || fullText.includes("cost") || fullText.includes("quote")) {
      return detectedService ? `asked about ${detectedService} pricing` : "asked about pricing";
    }
    if (fullText.includes("appointment") || fullText.includes("schedule")) {
      return detectedService ? `inquired about scheduling ${detectedService}` : "inquired about scheduling";
    }
    if (fullText.includes("service") || fullText.includes("help")) {
      return detectedService ? `asked about ${detectedService}` : "asked about services";
    }
    if (fullText.includes("information") || fullText.includes("details")) {
      return detectedService ? `requested ${detectedService} information` : "requested information";
    }
    if (fullText.includes("cancel")) {
      return detectedService ? `cancelled their ${detectedService} appointment` : "cancelled their appointment";
    }

    // If we detected a service but no specific action, provide generic but detailed message
    if (detectedService) {
      return `called about ${detectedService}`;
    }

    // Extract first few words as fallback but make it more descriptive
    const words = message.split(" ").slice(0, 6).join(" ");
    return words && words.length > 5
      ? `called regarding: "${words.length > 40 ? words.substring(0, 40) + "..." : words}"`
      : "called for service";
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);

      // Get user's business_id first
      const { data: businessData, error: businessError } = await supabase
        .from("business_settings")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (businessError) throw businessError;

      const activities: RecentActivity[] = [];

      if (businessData) {
        // Fetch only from call_logs
        const { data: callLogs, error: logsError } = await supabase
          .from("call_logs")
          .select("*")
          .or(`user_id.eq.${user?.id},business_id.eq.${businessData.id}`)
          .order("created_at", { ascending: false })
          .limit(5);

        if (logsError) throw logsError;

        if (callLogs) {
          callLogs.forEach((log) => {
            const displayName = getContextualCallerName(log.caller_name, log.call_type);
            
            // Determine caller identifier (name or phone)
            let callerIdentifier;
            if (displayName.toLowerCase().includes('potential customer') || 
                displayName.toLowerCase().includes('customer') || 
                displayName.toLowerCase().includes('client') ||
                displayName.toLowerCase().includes('caller')) {
              callerIdentifier = log.phone_number;
            } else {
              callerIdentifier = displayName;
            }

            // Get concise summary of the call
            const summary = summarizeMessage(log.message || log.call_summary || "", log.call_type);

            // Combine: "Incoming call from X. [Summary]"
            const callText = `Incoming call from ${callerIdentifier}. ${displayName} ${summary}`;

            activities.push({
              id: log.id,
              time: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
              action: callText,
              type: log.urgency_level === "urgent" ? "error" : log.urgency_level === "high" ? "warning" : "success",
              caller_name: log.caller_name,
              call_type: log.call_type,
              created_at: log.created_at,
              source: "call" as const,
            });
          });
        }
      }

      setRecentActivity(activities);
    } catch (error: any) {
      console.error("Error fetching recent activity:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);

      // Get user's business_id first
      const { data: businessData, error: businessError } = await supabase
        .from("business_settings")
        .select("id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (businessError) throw businessError;

      let totalCalls = 0;
      let totalMessages = 0;
      let hoursSaved = 0;
      let leadsCount = 0;
      let successRate = 100;

      if (businessData) {
        // Fetch call_logs using both user_id and business_id
        const { data: callLogs, error: logsError } = await supabase
          .from("call_logs")
          .select("*")
          .or(`user_id.eq.${user?.id},business_id.eq.${businessData.id}`);

        if (logsError) throw logsError;

        const logs = callLogs || [];
        totalCalls = logs.length;

        // Calculate hours saved based on call duration
        const totalDuration = logs.reduce((sum, call) => sum + (call.call_duration || 300), 0);
        hoursSaved = Math.round((totalDuration / 3600) * 10) / 10;

        // Count leads (appointments and sales calls)
        leadsCount = logs.filter(
          (call) => call.call_type === "appointment" || call.call_type === "sales" || call.appointment_scheduled,
        ).length;

        // Calculate success rate (completed calls vs total calls)
        const completedCalls = logs.filter((call) => call.call_status === "completed").length;
        successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 100;
      }

      // Also add data from call_messages
      const { data: callMessages, error: messagesError } = await supabase
        .from("call_messages")
        .select("*")
        .eq("user_id", user?.id);

      if (callMessages && callMessages.length > 0) {
        totalMessages = callMessages.length;

        // Add to leads count
        leadsCount += callMessages.filter(
          (message) => message.call_type === "appointment" || message.call_type === "sales",
        ).length;
      }

      setDashboardStats({
        totalCalls,
        totalMessages,
        hoursSaved,
        leadsCount,
        successRate,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await handleRobustSignOut(supabase, setSigningOut);
    } catch (error: any) {
      // Force redirect even if there's an error
      window.location.href = "/";
    }
  };

  if (loading) {
    return null; // Don't show loading spinner to prevent flicker
  }

  // Don't render dashboard until we've checked onboarding status
  if (checkingOnboarding) {
    return null;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <a href="/" className="flex items-center flex-shrink-0">
                  <img src="/lovable-uploads/junie-logo.png" alt="Junie Logo" className="h-6 w-6 sm:h-8 sm:w-8" />
                </a>
                <h1 className="text-sm sm:text-base font-bold text-primary truncate">Dashboard</h1>
              </div>
              <JuniePhoneDisplay />
            </div>

            <div className="flex items-center space-x-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/admin")}
                  className="text-primary hover:bg-primary/10 h-8 w-8"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" onClick={() => navigate("/settings")} className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {recentActivity.length > 0 ? (
                    recentActivity.slice(0, 3).map((activity) => (
                      <DropdownMenuItem key={activity.id} className="cursor-pointer">
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
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
              <Button variant="ghost" onClick={handleSignOut} className="h-8 w-8 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-3">
                <a href="/" className="flex items-center">
                  <img src="/lovable-uploads/junie-logo.png" alt="Junie Logo" className="h-8 w-8" />
                </a>
                <h1 className="text-xl font-bold text-primary">Dashboard</h1>
              </div>
              <JuniePhoneDisplay />
            </div>

            <div className="flex items-center space-x-4">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="text-primary hover:bg-primary/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
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
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
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
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-muted-foreground">Dashboard</h2>
        </div>

        {/* Main Dashboard Content */}
        {/* Setup Guide Link - Hidden */}
        {/* {showSetupGuide && (
          <Card className="mb-6 bg-gradient-hero border-0">
            <CardContent className="py-4">
              <p className="text-white">
                Follow our{" "}
                <button 
                  onClick={() => navigate("/setup-guide")}
                  className="text-white underline hover:no-underline font-semibold"
                >
                  setup guide
                </button>
                {" "}to finish setting up your AI agent
              </p>
            </CardContent>
          </Card>
        )} */}

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "calendar" && !featureAccess.appointmentScheduling) {
              setUpgradeFeatureName("Calendar");
              setShowUpgradeDialog(true);
              return;
            }
            if (value === "analytics" && !featureAccess.advancedAnalytics) {
              setUpgradeFeatureName("Analytics");
              setShowUpgradeDialog(true);
              return;
            }
            setActiveTab(value);
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3 mb-6 p-1 h-auto">
            <TabsTrigger value="overview" className="flex items-center gap-2 py-3.5">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2 py-3.5">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages & Calls</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className={`flex items-center gap-2 py-3.5 ${!featureAccess.advancedAnalytics ? "text-muted-foreground/50" : ""}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics {!featureAccess.advancedAnalytics && "(Pro)"}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {statsLoading ? "..." : dashboardStats.totalCalls}
                  </div>
                  <p className="text-xs text-muted-foreground">Calls handled by AI</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours Saved</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {statsLoading ? "..." : dashboardStats.hoursSaved}
                  </div>
                  <p className="text-xs text-muted-foreground">Time saved with AI assistant</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Captured</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {statsLoading ? "..." : dashboardStats.leadsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Appointments & sales inquiries</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {statsLoading ? "..." : `${dashboardStats.successRate}%`}
                  </div>
                  <p className="text-xs text-muted-foreground">Call completion rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : recentActivity.length > 0 ? (
                    <>
                      {recentActivity
                        .slice(activityPage * itemsPerPage, (activityPage + 1) * itemsPerPage)
                        .map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => activity.source === "call" && navigate(`/call/${activity.id}`)}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                activity.type === "success"
                                  ? "bg-green-500"
                                  : activity.type === "warning"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <p className="text-sm font-medium text-muted-foreground flex-1">{activity.action}</p>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Badge variant={activity.source === "call" ? "default" : "outline"} className="text-xs">
                                    {activity.source === "call" ? (
                                      <><Phone className="w-3 h-3 mr-1" /> Call</>
                                    ) : (
                                      <><MessageSquare className="w-3 h-3 mr-1" /> Message</>
                                    )}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {activity.call_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      {recentActivity.length > itemsPerPage && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActivityPage(Math.max(0, activityPage - 1))}
                            disabled={activityPage === 0}
                          >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Previous
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Page {activityPage + 1} of {Math.ceil(recentActivity.length / itemsPerPage)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActivityPage(Math.min(Math.ceil(recentActivity.length / itemsPerPage) - 1, activityPage + 1))}
                            disabled={activityPage >= Math.ceil(recentActivity.length / itemsPerPage) - 1}
                          >
                            Next
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => {
                      setActiveTab("messages");
                      navigate("/dashboard?tab=messages");
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Calls and Messages
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => navigate("/settings?tab=business")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Edit Business Info
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => navigate("/settings?tab=calls")}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    AI Caller Settings
                  </Button>
                  <FeatureGate 
                    feature="appointmentScheduling" 
                    fallback={
                      <Button
                        className="w-full justify-start opacity-50"
                        variant="outline"
                        disabled
                        onClick={(e) => {
                          e.preventDefault();
                          setShowUpgradeDialog(true);
                        }}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Gmail Calendar Settings (Pro)
                      </Button>
                    }
                  >
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => navigate("/settings?tab=setup")}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Gmail Calendar Settings
                    </Button>
                  </FeatureGate>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <CallList />
          </TabsContent>

          <TabsContent value="analytics">
            <FeatureGate feature="advancedAnalytics">
              <CallAnalytics />
            </FeatureGate>
          </TabsContent>
        </Tabs>
      </main>

      {/* Upgrade Dialog */}
      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
            <AlertDialogDescription>
              The {upgradeFeatureName} feature is available on the Scale plan. Upgrade your plan to access this feature.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log("Upgrade dialog: Navigating to pricing");
                setShowUpgradeDialog(false);
                navigate("/pricing");
                console.log("Upgrade dialog: Navigation called");
              }}
            >
              View Plans
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
