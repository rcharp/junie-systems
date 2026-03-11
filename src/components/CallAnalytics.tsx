// @ts-nocheck
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Clock, TrendingUp, Users, MessageSquare, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, eachDayOfInterval } from "date-fns";

interface CallMetrics {
  totalCalls: number;
  totalMessages: number;
  averageDuration: number;
  urgentCalls: number;
  completionRate: number;
  dailyStats: Array<{
    date: string;
    calls: number;
    messages: number;
  }>;
  callTypeDistribution: Array<{
    type: string;
    count: number;
    color: string;
  }>;
  urgencyDistribution: Array<{
    level: string;
    count: number;
    color: string;
  }>;
}

const CallAnalytics = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<CallMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);
      
      // Get user's business_id first
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (businessError) throw businessError;

      let logs: any[] = [];
      
      if (businessData) {
        // Fetch call logs using both user_id and business_id
        const { data: callLogs, error: callError } = await supabase
          .from('call_logs')
          .select('*')
          .or(`user_id.eq.${user?.id},business_id.eq.${businessData.id}`)
          .gte('created_at', startDate.toISOString());

        if (callError) throw callError;
        logs = callLogs || [];
      }

      // Fetch call messages
      const { data: callMessages, error: messageError } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (messageError) throw messageError;

      const messages = callMessages || [];

      // Calculate metrics
      const totalDuration = logs.reduce((sum, call) => sum + (call.call_duration || 0), 0);
      const completedCalls = logs.filter(call => call.call_status === 'completed').length;
      const urgentItems = [...logs, ...messages].filter(item => item.urgency_level === 'urgent').length;

      // Generate daily stats
      const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
      const dailyStats = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const callsOnDate = logs.filter(call => 
          format(new Date(call.created_at), 'yyyy-MM-dd') === dateStr
        ).length;
        const messagesOnDate = messages.filter(msg => 
          format(new Date(msg.created_at), 'yyyy-MM-dd') === dateStr
        ).length;

        return {
          date: format(date, 'MMM d'),
          calls: callsOnDate,
          messages: messagesOnDate,
        };
      });

      // Call type distribution
      const callTypes = [...logs, ...messages].reduce((acc, item) => {
        acc[item.call_type] = (acc[item.call_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const callTypeColors = {
        'appointment': '#3b82f6',
        'sales': '#10b981',
        'support': '#8b5cf6',
        'complaint': '#ef4444',
        'inquiry': '#f59e0b',
      };

      const callTypeDistribution = Object.entries(callTypes).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count: count as number,
        color: callTypeColors[type as keyof typeof callTypeColors] || '#6b7280',
      }));

      // Urgency distribution
      const urgencyLevels = [...logs, ...messages].reduce((acc, item) => {
        acc[item.urgency_level] = (acc[item.urgency_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const urgencyColors = {
        'urgent': '#ef4444',
        'high': '#f97316',
        'medium': '#eab308',
        'low': '#22c55e',
      };

      const urgencyDistribution = Object.entries(urgencyLevels).map(([level, count]) => ({
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count: count as number,
        color: urgencyColors[level as keyof typeof urgencyColors] || '#6b7280',
      }));

      setMetrics({
        totalCalls: logs.length,
        totalMessages: messages.length,
        averageDuration: logs.length > 0 ? Math.round(totalDuration / logs.length) : 0,
        urgentCalls: urgentItems,
        completionRate: logs.length > 0 ? Math.round((completedCalls / logs.length) * 100) : 0,
        dailyStats,
        callTypeDistribution,
        urgencyDistribution,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No analytics data</h3>
          <p className="text-muted-foreground">
            Analytics will appear here once your AI assistant starts handling calls.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex space-x-2">
        {['7d', '30d', '90d'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{metrics.totalCalls}</div>
            <p className="text-xs text-muted-foreground">
              AI assistant handled calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Captured</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{metrics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">
              Leads and inquiries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Call Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{Math.floor(metrics.averageDuration / 60)}m {metrics.averageDuration % 60}s</div>
            <p className="text-xs text-muted-foreground">
              Average time per call
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Calls</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{metrics.urgentCalls}</div>
            <p className="text-xs text-muted-foreground">
              Requiring immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Calls"
                />
                <Line 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Messages"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Call Type and Urgency Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Call Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.callTypeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ type, count }) => `${type}: ${count}`}
                  >
                    {metrics.callTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Urgency Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.urgencyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="level" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count">
                    {metrics.urgencyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CallAnalytics;