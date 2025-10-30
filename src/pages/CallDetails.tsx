import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Clock, User, Calendar, Mail, Play, Download, MessageSquare, Settings, Bell, LogOut, Shield } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Link } from "react-router-dom";
import { handleRobustSignOut } from "@/lib/auth-utils";
import { cleanTranscript } from "@/lib/transcript-utils";
import { JuniePhoneDisplay } from "@/components/JuniePhoneDisplay";
import { cleanCallerName } from "@/lib/caller-utils";

interface CallData {
  id: string;
  call_id?: string;
  caller_name: string;
  phone_number: string;
  email?: string;
  message: string;
  urgency_level: string;
  best_time_to_call?: string;
  call_type: string;
  status?: string;
  call_duration?: number;
  recording_url?: string;
  transcript?: string;
  created_at: string;
  call_status?: string;
  business_name?: string;
  business_type?: string;
  provider?: string;
  business_id?: string;
  appointment_scheduled?: boolean;
  appointment_date_time?: string;
  service_address?: string;
  call_summary?: string;
  incoming_call_phone_number?: string;
  additional_notes?: string;
  service_type?: string;
  issue_details?: string;
  metadata?: any;
}

const CallDetails = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, setSigningOut } = useAuth();
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const handleSignOut = async () => {
    try {
      await handleRobustSignOut(supabase, setSigningOut);
    } catch (error: any) {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    if (callId && user) {
      fetchCallDetails();
      fetchRecentActivity();
    }
  }, [callId, user]);

  const fetchRecentActivity = async () => {
    try {
      const { data: callMessages, error } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentActivity(callMessages || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchCallDetails = async () => {
    try {
      setLoading(true);

      // Get user's business_id first to find associated data
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (businessError) throw businessError;

      // Try to find in call_logs first (most comprehensive call data)
      // Search by both user_id and business_id (similar to CallList logic)
      let logQuery = supabase
        .from('call_logs')
        .select('*')
        .eq('id', callId);

      if (businessData) {
        // If user has business settings, search using both user_id and business_id
        logQuery = logQuery.or(`user_id.eq.${user?.id},business_id.eq.${businessData.id}`);
      } else {
        // Fallback to just user_id
        logQuery = logQuery.eq('user_id', user?.id);
      }

      const { data: logData, error: logError } = await logQuery.maybeSingle();

      if (logData) {
        setCallData(logData);
        return;
      }

      // If not found in call_logs, try call_messages
      const { data: messageData, error: messageError } = await supabase
        .from('call_messages')
        .select('*')
        .eq('id', callId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (messageData) {
        setCallData(messageData);
        return;
      }

      // If not found in either table, show error
      toast({
        title: "Error",
        description: "Call not found or you don't have permission to view it",
        variant: "destructive",
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error fetching call details:', error);
      toast({
        title: "Error",
        description: "Failed to load call details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      default:
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
    }
  };

  const getCallTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'appointment':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'inquiry':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'complaint':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'sales':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'support':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
      case 'emergency':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'consultation':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
      case 'quote':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
    }
  };

  const getCallReason = (callData: CallData) => {
    const callType = callData.call_type?.toLowerCase() || 'inquiry';
    const businessType = callData.business_type || '';
    const summary = callData.call_summary || callData.message || '';
    
    // Extract service type from summary or message
    const lowerSummary = summary.toLowerCase();
    
    // Common service patterns
    const servicePatterns = {
      'hvac|a/c|air conditioning|heating|cooling': 'HVAC',
      'plumbing|plumber|leak|drain|pipe': 'Plumbing',
      'electrical|electrician|wiring|power': 'Electrical',
      'roofing|roof|shingle': 'Roofing',
      'cleaning|clean|maid': 'Cleaning',
      'lawn|landscaping|yard|garden': 'Landscaping',
      'pest|exterminator|bug|termite': 'Pest Control',
      'repair|fix|broken': 'Repair',
      'installation|install': 'Installation',
      'maintenance|service': 'Service',
      'emergency|urgent': 'Emergency',
      'estimate|quote|pricing': 'Estimate'
    };
    
    let serviceType = '';
    for (const [pattern, type] of Object.entries(servicePatterns)) {
      if (new RegExp(pattern, 'i').test(lowerSummary)) {
        serviceType = type;
        break;
      }
    }
    
    // Generate description based on call type and detected service
    // If call_type is appointment but no appointment was actually scheduled, treat as inquiry
    const effectiveCallType = (callType === 'appointment' && !callData.appointment_scheduled && !callData.appointment_date_time) 
      ? 'inquiry' 
      : callType;
    
    switch (effectiveCallType) {
      case 'appointment':
        return serviceType ? `${serviceType} Appointment` : 'Service Appointment';
      case 'complaint':
        return serviceType ? `${serviceType} Complaint` : 'Service Complaint';
      case 'sales':
        return serviceType ? `${serviceType} Sales Inquiry` : 'Sales Inquiry';
      case 'support':
        return serviceType ? `${serviceType} Support` : 'Customer Support';
      case 'emergency':
        return serviceType ? `${serviceType} Emergency` : 'Emergency Call';
      case 'inquiry':
      default:
        return serviceType ? `${serviceType} Inquiry` : 'Service Inquiry';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Call not found</h3>
            <p className="text-muted-foreground mb-4">
              The call you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
            <Link to="/" className="flex items-center">
              <img 
                src="/lovable-uploads/junie-logo.png" 
                alt="Junie Logo" 
                className="h-8 w-8"
              />
            </Link>
            <h1 className="text-xl font-bold text-primary">Call Details</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/admin")}
                className="text-primary hover:bg-primary/10"
              >
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Button>
            <Button variant="ghost" onClick={() => navigate("/settings")} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
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
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Call Info Header */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {callData.incoming_call_phone_number || callData.phone_number || 'Unknown Number'} - {getCallReason(callData)}
              </h2>
              <p className="text-muted-foreground">
                Call Time: {format(new Date(callData.created_at), 'M/d/yyyy, h:mm:ss a')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={getUrgencyColor(callData.urgency_level)}>
                {callData.urgency_level}
              </Badge>
              <Badge className={getCallTypeColor(callData.call_type)}>
                {callData.call_type}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Call Details and Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Call Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Call Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Caller Name</span>
                    <p className="mt-1">
                      {(() => {
                        const cleanedName = cleanCallerName(callData.caller_name);
                        // If the name is a generic placeholder, show "No Name Given"
                        if (cleanedName.toLowerCase().includes('potential customer') || 
                            cleanedName.toLowerCase().includes('customer') || 
                            cleanedName.toLowerCase().includes('caller')) {
                          return 'No Name Given';
                        }
                        return cleanedName;
                      })()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                    <p className="mt-1">
                      {callData.phone_number && callData.phone_number !== 'Unknown' 
                        ? callData.phone_number 
                        : callData.incoming_call_phone_number 
                          ? callData.incoming_call_phone_number.replace(/^\+1/, '')
                          : 'Unknown'}
                    </p>
                  </div>
                  {callData.service_address ? (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Service Address</span>
                      <p className="mt-1">{callData.service_address}</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Service Address</span>
                      <p className="mt-1">N/A</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Service Type</span>
                    <p className="mt-1">{callData.service_type || 'N/A'}</p>
                  </div>
                  {callData.issue_details && (
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Issue Details</span>
                      <p className="mt-1 text-foreground font-medium">{callData.issue_details}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Appointment Scheduled</span>
                    <p className="mt-1">{callData.appointment_scheduled ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Appointment Date/Time</span>
                    <p className="mt-1">
                      {(() => {
                        if (!callData.appointment_date_time) {
                          return 'Not scheduled';
                        }
                        
                        try {
                          let dateString = String(callData.appointment_date_time);
                          console.log('Original date string:', dateString);
                          
                          // Handle postgres timestamp format "2025-09-26 13:00:00+00"
                          if (dateString.includes(' ') && !dateString.includes('T')) {
                            // Convert postgres format to ISO
                            dateString = dateString.replace(' ', 'T');
                            if (dateString.endsWith('+00')) {
                              dateString = dateString.replace('+00', 'Z');
                            }
                            console.log('Converted to ISO:', dateString);
                          }
                          
                          const appointmentDate = new Date(dateString);
                          console.log('Parsed date object:', appointmentDate);
                          console.log('Is valid:', !isNaN(appointmentDate.getTime()));
                          
                          if (!isNaN(appointmentDate.getTime())) {
                            const formatted = formatInTimeZone(appointmentDate, 'America/New_York', 'EEEE, MMM do \'at\' h:mma');
                            console.log('Final formatted:', formatted);
                            
                            // Create Google Calendar link
                            const startTime = appointmentDate.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
                            const endTime = new Date(appointmentDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
                            const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&dates=${startTime}/${endTime}&text=${encodeURIComponent(callData.caller_name + ' - Service Appointment')}&details=${encodeURIComponent(callData.message || '')}&location=${encodeURIComponent(callData.service_address || '')}`;
                            
                            return (
                              <a 
                                href={googleCalendarUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline cursor-pointer"
                              >
                                {formatted}
                              </a>
                            );
                          }
                        } catch (error) {
                          console.error('Date parsing error:', error, callData.appointment_date_time);
                        }
                        
                        return 'Invalid date';
                      })()}
                    </p>
                  </div>
                  {callData.additional_notes && (
                    <div className="col-span-2">
                      <span className="text-sm font-medium text-muted-foreground">Additional Notes</span>
                      <p className="mt-1">{callData.additional_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Call Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Call Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{callData.call_summary || callData.message}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transcript */}
          {callData.transcript && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Call Transcript</CardTitle>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([callData.transcript], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `transcript-${callData.id}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Transcript
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm">
                    {cleanTranscript(callData.transcript)}
                    {'\n\n[Call ended]'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {callData.recording_url && (
            <div className="flex gap-4">
              <Button variant="outline" asChild>
                <a href={callData.recording_url} target="_blank" rel="noopener noreferrer">
                  <Play className="mr-2 h-4 w-4" />
                  Play Recording
                </a>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CallDetails;