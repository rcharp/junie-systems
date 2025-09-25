import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Users, Phone, Calendar, TrendingUp, Shield, Activity, ArrowLeft, Settings, Bell, LogOut, Clock, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { WebhookMonitor } from '@/components/WebhookMonitor';
import { UserWebhookList } from '@/components/UserWebhookList';
import { BusinessDataMonitor } from '@/components/BusinessDataMonitor';
import { TodoChecklist } from '@/components/TodoChecklist';
import { useNavigate, Link } from 'react-router-dom';
import { handleRobustSignOut } from '@/lib/auth-utils';

interface Stats {
  totalUsers: number;
  totalCalls: number;
  totalAppointments: number;
  activeUsers: number;
}

const AdminDashboard = () => {
  const { user, isAdmin, loading } = useAuth();
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
      // Fetch user count
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

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
      
      const { count: activeUserCount } = await supabase
        .from('user_activity')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Fetch users with business IDs and emails for admin view using secure function
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_users_with_business_ids_for_admin');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
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
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header Navigation */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
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
            <Badge variant="outline">
              {user?.email}
            </Badge>
            <Button variant="ghost" onClick={async () => {
              try {
                await handleRobustSignOut(supabase);
              } catch (error: any) {
                window.location.href = '/';
              }
            }}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-muted-foreground mb-2">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor platform performance and manage development tasks
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="todos">Development Todos</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered users on platform
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCalls}</div>
                  <p className="text-xs text-muted-foreground">
                    Calls handled by AI
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAppointments}</div>
                  <p className="text-xs text-muted-foreground">
                    Appointments booked
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    Active in last 30 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Google Calendar Availability Testing */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Google Calendar Availability Test
                    </CardTitle>
                    <CardDescription>
                      Test the Google Calendar availability endpoint to see current results
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={testGoogleCalendarAvailability}
                    disabled={calendarLoading}
                    size="sm"
                    variant="outline"
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
              <CardContent>
                {calendarAvailability ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Badge variant={calendarAvailability.available ? "default" : "destructive"}>
                        {calendarAvailability.available ? "Available" : "Unavailable"}
                      </Badge>
                      {calendarAvailability.timezone && (
                        <Badge variant="outline">
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
                        <h4 className="font-medium mb-3">Available Time Slots ({calendarAvailability.slots.length})</h4>
                        <div className="grid gap-2 max-h-60 overflow-y-auto">
                          {calendarAvailability.slots.map((slot: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium">{slot.humanReadable}</p>
                                <p className="text-sm text-muted-foreground">
                                  {slot.startTime} - {slot.endTime}
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {slot.timeOfDay}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No available slots found</p>
                    )}
                    
                    {calendarAvailability.error && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive font-medium">Error:</p>
                        <p className="text-sm text-destructive">{calendarAvailability.error}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Click "Test Availability" to check Google Calendar availability endpoint
                  </p>
                )}
              </CardContent>
            </Card>

            {/* User Business IDs - Paginated */}
            <UserWebhookList />

            {/* Post-Call Data */}
            <WebhookMonitor />

            {/* Business Data Requests */}
            <BusinessDataMonitor />

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
          
          <TabsContent value="todos">
            <TodoChecklist />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;