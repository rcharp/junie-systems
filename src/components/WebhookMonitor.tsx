import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Webhook, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WebhookData {
  id: string;
  call_id: string;
  status: string;
  transcript: string;
  duration: number;
  recording_url: string;
  metadata: any;
  received_at: string;
}

export const WebhookMonitor = () => {
  const { toast } = useToast();
  const [webhookData, setWebhookData] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchWebhookData = async () => {
    try {
      // Fetch recent call logs to show incoming webhook data (show all for admin)
      const { data: logs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      // Transform call logs to webhook data format
      const transformedData: WebhookData[] = (logs || []).map(log => ({
        id: log.id,
        call_id: log.call_id || 'N/A',
        status: log.call_status || 'unknown',
        transcript: log.transcript || '',
        duration: log.call_duration || 0,
        recording_url: log.recording_url || '',
        metadata: log.metadata || {},
        received_at: log.created_at
      }));

      setWebhookData(transformedData);
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

    // Set up auto-refresh every 10 seconds if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchWebhookData, 10000);
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

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Incoming Webhook Data
            </CardTitle>
            <CardDescription>
              Real-time display of POST data received from Bland AI webhook
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
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {webhookData.map((data) => (
            <div key={data.id} className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(data.status)}>
                    {data.status}
                  </Badge>
                  <Badge variant="outline">
                    Call ID: {data.call_id}
                  </Badge>
                  {data.duration > 0 && (
                    <Badge variant="secondary">
                      {formatDuration(data.duration)}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(data.received_at).toLocaleString()}
                </span>
              </div>
              
              <div className="space-y-2">
                {data.transcript && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Transcript:</h4>
                    <p className="text-sm bg-background p-2 rounded border">
                      {data.transcript.substring(0, 200)}
                      {data.transcript.length > 200 && '...'}
                    </p>
                  </div>
                )}
                
                {data.recording_url && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Recording:</h4>
                    <a 
                      href={data.recording_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {data.recording_url}
                    </a>
                  </div>
                )}
                
                {data.metadata && Object.keys(data.metadata).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Metadata:</h4>
                    <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                      {JSON.stringify(data.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {webhookData.length === 0 && !loading && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No webhook data yet</h3>
              <p className="text-muted-foreground mb-4">
                Waiting for POST requests to the webhook endpoint...
              </p>
              <p className="text-xs text-muted-foreground">
                Data will appear here when calls are processed through your Bland AI pathway
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};