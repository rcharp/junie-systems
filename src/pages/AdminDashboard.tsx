import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Users, Phone, Calendar, TrendingUp, Shield, Activity, ArrowLeft } from 'lucide-react';
import { WebhookMonitor } from '@/components/WebhookMonitor';
import { useNavigate } from 'react-router-dom';

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
  

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin, loading, navigate]);

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

      // Fetch users with webhook IDs for admin view
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('id, webhook_id, full_name, company_name, created_at')
        .order('created_at', { ascending: false });

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
                src="/lovable-uploads/ee3492f3-d22d-476c-a1e1-bbdf4bf6f644.png" 
                alt="Availabee Logo" 
                className="h-8 w-8"
              />
            </a>
            <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Access
            </Badge>
            <Badge variant="outline">
              {user?.email}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            System Overview
          </h2>
          <p className="text-muted-foreground">
            Monitor platform performance and user activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* User Webhook IDs */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>User Webhook IDs</CardTitle>
            <CardDescription>
              Webhook IDs for each user to configure their AI answering service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.length > 0 ? (
                <div className="grid gap-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {user.full_name || user.company_name || 'Unnamed User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          User ID: {user.id}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {user.webhook_id || 'No webhook ID'}
                        </span>
                        {user.webhook_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(user.webhook_id);
                              toast({
                                title: "Copied!",
                                description: "Webhook ID copied to clipboard",
                              });
                            }}
                          >
                            Copy
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No users found</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Webhook Monitor */}
        <WebhookMonitor />

        {/* Availabee Info */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>About Availabee</CardTitle>
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
      </main>
    </div>
  );
};

export default AdminDashboard;