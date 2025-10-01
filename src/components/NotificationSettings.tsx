import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, Mail, MessageSquare, Phone, AlertTriangle, Save } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const NotificationSettings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [instantAlerts, setInstantAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessSettingsId, setBusinessSettingsId] = useState<string | null>(null);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [forwardingNumber, setForwardingNumber] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Load notification settings on component mount
  useEffect(() => {
    if (user) {
      loadNotificationSettings();
    }
  }, [user]);

  const loadNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('id, email_notifications, sms_notifications, push_notifications, instant_alerts, forwarding_number')
        .eq('user_id', user?.id)
        .single();

      if (error) {
        console.error('Error loading notification settings:', error);
        return;
      }

      if (data) {
        setBusinessSettingsId(data.id);
        setEmailNotifications(data.email_notifications !== false);
        setSmsNotifications(data.sms_notifications || false);
        setPushNotifications(data.push_notifications !== false);
        setInstantAlerts(data.instant_alerts !== false);
        setForwardingNumber(data.forwarding_number || "");
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to load notification settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-save function with debouncing
  const debouncedAutoSave = useCallback(() => {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      if (!businessSettingsId) return;
      
      setIsAutoSaving(true);
      try {
        await saveNotificationSettingsInternal();
        toast({
          title: "Settings saved",
          description: "Your notification preferences have been automatically saved.",
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
        toast({
          title: "Auto-save failed",
          description: "There was an error saving your notification settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsAutoSaving(false);
      }
    }, 3000);
    
    setAutoSaveTimeout(timeout);
  }, [autoSaveTimeout, businessSettingsId, toast]);

  const saveNotificationSettings = async () => {
    if (!businessSettingsId) {
      toast({
        title: "Error",
        description: "No business settings found. Please complete your business setup first.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await saveNotificationSettingsInternal();
      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettingsInternal = async () => {
    if (!businessSettingsId) return;
    const { error } = await supabase
      .from('business_settings')
      .update({
        email_notifications: emailNotifications,
        sms_notifications: smsNotifications,
        push_notifications: pushNotifications,
        instant_alerts: instantAlerts
      })
      .eq('id', businessSettingsId);

    if (error) {
      throw error;
    }
  };

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Notification Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Loading notification settings...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-base font-medium">Email Notifications</span>
                </div>
                <p className="text-sm text-muted-foreground">Receive email alerts for calls and appointments</p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => {
                  setEmailNotifications(checked);
                  debouncedAutoSave();
                }}
              />
            </div>

            <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-base font-medium">SMS Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Get instant text messages for important calls</p>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Switch
                          id="sms-notifications"
                          checked={smsNotifications}
                          disabled={!smsOptIn}
                          onCheckedChange={(checked) => {
                            setSmsNotifications(checked);
                            debouncedAutoSave();
                          }}
                        />
                      </div>
                    </TooltipTrigger>
                    {!smsOptIn && (
                      <TooltipContent>
                        <p>Please agree to the terms below first</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Forwarding Number Display */}
              <div className="space-y-2">
                <Label htmlFor="forwarding-number" className="text-sm font-medium">
                  SMS Notification Number
                </Label>
                <Input
                  id="forwarding-number"
                  value={forwardingNumber || "Not set"}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  SMS notifications will be sent to this number. Update this in AI Caller settings.
                </p>
              </div>
              
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="sms-opt-in"
                  checked={smsOptIn}
                  onCheckedChange={(checked) => {
                    setSmsOptIn(checked as boolean);
                    if (!checked) {
                      setSmsNotifications(false);
                    }
                    debouncedAutoSave();
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="sms-opt-in"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I agree to receive text messages about potential customer inquiries
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you consent to receive SMS notifications about new leads and customer messages. Standard messaging rates may apply. You can opt out at any time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="text-base font-medium">Push Notifications</span>
                </div>
                <p className="text-sm text-muted-foreground">Browser notifications for real-time updates</p>
              </div>
              <Switch
                id="push-notifications"
                checked={pushNotifications}
                onCheckedChange={(checked) => {
                  setPushNotifications(checked);
                  debouncedAutoSave();
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-base font-medium">Instant Alerts</span>
                </div>
                <p className="text-sm text-muted-foreground">Get immediate notifications for urgent matters</p>
              </div>
              <Switch
                id="instant-alerts"
                checked={instantAlerts}
                onCheckedChange={(checked) => {
                  setInstantAlerts(checked);
                  debouncedAutoSave();
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isAutoSaving ? "Auto-saving changes..." : "Changes are automatically saved"}
            </div>
            <Button 
              onClick={saveNotificationSettings}
              disabled={saving || isAutoSaving}
              variant="outline"
              size="sm"
              className="bg-gradient-primary hover:opacity-90 text-white border-none"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Now"}
            </Button>
          </div>
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