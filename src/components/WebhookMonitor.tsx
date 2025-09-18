import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Webhook, Activity, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WebhookData {
  id: string;
  business_id: string;
  company_name: string;
  call_summary: string;
  transcript: string;
  caller_name: string;
  phone_number: string;
  address: string;
  email: string;
  service_info: string;
  appointment_datetime: string;
  call_datetime: string;
  first_name: string;
  last_name: string;
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
      const transformedData: WebhookData[] = (logs || []).map(log => {
        // Get business_id from metadata
        const metadata = log.metadata || {};
        const businessId = (metadata as any)?.business_id || log.user_id || 'N/A';
        
        // Extract caller address from metadata
        const callerAddress = (metadata as any)?.caller_address || 'N/A';
        const appointmentDetails = (metadata as any)?.appointment_details || 'Not scheduled';
        const serviceRequested = (metadata as any)?.service_requested || log.business_type || 'N/A';
        
        // Clean up the transcript for display
        const cleanTranscript = log.transcript ? 
          log.transcript
            .split('\n')
            .filter(line => 
              line.trim() && 
              !line.includes('business_name') && 
              !line.includes('services :') &&
              !line.includes('business_address') &&
              !line.includes('business_hours') &&
              !line.includes('available_times')
            )
            .map(line => {
              // Format speaker lines
              if (line.includes('Assistant:')) {
                return `**Assistant:** ${line.replace('Assistant:', '').trim()}`;
              } else if (line.includes('Caller:')) {
                return `**Caller:** ${line.replace('Caller:', '').trim()}`;
              }
              return line;
            })
            .join('\n')
            .replace(/\n{3,}/g, '\n\n') // Remove excess line breaks
          : 'No transcript available';

        // Create a cleaner call summary
        const cleanSummary = log.message || 'Customer inquiry';
        
        // Parse name parts
        const nameParts = (log.caller_name || '').split(' ');
        const firstName = nameParts[0] || 'N/A';
        const lastName = nameParts.slice(1).join(' ') || 'N/A';
        
        return {
          id: log.id,
          business_id: businessId,
          company_name: log.business_name || 'N/A',
          call_summary: cleanSummary,
          transcript: cleanTranscript,
          caller_name: log.caller_name || 'N/A',
          phone_number: log.phone_number || 'N/A',
          address: callerAddress,
          email: log.email || 'N/A',
          service_info: serviceRequested,
          appointment_datetime: appointmentDetails,
          call_datetime: new Date(log.created_at).toLocaleString(),
          first_name: firstName,
          last_name: lastName
        };
      });

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

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear all webhook data? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('call_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (error) throw error;

      setWebhookData([]);
      toast({
        title: "Success",
        description: "All webhook data has been cleared"
      });
    } catch (error) {
      console.error('Error clearing webhook data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to clear webhook data"
      });
    } finally {
      setLoading(false);
    }
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
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4" />
              Clear All
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
                  <Badge variant="outline">Call Time: {data.call_datetime}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Business ID</h4>
                    <p className="text-sm">{data.business_id}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Company Name</h4>
                    <p className="text-sm">{data.company_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Caller Name</h4>
                    <p className="text-sm">{data.caller_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">First Name</h4>
                    <p className="text-sm">{data.first_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Last Name</h4>
                    <p className="text-sm">{data.last_name}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Phone Number</h4>
                    <p className="text-sm">{data.phone_number}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Email Address</h4>
                    <p className="text-sm">{data.email}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Address</h4>
                    <p className="text-sm">{data.address}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Service Information</h4>
                    <p className="text-sm">{data.service_info}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Appointment Date/Time</h4>
                    <p className="text-sm">{data.appointment_datetime}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Call Summary</h4>
                  <p className="text-sm bg-background p-2 rounded border">{data.call_summary}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Full Transcript</h4>
                  <p className="text-sm bg-background p-2 rounded border max-h-32 overflow-y-auto">{data.transcript}</p>
                </div>
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