import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Clock, User, Calendar, Play, Download, MessageSquare, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cleanCallerName } from "@/lib/caller-utils";

interface CallLog {
  id: string;
  call_id?: string;
  caller_name: string;
  phone_number: string;
  call_status: string;
  call_type: string;
  urgency_level: string;
  message: string;
  email?: string;
  call_duration?: number;
  recording_url?: string;
  transcript?: string;
  created_at: string;
  updated_at: string;
  best_time_to_call?: string;
}

interface CallMessage {
  id: string;
  call_id?: string;
  caller_name: string;
  phone_number: string;
  email?: string;
  message: string;
  urgency_level: string;
  best_time_to_call?: string;
  call_type: string;
  status: string;
  created_at: string;
}

const CallList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [callLogsPage, setCallLogsPage] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    if (user) {
      fetchCallData();
    }
  }, [user]);

  const fetchCallData = async () => {
    try {
      setLoading(true);
      
      // Get user's business_id first to find associated data
      const { data: businessData, error: businessError } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (businessError) throw businessError;

      let logs: CallLog[] = [];
      let messages: CallMessage[] = [];

      // If user has business settings, fetch call_logs using business_id
      if (businessData) {
        const { data: callLogs, error: logsError } = await supabase
          .from('call_logs')
          .select('*')
          .or(`user_id.eq.${user?.id},business_id.eq.${businessData.id}`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (logsError) throw logsError;
        logs = callLogs || [];
      }

      setCallLogs(logs);
    } catch (error: any) {
      console.error('Error fetching call data:', error);
      toast({
        title: "Error",
        description: "Failed to load call data",
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

  const totalCallPages = Math.ceil(callLogs.length / itemsPerPage);
  const paginatedCallLogs = callLogs.slice(
    callLogsPage * itemsPerPage,
    (callLogsPage + 1) * itemsPerPage
  );

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Call Logs ({callLogs.length})
          </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {callLogs.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No call logs yet</h3>
            <p className="text-muted-foreground">
              Your AI assistant&apos;s call history will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-2 px-2">
              Showing {callLogsPage * itemsPerPage + 1}-{Math.min((callLogsPage + 1) * itemsPerPage, callLogs.length)} of {callLogs.length}
            </div>
            <div className="divide-y divide-border flex-1 overflow-auto max-h-[500px]">
              {paginatedCallLogs.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/call/${call.id}`)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs whitespace-nowrap border ${getCallTypeColor(call.call_type)}`}>
                        {call.call_type}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {call.message || 'No summary available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {call.phone_number}
                    </span>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(call.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {totalCallPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCallLogsPage(Math.max(0, callLogsPage - 1))}
                  disabled={callLogsPage === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {callLogsPage + 1} of {totalCallPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCallLogsPage(Math.min(totalCallPages - 1, callLogsPage + 1))}
                  disabled={callLogsPage === totalCallPages - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CallList;