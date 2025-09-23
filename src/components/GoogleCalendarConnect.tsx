import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CalendarSettings {
  id: string;
  is_connected: boolean;
  calendar_id?: string;
  timezone?: string;
  appointment_duration?: number;
}

const GoogleCalendarConnect = () => {
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCalendarSettings();
    }
  }, [user]);

  const fetchCalendarSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('google_calendar_settings')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching calendar settings:', error);
        return;
      }

      setCalendarSettings(data?.[0] || null);
    } catch (error) {
      console.error('Error fetching calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        method: 'GET',
      });

      if (error) throw error;

      if (data?.authUrl) {
        // Open OAuth flow in a new window
        const popup = window.open(
          data.authUrl,
          'google-calendar-oauth',
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );

        // Listen for messages from the popup
        const messageListener = (event: MessageEvent) => {
          if (event.data?.type === 'google-calendar-connected') {
            window.removeEventListener('message', messageListener);
            popup?.close();
            // Refresh settings after OAuth completion
            setTimeout(() => {
              fetchCalendarSettings();
              setConnecting(false);
              toast({
                title: "Connected",
                description: "Google Calendar has been connected successfully!",
              });
            }, 500);
          } else if (event.data?.type === 'google-calendar-error') {
            window.removeEventListener('message', messageListener);
            popup?.close();
            setConnecting(false);
            toast({
              title: "Connection Failed",
              description: event.data?.error || "Failed to connect to Google Calendar. Please try again.",
              variant: "destructive",
            });
          }
        };

        window.addEventListener('message', messageListener);

        // Fallback: check if popup is closed manually (in case postMessage fails)
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageListener);
            // Always reset connecting state when popup closes
            setConnecting(false);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error } = await supabase
        .from('google_calendar_settings')
        .update({
          is_connected: false,
          encrypted_access_token: null,
          encrypted_refresh_token: null,
          expires_at: null,
          calendar_id: null,
        })
        .eq('user_id', user?.id);

      if (error) throw error;

      setCalendarSettings(prev => prev ? { ...prev, is_connected: false } : null);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected from your account.",
      });
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDurationChange = async (duration: string) => {
    try {
      const { error } = await supabase
        .from('google_calendar_settings')
        .update({ appointment_duration: parseInt(duration) })
        .eq('user_id', user?.id);

      if (error) throw error;

      setCalendarSettings(prev => prev ? { ...prev, appointment_duration: parseInt(duration) } : null);
      toast({
        title: "Settings Updated",
        description: `Appointment duration set to ${duration} minutes.`,
      });
    } catch (error) {
      console.error('Error updating appointment duration:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment duration. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Appointment duration options as specified
  const durationOptions = [
    { value: "15", label: "15 minutes" },
    { value: "30", label: "30 minutes" },
    { value: "45", label: "45 minutes" },
    { value: "60", label: "1 hour" },
    { value: "90", label: "1.5 hours" },
    { value: "120", label: "2 hours" },
    { value: "180", label: "3 hours" }
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Loading calendar settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar to automatically check availability and schedule appointments when customers call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {calendarSettings?.is_connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Google Calendar Connected</span>
            </div>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  <strong>Connected Account:</strong> {calendarSettings.calendar_id || 'Not set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">
                  <strong>Timezone:</strong> {calendarSettings.timezone || 'Not set'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  <strong>Appointment Duration:</strong> {calendarSettings.appointment_duration || 60} minutes
                </span>
              </div>
            </div>

            {/* Appointment Duration Settings */}
            <div className="space-y-3">
              <Label htmlFor="appointment-duration" className="text-sm font-medium">
                Default Appointment Duration
              </Label>
              <Select
                value={calendarSettings.appointment_duration?.toString() || "60"}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select appointment duration" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Embedded Google Calendar */}
            <div className="w-full">
              <iframe
                src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarSettings.calendar_id || 'primary')}&ctz=${encodeURIComponent(calendarSettings.timezone || 'America/New_York')}&showTitle=0&showDate=1&showPrint=0&showCalendars=0&mode=WEEK&height=600&wkst=1&bgcolor=%23ffffff`}
                style={{ border: 0 }}
                width="100%"
                height="500"
                frameBorder="0"
                scrolling="no"
                title="Google Calendar"
                className="rounded-lg border"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="flex-1"
              >
                Disconnect Calendar
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://calendar.google.com', '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open Calendar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <span>Google Calendar not connected</span>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Benefits of connecting your calendar:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic availability checking for appointment scheduling</li>
                <li>• Seamless appointment booking directly to your calendar</li>
                <li>• Real-time schedule updates and conflict prevention</li>
                <li>• Professional calendar invites sent to customers</li>
              </ul>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarConnect;