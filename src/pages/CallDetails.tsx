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
  business_id?: string;
  appointment_scheduled?: boolean;
  appointment_date_time?: string;
  service_address?: string;
  call_summary?: string;
  metadata?: any;
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

      // Try to find in call_logs first (most comprehensive call data)
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

  const formatAppointmentTime = (timeStr: string) => {
    if (!timeStr) return 'Not scheduled';
    
    // Parse text like "Friday, September twenty-sixth, at ten in the morning"
    const cleanText = timeStr.toLowerCase();
    
    // Extract day of week
    const dayMatch = cleanText.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
    const day = dayMatch ? dayMatch[1] : '';
    
    // Extract month and date
    const monthNames = {
      'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr',
      'may': 'May', 'june': 'Jun', 'july': 'Jul', 'august': 'Aug',
      'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec'
    };
    
    const numbers = {
      'first': '1st', 'second': '2nd', 'third': '3rd', 'fourth': '4th', 'fifth': '5th',
      'sixth': '6th', 'seventh': '7th', 'eighth': '8th', 'ninth': '9th', 'tenth': '10th',
      'eleventh': '11th', 'twelfth': '12th', 'thirteenth': '13th', 'fourteenth': '14th',
      'fifteenth': '15th', 'sixteenth': '16th', 'seventeenth': '17th', 'eighteenth': '18th',
      'nineteenth': '19th', 'twentieth': '20th', 'twenty-first': '21st', 'twenty-second': '22nd',
      'twenty-third': '23rd', 'twenty-fourth': '24th', 'twenty-fifth': '25th', 'twenty-sixth': '26th',
      'twenty-seventh': '27th', 'twenty-eighth': '28th', 'twenty-ninth': '29th', 'thirtieth': '30th',
      'thirty-first': '31st'
    };
    
    let month = '';
    let date = '';
    
    for (const [fullMonth, shortMonth] of Object.entries(monthNames)) {
      if (cleanText.includes(fullMonth)) {
        month = shortMonth;
        break;
      }
    }
    
    for (const [textNum, ordinal] of Object.entries(numbers)) {
      if (cleanText.includes(textNum)) {
        date = ordinal;
        break;
      }
    }
    
    // Extract time
    let time = '';
    if (cleanText.includes('ten in the morning') || cleanText.includes('10 in the morning')) {
      time = '10am';
    } else if (cleanText.includes('eleven in the morning') || cleanText.includes('11 in the morning')) {
      time = '11am';
    } else if (cleanText.includes('twelve in the afternoon') || cleanText.includes('noon')) {
      time = '12pm';
    } else if (cleanText.includes('one in the afternoon') || cleanText.includes('1 in the afternoon')) {
      time = '1pm';
    } else if (cleanText.includes('two in the afternoon') || cleanText.includes('2 in the afternoon')) {
      time = '2pm';
    } else if (cleanText.includes('three in the afternoon') || cleanText.includes('3 in the afternoon')) {
      time = '3pm';
    } else if (cleanText.includes('four in the afternoon') || cleanText.includes('4 in the afternoon')) {
      time = '4pm';
    } else if (cleanText.includes('five in the afternoon') || cleanText.includes('5 in the afternoon')) {
      time = '5pm';
    } else {
      // Try to extract numeric time
      const timeMatch = cleanText.match(/(\d{1,2})\s*(?::|am|pm)/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        if (cleanText.includes('morning') || cleanText.includes('am')) {
          time = `${hour}am`;
        } else if (cleanText.includes('afternoon') || cleanText.includes('evening') || cleanText.includes('pm')) {
          time = `${hour}pm`;
        }
      }
    }
    
    // Capitalize day
    const capitalizedDay = day.charAt(0).toUpperCase() + day.slice(1);
    
    // Build formatted string
    if (capitalizedDay && month && date && time) {
      return `${capitalizedDay}, ${month} ${date} at ${time}`;
    }
    
    // Fallback to original if parsing fails
    return timeStr;
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
    switch (callType) {
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
              <h1 className="text-2xl font-bold">
                {callData.phone_number || 'Unknown'} - {getCallReason(callData)}
              </h1>
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
      </header>

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
                    <p className="mt-1">{callData.caller_name || 'Unknown Caller'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Phone Number</span>
                    <p className="mt-1">{callData.phone_number || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Email Address</span>
                    <p className="mt-1">{callData.email || 'N/A'}</p>
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
                    <span className="text-sm font-medium text-muted-foreground">Appointment Scheduled</span>
                    <p className="mt-1">{callData.appointment_scheduled ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Appointment Date/Time</span>
                    <p className="mt-1">
                      {(() => {
                        // Try to get appointment time from metadata first (for test data)
                        const appointmentTime = callData.metadata?.analysis?.data_collection_results?.appointment_time?.value;
                        if (appointmentTime) {
                          return formatAppointmentTime(appointmentTime);
                        }
                        // Fallback to appointment_date_time if available
                        if (callData.appointment_date_time) {
                          return format(new Date(callData.appointment_date_time), 'PPp');
                        }
                        return 'Not scheduled';
                      })()}
                    </p>
                  </div>
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
                  <p className="whitespace-pre-wrap text-sm">{callData.transcript}</p>
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