import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare, Phone, AlertTriangle } from "lucide-react";
import { useState } from "react";

const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [urgentCallsOnly, setUrgentCallsOnly] = useState(false);
  const [email, setEmail] = useState("user@example.com");
  const [phone, setPhone] = useState("+1 (555) 123-4567");

  const recentNotifications = [
    {
      id: 1,
      type: "urgent",
      icon: <AlertTriangle className="w-4 h-4" />,
      title: "Urgent call received",
      message: "Emergency service request from Mike Thompson",
      time: "2 minutes ago",
      method: "SMS + Email"
    },
    {
      id: 2,
      type: "appointment",
      icon: <Phone className="w-4 h-4" />,
      title: "New appointment scheduled",
      message: "Sarah Johnson booked a consultation for tomorrow",
      time: "1 hour ago",
      method: "Email"
    },
    {
      id: 3,
      type: "lead",
      icon: <MessageSquare className="w-4 h-4" />,
      title: "New lead captured",
      message: "Jennifer Davis interested in pricing information",
      time: "3 hours ago",
      method: "SMS"
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notification Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <Label htmlFor="phone" className="text-base font-medium">Phone Number</Label>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="email-notifications" className="text-base font-medium">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive email alerts for calls and appointments</p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sms-notifications" className="text-base font-medium">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Get instant text messages for important calls</p>
              </div>
              <Switch
                id="sms-notifications"
                checked={smsNotifications}
                onCheckedChange={setSmsNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="urgent-only" className="text-base font-medium">Urgent Calls Only</Label>
                <p className="text-sm text-muted-foreground">Only notify for urgent or emergency calls</p>
              </div>
              <Switch
                id="urgent-only"
                checked={urgentCallsOnly}
                onCheckedChange={setUrgentCallsOnly}
              />
            </div>
          </div>

          <Button className="w-full">Save Notification Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentNotifications.map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
                <div className={`p-2 rounded-full ${
                  notification.type === 'urgent' ? 'bg-destructive/10 text-destructive' :
                  notification.type === 'appointment' ? 'bg-primary/10 text-primary' :
                  'bg-success/10 text-success'
                }`}>
                  {notification.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{notification.title}</h4>
                    <Badge variant="outline" className="text-xs">{notification.method}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationSettings;