import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Webhook, Phone, MessageSquare, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CallLog {
  id: string;
  call_id: string;
  user_id: string;
  caller_name: string;
  phone_number: string;
  call_status: string;
  call_duration: number;
  transcript: string;
  created_at: string;
  metadata: any;
}

interface CallMessage {
  id: string;
  call_id: string;
  caller_name: string;
  phone_number: string;
  email: string;
  message: string;
  urgency_level: string;
  call_type: string;
  status: string;
  created_at: string;
}

export const WebhookMonitor = () => {
  const { toast } = useToast();
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchWebhookData = async () => {
    try {
      // Fetch recent call logs
      const { data: logs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;

      // Fetch recent call messages
      const { data: messages, error: messagesError } = await supabase
        .from('call_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (messagesError) throw messagesError;

      setCallLogs(logs || []);
      setCallMessages(messages || []);
    } catch (error) {
      console.error('Error fetching webhook data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch webhook data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchWebhookData();
  };

  useEffect(() => {
    fetchWebhookData();

    // Set up auto-refresh every 30 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchWebhookData, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getUrgencyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhook Monitor
              </CardTitle>
              <CardDescription>
                Real-time monitoring of incoming webhook data from Bland AI
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Call Logs */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Recent Call Logs
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {callLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(log.call_status)}>
                          {log.call_status}
                        </Badge>
                        {log.call_duration > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(log.call_duration)}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{log.caller_name}</p>
                      <p className="text-sm text-muted-foreground">{log.phone_number}</p>
                      {log.call_id && (
                        <p className="text-xs text-muted-foreground">Call ID: {log.call_id}</p>
                      )}
                      {log.transcript && (
                        <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {log.transcript.substring(0, 100)}
                          {log.transcript.length > 100 && '...'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {callLogs.length === 0 && !loading && (
                  <p className="text-center text-muted-foreground py-8">
                    No call logs found
                  </p>
                )}
              </div>
            </div>

            {/* Recent Messages */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Recent Messages
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {callMessages.map((message) => (
                  <div key={message.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getUrgencyColor(message.urgency_level)}>
                          {message.urgency_level}
                        </Badge>
                        <Badge variant="outline">
                          {message.call_type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{message.caller_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {message.phone_number}
                        {message.email && ` • ${message.email}`}
                      </p>
                      <p className="text-sm mt-2 p-2 bg-muted rounded">
                        {message.message.substring(0, 150)}
                        {message.message.length > 150 && '...'}
                      </p>
                    </div>
                  </div>
                ))}
                {callMessages.length === 0 && !loading && (
                  <p className="text-center text-muted-foreground py-8">
                    No messages found
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};