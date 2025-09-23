import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Phone, 
  Clock, 
  User, 
  Calendar, 
  Play, 
  Download, 
  Mail,
  MessageSquare,
  FileText,
  AlertCircle,
  Shield
} from "lucide-react";
import { format } from "date-fns";

interface CallDetail {
  id: string;
  call_id?: string;
  caller_name: string;
  phone_number: string;
  email?: string;
  call_status?: string;
  call_type: string;
  urgency_level: string;
  message: string;
  call_duration?: number;
  recording_url?: string;
  transcript?: string;
  best_time_to_call?: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  ended_at?: string;
}

const CallDetails = () => {
  const { callId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [callDetail, setCallDetail] = useState<CallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMessage, setIsMessage] = useState(false);

  useEffect(() => {
    if (user && callId) {
      fetchCallDetail();
    }
  }, [user, callId]);

  const fetchCallDetail = async () => {
    try {
      setLoading(true);
      
      // First try to find in call_logs
      const { data: logData, error: logError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', callId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (logData) {
        setCallDetail(logData);
        setIsMessage(false);
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
        setCallDetail(messageData);
        setIsMessage(true);
        return;
      }

      // If not found in either table
      if (logError && messageError) {
        throw new Error('Call not found');
      }

    } catch (error: any) {
      console.error('Error fetching call detail:', error);
      toast({
        title: "Error",
        description: "Failed to load call details",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getCallTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'complaint':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'sales':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'support':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!callDetail) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Call not found</h3>
            <p className="text-muted-foreground mb-4">
              The call details you're looking for could not be found.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
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
            <Badge variant="outline">
              {isMessage ? 'Message' : 'Call Log'}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Call Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    {/* Show incoming call info if available */}
                    {(() => {
                      const incomingCall = callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.caller_id?.value || callDetail.metadata?.caller_id;
                      if (incomingCall) {
                        return (
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Incoming - {incomingCall}
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <CardTitle className="text-2xl">{callDetail.caller_name}</CardTitle>
                    <p className="text-muted-foreground">
                      Call Time: {format(new Date(callDetail.created_at), 'EEEE, MMMM d, yyyy at h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge className={getUrgencyColor(callDetail.urgency_level)}>
                    {callDetail.urgency_level}
                  </Badge>
                  <Badge className={getCallTypeColor(callDetail.call_type)}>
                    {callDetail.call_type}
                  </Badge>
                  {callDetail.call_status && (
                    <Badge variant={callDetail.call_status === 'completed' ? 'default' : 'secondary'}>
                      {callDetail.call_status}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Call Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Business ID */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Business ID</label>
                    <div className="mt-1">
                      {(() => {
                        const businessId = 
                          callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.business_id?.value ||
                          callDetail.metadata?.conversation_initiation_client_data?.dynamic_variables?.business_id ||
                          callDetail.metadata?.business_id;
                        return businessId ? (
                          <span className="font-mono text-sm">{businessId}</span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                    <div className="mt-1">
                      {callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.company_name?.value || 
                       callDetail.metadata?.conversation_initiation_client_data?.dynamic_variables?.business_name || 
                       'N/A'}
                    </div>
                  </div>

                  {/* Caller Name */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Caller Name</label>
                    <div className="mt-1">{callDetail.caller_name}</div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                    <div className="mt-1">{callDetail.phone_number}</div>
                  </div>

                  {/* Incoming Call */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Incoming Call</label>
                    <div className="mt-1">
                      {(() => {
                        const incomingCall = callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.caller_id?.value || callDetail.metadata?.caller_id;
                        return incomingCall || callDetail.phone_number;
                      })()}
                    </div>
                  </div>

                  {/* Call Duration */}
                  {callDetail.call_duration && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Call Duration</label>
                      <div className="mt-1">
                        {Math.floor(callDetail.call_duration / 60)}m {callDetail.call_duration % 60}s
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Email Address */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                    <div className="mt-1">
                      {(() => {
                        const email = callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.email?.value || callDetail.email;
                        return email || 'N/A';
                      })()}
                    </div>
                  </div>

                  {/* Service Address */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Service Address</label>
                    <div className="mt-1">
                      {callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.service_address?.value || 'N/A'}
                    </div>
                  </div>

                  {/* Appointment Scheduled */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Appointment Scheduled</label>
                    <div className="mt-1">
                      {(() => {
                        const appointmentTime = callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.appointment_time?.value;
                        return appointmentTime ? 'Yes' : 'No';
                      })()}
                    </div>
                  </div>

                  {/* Appointment Date/Time */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Appointment Date/Time</label>
                    <div className="mt-1">
                      {(() => {
                        const appointmentTime = callDetail.metadata?.raw_webhook_data?.data?.analysis?.data_collection_results?.appointment_time?.value;
                        if (appointmentTime) {
                          try {
                            const appointmentDate = new Date(appointmentTime);
                            return format(appointmentDate, 'EEEE, MMMM d, yyyy at h:mm a');
                          } catch (error) {
                            return appointmentTime;
                          }
                        }
                        return callDetail.best_time_to_call || 'Not scheduled';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call Summary/Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                {isMessage ? 'Message Summary' : 'Call Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <p className="text-sm leading-relaxed">{callDetail.message}</p>
              </div>
            </CardContent>
          </Card>

          {/* Transcript */}
          {callDetail.transcript && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Full Transcript
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{callDetail.transcript}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {(callDetail.recording_url || callDetail.transcript) && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {callDetail.recording_url && (
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Play Recording</span>
                    </Button>
                  )}
                  {callDetail.transcript && (
                    <Button variant="outline" className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Download Transcript</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Technical Details */}
          {callDetail.metadata && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(callDetail.metadata, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default CallDetails;