import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, CheckCircle, AlertCircle, ExternalLink, Settings } from "lucide-react";
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
  const [googleEmail, setGoogleEmail] = useState<string>("");
  const [googleAvatarUrl, setGoogleAvatarUrl] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCalendarSettings();
      fetchGoogleProfile();
    }
  }, [user]);

  const fetchGoogleProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        // Extract Google profile data from identities or user_metadata
        const googleIdentity = authUser.identities?.find(id => id.provider === 'google');
        const identityData = googleIdentity?.identity_data;
        const userMeta = authUser.user_metadata;

        const email = identityData?.email || userMeta?.email || authUser.email || '';
        const avatar = identityData?.avatar_url || identityData?.picture || userMeta?.avatar_url || userMeta?.picture || '';

        setGoogleEmail(email);
        setGoogleAvatarUrl(avatar);
      }
    } catch (error) {
      console.error('Error fetching Google profile:', error);
    }
  };

  const fetchCalendarSettings = async () => {
    try {
      // Fetch calendar settings (excluding encrypted tokens via RLS policy)
      const { data, error } = await supabase
        .from('google_calendar_settings')
        .select('id, is_connected, calendar_id, timezone, appointment_duration, created_at, updated_at, expires_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching calendar settings:', error);
        return;
      }

      const settings = data?.[0] || null;
      // Connection validation is now done server-side
      setCalendarSettings(settings);
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
      // Update the record to clear connection and tokens
      const { error: updateError } = await supabase
        .from('google_calendar_settings')
        .update({
          is_connected: false,
          expires_at: null
        })
        .eq('user_id', user?.id);

      if (updateError) {
        console.error('Error updating calendar settings:', updateError);
        // If update fails, try to delete the record
        const { error: deleteError } = await supabase
          .from('google_calendar_settings')
          .delete()
          .eq('user_id', user?.id);
        
        if (deleteError) throw deleteError;
      }

      setCalendarSettings(null);
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
            
            {/* Google Profile Display with all calendar info */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                  <AvatarImage src={googleAvatarUrl} alt="Calendar Profile" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {calendarSettings.calendar_id?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="bg-white flex items-center gap-1.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Google Calendar
                    </Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{calendarSettings.calendar_id || 'Not set'}</p>
                  <p className="text-xs text-muted-foreground">Calendar connected</p>
                </div>
              </div>
              
              {/* Calendar details */}
              <div className="space-y-2 pt-2 border-t border-primary/10">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Timezone:</strong> {calendarSettings.timezone || 'Not set'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Appointment Duration:</strong> {calendarSettings.appointment_duration || 60} minutes
                  </span>
                </div>
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

            {/* Calendar Information and Instructions */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Calendar Integration Active</h4>
                <p className="text-sm text-blue-700">
                  Your Google Calendar is now connected! Appointments booked through your AI phone system will automatically appear in your calendar.
                </p>
              </div>
              
              {/* Embedded Calendar */}
              {calendarSettings.calendar_id && calendarSettings.timezone && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Your Calendar</Label>
                  <div className="w-full rounded-lg overflow-hidden border-2 border-primary/20 shadow-lg">
                    <iframe
                      src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarSettings.calendar_id)}&ctz=${encodeURIComponent(calendarSettings.timezone)}&mode=WEEK&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=1`}
                      className="w-full h-[600px] border-0"
                      title="Google Calendar"
                    />
                  </div>
                </div>
              )}
              
              {calendarSettings.calendar_id && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Quick Calendar Access</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://calendar.google.com/calendar/u/0/r`, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Google Calendar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://calendar.google.com/calendar/u/0/r/settings`, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Calendar Settings
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDisconnect}
                      className="flex items-center gap-2"
                    >
                      Disconnect Calendar
                    </Button>
                  </div>
                </div>
              )}
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