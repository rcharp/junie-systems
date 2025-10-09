import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Users, Phone, Calendar, TrendingUp, Shield, Activity, ArrowLeft, Settings, Bell, LogOut, Clock, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WebhookMonitor } from '@/components/WebhookMonitor';
import { BusinessDataMonitor } from '@/components/BusinessDataMonitor';
import { TodoChecklist } from '@/components/TodoChecklist';
import { BusinessTypesManager } from '@/components/BusinessTypesManager';
import { AdminSettings } from '@/components/AdminSettings';
import { AdminUsersList } from '@/components/AdminUsersList';
import { ClientToolMonitor } from '@/components/ClientToolMonitor';
import { useNavigate, Link } from 'react-router-dom';
import { handleRobustSignOut } from '@/lib/auth-utils';

interface Stats {
  totalUsers: number;
  totalCalls: number;
  totalAppointments: number;
  activeUsers: number;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading, setSigningOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCalls: 0,
    totalAppointments: 0,
    activeUsers: 0,
  });
  const [users, setUsers] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [calendarAvailability, setCalendarAvailability] = useState<any>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && isAdmin) {
      fetchStats();
      fetchRecentActivity();
    }
  }, [user, isAdmin, loading, navigate]);

  const fetchRecentActivity = async () => {
    try {
      const { data: callMessages, error } = await supabase
        .from('call_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentActivity(callMessages || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch user count - directly from user_profiles table
      const { count: userCount, error: userCountError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (userCountError) {
        console.error('Error fetching user count:', userCountError);
      }
      console.log('📊 Total users count:', userCount);

      // Fetch call count
      const { count: callCount } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch appointment count
      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (users with activity in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentActivityUsers } = await supabase
        .from('user_activity')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const uniqueActiveUsers = new Set(recentActivityUsers?.map(activity => activity.user_id) || []);
      const activeUserCount = uniqueActiveUsers.size;

      // Fetch users using the RPC function (now fixed with proper type casting)
      console.log('🔍 Fetching users with RPC call...');
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_with_business_ids_for_admin');

      console.log('👥 Users data result:', usersData);
      console.log('❌ Users error:', usersError);

      if (usersError) {
        console.error('Error fetching users list:', usersError);
      }

      setStats({
        totalUsers: userCount || 0,
        totalCalls: callCount || 0,
        totalAppointments: appointmentCount || 0,
        activeUsers: activeUserCount || 0,
      });
      
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const testGoogleCalendarAvailability = async () => {
    setCalendarLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-availability', {
        body: { user_id: '54b21009-f5f0-45bf-b126-d11094178719' }
      });

      if (error) {
        console.error('Error calling calendar availability:', error);
        toast({
          title: "Error",
          description: "Failed to fetch calendar availability",
          variant: "destructive",
        });
        return;
      }

      setCalendarAvailability(data);
      toast({
        title: "Success",
        description: "Calendar availability fetched successfully",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error", 
        description: "Failed to call calendar availability function",
        variant: "destructive",
      });
    } finally {
      setCalendarLoading(false);
    }
  };


  if (loading || (user && !isAdmin && loading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!loading && !isAdmin) {
    // Show 404 for non-admin users
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <Button 
            onClick={() => navigate('/dashboard')}
            className="mt-4"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      {/* Header Navigation */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4">
          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <a href="/" className="flex items-center flex-shrink-0">
                <img 
                  src="/lovable-uploads/junie-logo.png" 
                  alt="Junie Logo" 
                  className="h-6 w-6"
                />
              </a>
              <h1 className="text-sm font-bold text-primary truncate">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-1">
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
              <Button variant="ghost" onClick={async () => {
                try {
                  await handleRobustSignOut(supabase, setSigningOut);
                } catch (error: any) {
                  window.location.href = '/';
                }
              }} className="h-8 w-8 p-0">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <a href="/" className="flex items-center">
                <img 
                  src="/lovable-uploads/junie-logo.png" 
                  alt="Junie Logo" 
                  className="h-8 w-8"
                />
              </a>
              <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
                <Settings className="w-5 h-5" />
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
              <Badge variant="secondary" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admin Access
              </Badge>
              <Badge variant="outline" className="max-w-48 truncate">
                {user?.email}
              </Badge>
              <Button variant="ghost" onClick={async () => {
                try {
                  await handleRobustSignOut(supabase, setSigningOut);
                } catch (error: any) {
                  window.location.href = '/';
                }
              }}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>

          {/* Mobile User Info Bar */}
          <div className="md:hidden mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <Badge variant="outline" className="text-xs max-w-[200px] truncate">
                {user?.email}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-muted-foreground mb-2">
            Admin Dashboard
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor platform performance and manage development tasks
          </p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4 sm:mb-6">
            <TabsTrigger value="users" className="text-xs sm:text-sm">User Stats</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
            <TabsTrigger value="api" className="text-xs sm:text-sm">API</TabsTrigger>
            <TabsTrigger value="todos" className="text-xs sm:text-sm">Todos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered users on platform
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Calls</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalCalls}</div>
                  <p className="text-xs text-muted-foreground">
                    Calls handled by AI
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold">{stats.totalAppointments}</div>
                  <p className="text-xs text-muted-foreground">
                    Appointments booked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Active Users</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="text-xl sm:text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Active in last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>

            <AdminUsersList users={users} onRefresh={fetchStats} />
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-6 sm:space-y-8">
            {/* Admin Settings */}
            <AdminSettings />

            {/* Business Types Manager */}
            <BusinessTypesManager />

            {/* Junie Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>About Junie</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">
                      <strong>Mission:</strong> Never miss a call with our AI-powered answering service
                    </p>
                    <p className="text-sm">
                      <strong>Features:</strong> 24/7 availability, appointment booking, lead capture, smart call routing
                    </p>
                    <p className="text-sm">
                      <strong>Technology:</strong> Advanced AI with natural language processing, integrated with business systems
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">API Status</span>
                      <Badge variant="default">Operational</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Database</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Services</span>
                      <Badge variant="default">Online</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="api" className="space-y-6">
            {/* API Monitoring Section Header */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">API Monitoring & Testing</h3>
              <p className="text-sm text-muted-foreground">Click on any tile to view detailed monitoring</p>
            </div>

            {/* API Tiles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/admin/post-call-data')}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Post Call Data
                  </CardTitle>
                  <CardDescription>
                    Monitor webhook events and call transcripts
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/admin/business-data-requests')}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Business Data Requests
                  </CardTitle>
                  <CardDescription>
                    Track business data API requests
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/admin/call-initiation-failures')}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5 text-destructive" />
                    Call Failures
                  </CardTitle>
                  <CardDescription>
                    View failed call initiation attempts
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/admin/client-tool-events')}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Client Tool Events
                  </CardTitle>
                  <CardDescription>
                    Monitor client tool invocations
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Google Calendar Availability Testing */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Calendar Integration Testing</h3>
              <Card className="flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Google Calendar Availability Test
                      </CardTitle>
                      <CardDescription className="mt-1.5">
                        Test the Google Calendar availability endpoint to see current results
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={testGoogleCalendarAvailability}
                      disabled={calendarLoading}
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      {calendarLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Test Availability
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  {calendarAvailability ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={calendarAvailability.available ? "default" : "destructive"}>
                          {calendarAvailability.available ? "Available" : "Unavailable"}
                        </Badge>
                        {calendarAvailability.timezone && (
                          <Badge variant="outline" className="truncate max-w-[150px]">
                            {calendarAvailability.timezone}
                          </Badge>
                        )}
                        {calendarAvailability.duration && (
                          <Badge variant="secondary">
                            {calendarAvailability.duration} min slots
                          </Badge>
                        )}
                      </div>
                      
                      {calendarAvailability.slots && calendarAvailability.slots.length > 0 ? (
                        <div>
                          <h4 className="font-medium mb-3 text-sm">Available Time Slots ({calendarAvailability.slots.length})</h4>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2 pr-4">
                              {calendarAvailability.slots.map((slot: any, index: number) => (
                                <div key={index} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg border border-border/50">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate">{slot.humanReadable}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {slot.startTime} - {slot.endTime}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="capitalize text-xs ml-3 shrink-0">
                                    {slot.timeOfDay}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">No available slots found</p>
                      )}
                      
                      {calendarAvailability.error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm text-destructive font-medium">Error:</p>
                          <p className="text-sm text-destructive break-words">{calendarAvailability.error}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground text-sm text-center">
                        Click "Test Availability" to check Google Calendar availability endpoint
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="todos" className="space-y-6">
            <TodoChecklist />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;