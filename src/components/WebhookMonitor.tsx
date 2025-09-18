import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Webhook, Activity, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid, parseISO } from 'date-fns';

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
              !line.includes('available_times') &&
              !line.includes('service_names :') &&
              !line.includes('service_prices :') &&
              !line.includes('business_id :')
            )
            .map(line => {
              // Format speaker lines with clean labels
              if (line.includes('Assistant:')) {
                return `AI assistant: ${line.replace('Assistant:', '').trim()}`;
              } else if (line.includes('Caller:')) {
                return `Caller: ${line.replace('Caller:', '').trim()}`;
              }
              return line;
            })
            .join('\n\n') // Add spacing between exchanges
            .replace(/\n{3,}/g, '\n\n') // Remove excess line breaks
          : 'No transcript available';

        // Create a structured call summary
        const createCallSummary = (log: any, metadata: any) => {
          const callerName = log.caller_name || 'N/A';
          const phoneNumber = log.phone_number || 'N/A';
          const address = metadata.caller_address || 'N/A';
          const appointmentScheduled = metadata.appointment_scheduled;
          const serviceRequested = metadata.service_requested || log.business_type || 'general inquiry';
          const displayService = serviceRequested === 'N/A' ? 'general inquiry' : serviceRequested;
          const appointmentDetails = metadata.appointment_details;
          
          // Format appointment date/time if available
          const formatAppointmentDateTime = (appointmentDetails: string) => {
            if (!appointmentDetails || appointmentDetails === 'Not scheduled') return 'N/A';
            
            console.log('Raw appointment details:', appointmentDetails); // Debug log
            
            // First try to parse as ISO 8601 format (which is what we're getting)
            try {
              const isoDate = parseISO(appointmentDetails);
              if (isValid(isoDate)) {
                const formatted = format(isoDate, 'EEEE, MMMM do, yyyy \'at\' h:mma');
                console.log('Formatted ISO date:', formatted); // Debug log
                return formatted;
              }
            } catch (error) {
              console.warn('Error parsing ISO date:', error);
            }
            
            // Try to parse various other date/time formats that might be in the appointment details
            const dateTimePatterns = [
              /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/,  // 2025-11-05 09:30
              /(\d{4}-\d{2}-\d{2})\s+at\s+(\d{1,2}:\d{2})/i,  // 2025-11-05 at 09:30
              /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})/,  // 11/5/2025 9:30
              /(\d{1,2}\/\d{1,2}\/\d{4})\s+at\s+(\d{1,2}:\d{2})/i,  // 11/5/2025 at 9:30
              /(\w+,?\s+\w+\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2})/i,  // Tuesday, November 5, 2025 at 9:30
              /(\w+\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2})/i,  // November 5, 2025 at 9:30
              /(\d{1,2}:\d{2})\s+on\s+(\d{4}-\d{2}-\d{2})/i,  // 9:30 on 2025-11-05
              /(\d{1,2}:\d{2})\s+on\s+(\w+,?\s+\w+\s+\d{1,2},?\s+\d{4})/i  // 9:30 on Tuesday, November 5, 2025
            ];
            
            for (const pattern of dateTimePatterns) {
              const match = appointmentDetails.match(pattern);
              if (match) {
                try {
                  let dateStr = match[1];
                  let timeStr = match[2];
                  
                  // Handle reversed patterns (time first, then date)
                  if (pattern.source.includes('on')) {
                    [timeStr, dateStr] = [match[1], match[2]];
                  }
                  
                  console.log('Matched date:', dateStr, 'time:', timeStr); // Debug log
                  
                  // Parse the date
                  let parsedDate;
                  if (dateStr.includes('-')) {
                    parsedDate = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd H:mm', new Date());
                  } else if (dateStr.includes('/')) {
                    parsedDate = parse(`${dateStr} ${timeStr}`, 'M/d/yyyy H:mm', new Date());
                  } else {
                    // Try parsing as a more natural format
                    parsedDate = new Date(`${dateStr} ${timeStr}`);
                  }
                  
                  console.log('Parsed date:', parsedDate); // Debug log
                  
                  if (isValid(parsedDate)) {
                    const formatted = format(parsedDate, 'EEEE, MMMM do, yyyy \'at\' h:mma');
                    console.log('Formatted date:', formatted); // Debug log
                    return formatted;
                  }
                } catch (error) {
                  console.warn('Error parsing appointment date:', error);
                }
              }
            }
            
            // If no pattern matches, return the original string
            console.log('No pattern matched, returning original:', appointmentDetails);
            return appointmentDetails;
          };
          
          const formattedAppointmentDateTime = appointmentScheduled ? 
            formatAppointmentDateTime(appointmentDetails) : 'N/A';
          
          // Create introductory sentence
          const appointmentStatus = appointmentScheduled ? 'and scheduled an appointment' : 'but did not schedule an appointment';
          const introSentence = `${callerName} called asking about ${displayService} ${appointmentStatus}.`;
          
          return `${introSentence}

Name: ${callerName}
Address: ${address}
Phone Number: ${phoneNumber}
Service: ${displayService}
Appointment scheduled?: ${appointmentScheduled ? 'Yes' : 'No'}
Appointment Date/Time: ${formattedAppointmentDateTime}`;
        };
        
        const cleanSummary = createCallSummary(log, metadata);
        
        // Format appointment datetime for display in the top section
        const formatDisplayDateTime = (appointmentDetails: string) => {
          if (!appointmentDetails || appointmentDetails === 'Not scheduled') return 'Not scheduled';
          
          try {
            const isoDate = parseISO(appointmentDetails);
            if (isValid(isoDate)) {
              return format(isoDate, 'EEEE, MMMM do, yyyy \'at\' h:mma');
            }
          } catch (error) {
            console.warn('Error parsing ISO date for display:', error);
          }
          
          return appointmentDetails;
        };
        
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
          appointment_datetime: formatDisplayDateTime(appointmentDetails),
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
    // First confirmation
    if (!confirm('⚠️ WARNING: This will permanently delete ALL webhook data from the database. Are you absolutely sure?')) {
      return;
    }

    // Second confirmation
    if (!confirm('💣 FINAL WARNING: This action cannot be undone! All call logs, transcripts, and customer data will be lost forever. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete all rows from call_logs table
      const { error } = await supabase
        .from('call_logs')
        .delete()
        .gte('created_at', '1900-01-01'); // This will match all rows since all dates are after 1900

      if (error) throw error;

      setWebhookData([]);
      toast({
        title: "💥 Complete Destruction",
        description: "All webhook data has been permanently deleted from the database"
      });
    } catch (error) {
      console.error('Error clearing webhook data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete webhook data"
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
              <Trash2 className="h-4 w-4 mr-1" />
              💣 DELETE ALL
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[1200px] overflow-y-auto">
          {webhookData.map((data) => (
            <div key={data.id} className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Call Time: {data.call_datetime}</Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-3">
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
                    <h4 className="text-sm font-medium text-muted-foreground">Phone Number</h4>
                    <p className="text-sm">{data.phone_number}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
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
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Call Summary</h4>
                  <div className="text-sm bg-background p-4 rounded border leading-relaxed whitespace-pre-wrap">
                    {data.call_summary}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Full Transcript</h4>
                  <div className="text-sm bg-background p-4 rounded border max-h-80 overflow-y-auto leading-relaxed whitespace-pre-wrap font-mono">
                    {data.transcript}
                  </div>
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