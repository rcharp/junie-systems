import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Clock, User, Calendar, Play, Download, MessageSquare, CheckCircle } from "lucide-react";
import { format } from "date-fns";

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
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'messages'>('logs');

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

      // Fetch call messages with user_id
      const { data: directMessages, error: messagesError } = await supabase
        .from('call_messages')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (messagesError) throw messagesError;
      messages = directMessages || [];

      setCallLogs(logs);
      setCallMessages(messages);
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

  const markMessageAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('call_messages')
        .update({ status: 'read' })
        .eq('id', messageId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setCallMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      );

      toast({
        title: "Message marked as read",
        description: "The message has been marked as read",
      });
    } catch (error: any) {
      console.error('Error updating message:', error);
      toast({
        title: "Error",
        description: "Failed to update message status",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <Button
          variant={activeTab === 'logs' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('logs')}
          className="flex-1"
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Logs ({callLogs.length})
        </Button>
        <Button
          variant={activeTab === 'messages' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('messages')}
          className="flex-1"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Messages ({callMessages.filter(m => m.status === 'new').length} new)
        </Button>
      </div>

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-4">
          {callMessages.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No messages yet</h3>
                <p className="text-muted-foreground">
                  When someone calls your AI assistant, their messages will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            callMessages.map((message) => (
              <Card 
                key={message.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${message.status === 'new' ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => navigate(`/call/${message.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground">{message.caller_name}</span>
                      </div>
                      <Badge className={getUrgencyColor(message.urgency_level)}>
                        {message.urgency_level}
                      </Badge>
                      <Badge className={getCallTypeColor(message.call_type)}>
                        {message.call_type}
                      </Badge>
                      {message.status === 'new' && (
                        <Badge variant="secondary">New</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(message.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{message.phone_number}</span>
                    </div>
                    {message.email && (
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">Email:</span>
                        <span>{message.email}</span>
                      </div>
                    )}
                    {message.best_time_to_call && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Best time: {message.best_time_to_call}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Summary:</label>
                    <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                      {message.message}
                    </p>
                  </div>

                  {message.status === 'new' && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => markMessageAsRead(message.id)}
                        className="flex items-center space-x-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark as Read</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Call Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {callLogs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Phone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground">No call logs yet</h3>
                <p className="text-muted-foreground">
                  Your AI assistant's call history will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            callLogs.map((call) => (
              <Card 
                key={call.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/call/${call.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-muted-foreground">{call.caller_name}</span>
                      </div>
                      <Badge variant={call.call_status === 'completed' ? 'default' : 'secondary'}>
                        {call.call_status}
                      </Badge>
                      <Badge className={getUrgencyColor(call.urgency_level)}>
                        {call.urgency_level}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(call.created_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{call.phone_number}</span>
                    </div>
                    {call.call_duration && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{Math.floor(call.call_duration / 60)}m {call.call_duration % 60}s</span>
                      </div>
                    )}
                    <Badge className={getCallTypeColor(call.call_type)}>
                      {call.call_type}
                    </Badge>
                  </div>
                  
                  {call.message && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Summary:</label>
                      <p className="mt-1 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        {call.message}
                      </p>
                    </div>
                  )}

                  {/* Additional call details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {call.email && (
                      <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground font-medium">Email:</span>
                        <span>{call.email}</span>
                      </div>
                    )}
                    {call.best_time_to_call && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground font-medium">Best time:</span>
                        <span>{call.best_time_to_call}</span>
                      </div>
                    )}
                  </div>

                  {(call.recording_url || call.transcript) && (
                    <div className="flex space-x-2">
                      {call.recording_url && (
                        <Button size="sm" variant="outline" className="flex items-center space-x-2">
                          <Play className="w-4 h-4" />
                          <span>Play Recording</span>
                        </Button>
                      )}
                      {call.transcript && (
                        <Button size="sm" variant="outline" className="flex items-center space-x-2">
                          <Download className="w-4 h-4" />
                          <span>View Transcript</span>
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CallList;