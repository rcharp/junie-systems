import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Clock, User, Calendar, Mail, Play, Download, MessageSquare } from "lucide-react";
import { format } from "date-fns";

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
}

const CallDetails = () => {
  const { callId } = useParams<{ callId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [callData, setCallData] = useState<CallData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (callId && user) {
      fetchCallDetails();
    }
  }, [callId, user]);

  const fetchCallDetails = async () => {
    try {
      setLoading(true);

      // First get user's business_id
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!businessData) {
        toast({
          title: "Error",
          description: "Business settings not found",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      // Check if callId exists in business_data_requests
      const { data: businessRequestData, error: businessRequestError } = await supabase
        .from('business_data_requests')
        .select('*')
        .eq('id', callId)
        .eq('business_id', businessData.id)
        .maybeSingle();

      if (businessRequestData && businessRequestData.response_data) {
        // Transform business_data_requests data to CallData format
        const responseData = businessRequestData.response_data as any;
        const transformedData: CallData = {
          id: businessRequestData.id,
          call_id: responseData.call_id || businessRequestData.id,
          caller_name: responseData.caller_name || responseData.name || 'Unknown',
          phone_number: responseData.phone_number || responseData.phone || 'N/A',
          email: responseData.email,
          message: responseData.message || responseData.summary || 'No message available',
          urgency_level: responseData.urgency_level || responseData.urgency || 'medium',
          best_time_to_call: responseData.best_time_to_call || responseData.preferred_time,
          call_type: responseData.call_type || responseData.type || 'general',
          status: responseData.status || 'completed',
          call_duration: responseData.call_duration || responseData.duration,
          recording_url: responseData.recording_url,
          transcript: responseData.transcript || responseData.full_transcript,
          created_at: businessRequestData.created_at,
          call_status: responseData.call_status || 'completed',
          business_name: responseData.business_name,
          business_type: responseData.business_type,
          provider: responseData.provider || 'Availabee AI'
        };
        setCallData(transformedData);
        return;
      }

      // Try to find in call_logs as fallback
      const { data: logData, error: logError } = await supabase
        .from('call_logs')
        .select('*')
        .eq('id', callId)
        .eq('user_id', user?.id)
        .maybeSingle();

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

      // If not found in any table, show error
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
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Call Details</h1>
              <p className="text-muted-foreground">
                Call from {callData.caller_name} on {format(new Date(callData.created_at), 'MMM d, yyyy at h:mm a')}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={getUrgencyColor(callData.urgency_level)}>
                {callData.urgency_level}
              </Badge>
              <Badge className={getCallTypeColor(callData.call_type)}>
                {callData.call_type}
              </Badge>
              {callData.status && (
                <Badge variant={callData.status === 'new' ? 'default' : 'secondary'}>
                  {callData.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Caller Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                    <p className="text-lg font-semibold">{callData.caller_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <p className="text-lg">{callData.phone_number}</p>
                    </div>
                  </div>
                  {callData.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <p className="text-lg">{callData.email}</p>
                      </div>
                    </div>
                  )}
                  {callData.best_time_to_call && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Best Time to Call</label>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <p className="text-lg">{callData.best_time_to_call}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Call Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{callData.message}</p>
                </div>
              </CardContent>
            </Card>

            {callData.transcript && (
              <Card>
                <CardHeader>
                  <CardTitle>Full Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{callData.transcript}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Call Metadata */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Call Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Call ID</label>
                  <p className="text-sm font-mono">{callData.call_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                  <p className="text-sm">{format(new Date(callData.created_at), 'PPpp')}</p>
                </div>
                {callData.call_duration && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duration</label>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm">{Math.floor(callData.call_duration / 60)}m {callData.call_duration % 60}s</p>
                    </div>
                  </div>
                )}
                {callData.call_status && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-sm">{callData.call_status}</p>
                  </div>
                )}
                {callData.business_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Business</label>
                    <p className="text-sm">{callData.business_name}</p>
                  </div>
                )}
                {callData.provider && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Provider</label>
                    <p className="text-sm">{callData.provider}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {(callData.recording_url || callData.transcript) && (
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {callData.recording_url && (
                    <Button variant="outline" className="w-full justify-start">
                      <Play className="w-4 h-4 mr-2" />
                      Play Recording
                    </Button>
                  )}
                  {callData.transcript && (
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Download Transcript
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CallDetails;