// @ts-nocheck
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
import { CallInitiationFailuresMonitor } from '@/components/CallInitiationFailuresMonitor';
import { SystemTestRunner } from '@/components/SystemTestRunner';
import { AppointmentSyncQueue } from '@/components/AppointmentSyncQueue';
import BlogAutomation from '@/components/BlogAutomation';
import { StripeCustomers } from '@/components/StripeCustomers';
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
  const [calendarTestDuration, setCalendarTestDuration] = useState<number | null>(null);
  

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
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-availability', {
        body: { user_id: '54b21009-f5f0-45bf-b126-d11094178719' }
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      setCalendarTestDuration(duration);

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
        description: `Calendar availability fetched in ${duration}ms`,
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

        <div className="mb-4 flex justify-end">
          <Button variant="outline" onClick={() => navigate('/ghl')}>
            Open GHL Admin
          </Button>
        </div>
        <StripeCustomers />
      </main>
    </div>
  );
};

export default AdminDashboard;