import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Clock, Users, Settings, LogOut, Bell, Plus, Phone, BarChart3, TrendingUp, MessageSquare, Bot, Shield } from "lucide-react";
import CallList from "@/components/CallList";
import NotificationSettings from "@/components/NotificationSettings";
import CallAnalytics from "@/components/CallAnalytics";
import { WebhookInfo } from "@/components/WebhookInfo";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";


interface RecentActivity {
  id: string;
  time: string;
  action: string;
  type: 'success' | 'warning' | 'error';
  caller_name: string;
  call_type: string;
  created_at: string;
}

interface DashboardStats {
  totalCalls: number;
  totalMessages: number;
  hoursSaved: number;
  leadsCount: number;
  successRate: number;
}

const Dashboard = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalCalls: 0,
    totalMessages: 0,
    hoursSaved: 0,
    leadsCount: 0,
    successRate: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
      fetchDashboardStats();
    }
  }, [user]);

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      
      // Fetch from call_logs first (most comprehensive data)
      const { data: callLogs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch from call_messages as well
      const { data: callMessages, error: messagesError } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(2);

      const activities: RecentActivity[] = [];

      // Transform call_logs into recent activity
      if (callLogs) {
        callLogs.forEach(log => {
          activities.push({
            id: log.id,
            time: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
            action: `${log.caller_name} called`,
            type: log.urgency_level === 'urgent' ? 'error' : 
                  log.urgency_level === 'high' ? 'warning' : 'success',
            caller_name: log.caller_name,
            call_type: log.call_type,
            created_at: log.created_at,
          });
        });
      }

      // Transform call_messages into recent activity
      if (callMessages) {
        callMessages.forEach(message => {
          activities.push({
            id: message.id,
            time: formatDistanceToNow(new Date(message.created_at), { addSuffix: true }),
            action: `${message.caller_name} left a message`,
            type: message.urgency_level === 'urgent' ? 'error' : 
                  message.urgency_level === 'high' ? 'warning' : 'success',
            caller_name: message.caller_name,
            call_type: message.call_type,
            created_at: message.created_at,
          });
        });
      }

      // Sort by created_at and take the most recent 5
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentActivity(activities.slice(0, 5));

    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      
      // Fetch all call logs for the user
      const { data: callLogs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('user_id', user?.id);

      // Fetch all call messages for the user
      const { data: callMessages, error: messagesError } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id);

      if (logsError) throw logsError;
      if (messagesError) throw messagesError;

      const logs = callLogs || [];
      const messages = callMessages || [];

      // Calculate stats
      const totalCalls = logs.length;
      const totalMessages = messages.length;
      
      // Calculate hours saved (assuming 5 minutes per call saved on average)
      const totalDuration = logs.reduce((sum, call) => sum + (call.call_duration || 300), 0);
      const hoursSaved = Math.round((totalDuration / 3600) * 10) / 10;
      
      // Count leads (appointments and sales calls)
      const leadsCount = [...logs, ...messages].filter(item => 
        item.call_type === 'appointment' || item.call_type === 'sales'
      ).length;
      
      // Calculate success rate (completed calls vs total calls)
      const completedCalls = logs.filter(call => call.call_status === 'completed').length;
      const successRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 100;

      setDashboardStats({
        totalCalls,
        totalMessages,
        hoursSaved,
        leadsCount,
        successRate,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await handleRobustSignOut(supabase);
    } catch (error: any) {
      // Force redirect even if there's an error
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
            <a href="/" className="flex items-center">
              <img 
                src="/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png" 
                alt="Availabee Logo" 
                className="h-8 w-8"
              />
            </a>
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
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 
          </h2>
          <p className="text-muted-foreground">
            Here's what's happening with your AI scheduling assistant today.
          </p>
        </div>


        {/* Main Dashboard Content */}
        {/* Welcome Card moved to top */}
        <Card className="mb-8 bg-gradient-hero text-white border-0">
          <CardHeader>
            <CardTitle className="text-white">🎉 Welcome to Availabee!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/90 mb-4">
              Your intelligent call answering service is ready to help you never miss another customer call.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => navigate("/setup-guide")}>
                Setup Guide
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="calls" className="text-xs sm:text-sm">
              <span className="hidden md:inline">Messages & </span>Calls
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
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
                  <div className="text-2xl font-bold">{statsLoading ? '...' : dashboardStats.totalCalls}</div>
                  <p className="text-xs text-muted-foreground">Calls handled by AI</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours Saved</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : dashboardStats.hoursSaved}</div>
                  <p className="text-xs text-muted-foreground">Time saved with AI assistant</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Captured</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : dashboardStats.leadsCount}</div>
                  <p className="text-xs text-muted-foreground">Appointments & sales inquiries</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsLoading ? '...' : `${dashboardStats.successRate}%`}</div>
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
                    recentActivity.map((activity) => (
                      <div 
                        key={activity.id} 
                        className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                        onClick={() => navigate(`/call/${activity.id}`)}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'success' ? 'bg-green-500' :
                          activity.type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))
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
                  <Button className="w-full justify-start" variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Configure Call Forwarding
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Review Call Scripts
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Business Info
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    AI Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calls">
            <CallList />
          </TabsContent>

          <TabsContent value="analytics">
            <CallAnalytics />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;