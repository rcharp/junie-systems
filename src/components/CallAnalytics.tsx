import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Phone, Calendar, MessageSquare, Clock, Users, Target } from "lucide-react";

const CallAnalytics = () => {
  const metrics = [
    {
      title: "Total Calls",
      value: "247",
      change: "+12%",
      trend: "up",
      icon: <Phone className="w-4 h-4" />,
      period: "vs last week"
    },
    {
      title: "Answer Rate",
      value: "100%",
      change: "0%",
      trend: "stable",
      icon: <Target className="w-4 h-4" />,
      period: "always perfect"
    },
    {
      title: "Conversion Rate",
      value: "89%",
      change: "+5%",
      trend: "up",
      icon: <TrendingUp className="w-4 h-4" />,
      period: "vs last week"
    },
    {
      title: "Avg Call Duration",
      value: "2:34",
      change: "-8s",
      trend: "down",
      icon: <Clock className="w-4 h-4" />,
      period: "vs last week"
    },
    {
      title: "Appointments Set",
      value: "156",
      change: "+18%",
      trend: "up",
      icon: <Calendar className="w-4 h-4" />,
      period: "vs last week"
    },
    {
      title: "Leads Captured",
      value: "203",
      change: "+15%",
      trend: "up",
      icon: <MessageSquare className="w-4 h-4" />,
      period: "vs last week"
    }
  ];

  const callTypes = [
    { type: "Sales Calls", count: 89, percentage: 36, color: "bg-success" },
    { type: "Support Requests", count: 62, percentage: 25, color: "bg-primary" },
    { type: "Urgent Calls", count: 31, percentage: 13, color: "bg-destructive" },
    { type: "Info Requests", count: 45, percentage: 18, color: "bg-accent" },
    { type: "Existing Clients", count: 20, percentage: 8, color: "bg-muted" }
  ];

  const hourlyStats = [
    { hour: "9 AM", calls: 23 },
    { hour: "10 AM", calls: 31 },
    { hour: "11 AM", calls: 28 },
    { hour: "12 PM", calls: 35 },
    { hour: "1 PM", calls: 29 },
    { hour: "2 PM", calls: 33 },
    { hour: "3 PM", calls: 27 },
    { hour: "4 PM", calls: 25 },
    { hour: "5 PM", calls: 16 }
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className="text-muted-foreground">{metric.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-1 text-xs">
                {metric.trend === 'up' && <TrendingUp className="w-3 h-3 text-success" />}
                {metric.trend === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
                <span className={
                  metric.trend === 'up' ? 'text-success' :
                  metric.trend === 'down' ? 'text-destructive' :
                  'text-muted-foreground'
                }>
                  {metric.change}
                </span>
                <span className="text-muted-foreground">{metric.period}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Call Types Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Call Types</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {callTypes.map((type, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{type.type}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{type.count} calls</span>
                      <Badge variant="secondary">{type.percentage}%</Badge>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`${type.color} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${type.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Hourly Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hourlyStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium w-16">{stat.hour}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(stat.calls / 35) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">{stat.calls}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-gradient-subtle border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span>Performance Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold text-success">100%</div>
              <div className="text-sm text-muted-foreground">Calls Answered</div>
              <p className="text-xs text-muted-foreground">Never miss a single call</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-primary">89%</div>
              <div className="text-sm text-muted-foreground">Lead Conversion</div>
              <p className="text-xs text-muted-foreground">Outstanding performance</p>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-accent">2:34</div>
              <div className="text-sm text-muted-foreground">Avg Duration</div>
              <p className="text-xs text-muted-foreground">Efficient conversations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallAnalytics;