import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Webhook, Activity, Trash2, ChevronDown, ChevronRight, Code } from 'lucide-react';
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
  raw_webhook_data: any;
}

export const WebhookMonitor = () => {
  const { toast } = useToast();
  const [webhookData, setWebhookData] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedRawData, setExpandedRawData] = useState<Record<string, boolean>>({});

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
        
        // Extract raw webhook data for detailed customer info
        const rawWebhookData = (metadata as any)?.raw_webhook_data;
        
        // Extract customer information from the new nested data structure
        let customerName = log.caller_name || 'N/A';
        let customerPhone = log.phone_number || 'N/A';
        let customerEmail = log.email || 'N/A';
        let serviceAddress = 'N/A';
        let appointmentDetails = 'Not scheduled';
        let serviceRequested = log.message || 'N/A';
        let appointmentScheduled = 'No';

        // Extract data from the new nested structure: data.analysis.data_collection_results
        if (rawWebhookData && rawWebhookData.data && rawWebhookData.data.analysis) {
          const analysis = rawWebhookData.data.analysis;
          
          // Use transcript_summary for the call summary
          if (analysis.transcript_summary) {
            serviceRequested = analysis.transcript_summary;
          }
          
          // Extract from data_collection_results if available
          if (analysis.data_collection_results) {
            const results = analysis.data_collection_results;
            
            // Extract customer name and capitalize it
            if (results.customer_name && results.customer_name.value) {
              customerName = results.customer_name.value.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            }
            
            // Extract phone number
            if (results.phone_number && results.phone_number.value) {
              customerPhone = String(results.phone_number.value);
            }
            
            // Extract email
            if (results.email && results.email.value) {
              customerEmail = results.email.value;
            }
            
            // Extract service address
            if (results.service_address && results.service_address.value) {
              serviceAddress = results.service_address.value;
            }
            
            // Extract service type (simplified - just the service name)
            if (results.service_type && results.service_type.value) {
              serviceRequested = results.service_type.value.toLowerCase();
            }
            
            // Extract appointment time and format it
            if (results.appointment_time && results.appointment_time.value) {
              appointmentDetails = results.appointment_time.value;
            }
            
            // Extract appointment scheduled status
            if (results.appointment_scheduled && results.appointment_scheduled.value) {
              appointmentScheduled = results.appointment_scheduled.value.toString().toLowerCase() === 'true' || 
                                   results.appointment_scheduled.value.toString().toLowerCase() === 'yes' ? 'Yes' : 'No';
            }
          }
        }

        // Fallback to old variable structure if new structure is not available
        if (rawWebhookData && rawWebhookData.variables && (!rawWebhookData.data || !rawWebhookData.data.analysis)) {
          const vars = rawWebhookData.variables;
          
          // Extract name (prefer full name, fallback to first/last) and capitalize
          if (vars.name) {
            customerName = vars.name.split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
          } else if (vars.first_name || vars.last_name) {
            const firstName = vars.first_name ? 
              vars.first_name.charAt(0).toUpperCase() + vars.first_name.slice(1).toLowerCase() : '';
            const lastName = vars.last_name ? 
              vars.last_name.charAt(0).toUpperCase() + vars.last_name.slice(1).toLowerCase() : '';
            customerName = `${firstName} ${lastName}`.trim();
          }
          
          // Extract contact info
          if (vars.phone_number) customerPhone = String(vars.phone_number);
          if (vars.email) customerEmail = vars.email;
          if (vars.address) serviceAddress = vars.address;
          
          // Extract appointment info
          if (vars.appointment_details) {
            appointmentDetails = vars.appointment_details;
          }
          
          // Extract service notes/requirements
          if (vars.service_requested) {
            serviceRequested = vars.service_requested;
          } else if (vars.notes) {
            serviceRequested = vars.notes;
          }
        }
        
        // Format transcript for display
        const formatTranscript = (rawData: any) => {
          // Get transcript from data.transcript
          if (rawData?.data?.transcript) {
            return formatTranscriptText(rawData.data.transcript);
          }
          
          // Fallback to log transcript
          if (log.transcript) {
            return formatTranscriptText(log.transcript);
          }
          
          return "No transcript available";
        };

        const formatTranscriptText = (transcript: string) => {
          if (!transcript) return "No transcript available";
          
          // Split by speaker changes and format properly
          const lines = transcript.split('\n').filter(line => line.trim());
          return lines.map(line => {
            const trimmedLine = line.trim();
            
            // Skip lines with metadata or business info
            if (trimmedLine.includes('business_name') || 
                trimmedLine.includes('services :') ||
                trimmedLine.includes('business_address') ||
                trimmedLine.includes('business_hours') ||
                trimmedLine.includes('available_times') ||
                trimmedLine.includes('service_names :') ||
                trimmedLine.includes('service_prices :') ||
                trimmedLine.includes('business_id :')) {
              return '';
            }
            
            // If line already has proper speaker format (Agent:, Caller:, etc.), return as-is
            if (trimmedLine.match(/^(Agent|Caller|Customer|User):/i)) {
              return trimmedLine;
            }
            
            // If line has speaker indicator, format it properly
            if (trimmedLine.includes(':')) {
              const [speaker, ...messageParts] = trimmedLine.split(':');
              const message = messageParts.join(':').trim();
              
              // Normalize speaker names
              const normalizedSpeaker = speaker.trim().toLowerCase();
              if (normalizedSpeaker.includes('agent') || normalizedSpeaker.includes('assistant') || normalizedSpeaker.includes('ai')) {
                return `Agent: ${message}`;
              } else if (normalizedSpeaker.includes('caller') || normalizedSpeaker.includes('customer') || normalizedSpeaker.includes('user')) {
                return `Caller: ${message}`;
              } else {
                // Use the speaker name if it appears to be a name (capitalize first letter)
                const capitalizedSpeaker = speaker.charAt(0).toUpperCase() + speaker.slice(1).toLowerCase();
                return `${capitalizedSpeaker}: ${message}`;
              }
            }
            
            // If no speaker indicator, skip empty lines or add generic label for content
            if (!trimmedLine) return '';
            return `Speaker: ${trimmedLine}`;
          }).filter(line => line.trim()).join('\n\n');
        };

        const cleanTranscript = formatTranscript(rawWebhookData);

        // Create a structured call summary
        const createCallSummary = () => {
          const displayService = serviceRequested === 'N/A' ? 'general inquiry' : serviceRequested;
          const isAppointmentScheduled = appointmentScheduled === 'Yes';
          
          // Format appointment date/time if available
          const formatAppointmentDateTime = (appointmentDetails: string) => {
            if (!appointmentDetails || appointmentDetails === 'Not scheduled') return 'N/A';
            
            console.log('Raw appointment details:', appointmentDetails); // Debug log
            
            // First try to parse as ISO 8601 format (which is what we're getting)
            try {
              const isoDate = parseISO(appointmentDetails);
              if (isValid(isoDate)) {
                const formatted = format(isoDate, 'EEEE, MMMM do, yyyy \'at\' haaa');
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
                    const formatted = format(parsedDate, 'EEEE, MMMM do, yyyy \'at\' haaa');
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
          
          const formattedAppointmentDateTime = isAppointmentScheduled ? 
            formatAppointmentDateTime(appointmentDetails) : 'N/A';
          
          // Create introductory sentence
          const appointmentStatus = isAppointmentScheduled ? 'and scheduled an appointment' : 'but did not schedule an appointment';
          const introSentence = `${customerName} called asking about ${displayService} ${appointmentStatus}.`;
          
          return `${introSentence}

Name: ${customerName}
Address: ${serviceAddress}
Phone Number: ${customerPhone}
Email: ${customerEmail}
Service: ${displayService}
Appointment scheduled?: ${appointmentScheduled}
Appointment Date/Time: ${formattedAppointmentDateTime}`;
        };
        
        const cleanSummary = createCallSummary();
        
        // Format appointment datetime for display in the top section
        const formatDisplayDateTime = (appointmentDetails: string) => {
          if (!appointmentDetails || appointmentDetails === 'Not scheduled') return 'Not scheduled';
          
          try {
            const isoDate = parseISO(appointmentDetails);
            if (isValid(isoDate)) {
              return format(isoDate, 'EEEE, MMMM do, yyyy \'at\' haaa');
            }
          } catch (error) {
            console.warn('Error parsing ISO date for display:', error);
          }
          
          return appointmentDetails;
        };
        
        // Parse name parts
        const nameParts = (customerName || '').split(' ');
        const firstName = nameParts[0] || 'N/A';
        const lastName = nameParts.slice(1).join(' ') || 'N/A';
        
        return {
          id: log.id,
          business_id: businessId,
          company_name: log.business_name || 'N/A',
          call_summary: cleanSummary,
          transcript: cleanTranscript,
          caller_name: customerName,
          phone_number: customerPhone,
          address: serviceAddress,
          email: customerEmail,
          service_info: serviceRequested,
          appointment_datetime: formatDisplayDateTime(appointmentDetails),
          call_datetime: new Date(log.created_at).toLocaleString(),
          first_name: firstName,
          last_name: lastName,
          raw_webhook_data: (metadata as any)?.raw_webhook_data || null
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

  const handleDeleteSingle = async (callLogId: string) => {
    // Single confirmation for deletion
    if (!confirm('Are you sure you want to delete this call log? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Temporarily disable auto-refresh during deletion
      const wasAutoRefreshOn = autoRefresh;
      if (autoRefresh) {
        setAutoRefresh(false);
      }
      
      const { error, count } = await supabase
        .from('call_logs')
        .delete({ count: 'exact' })
        .eq('id', callLogId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log('Delete result:', { count, callLogId });

      // Remove the deleted item from local state immediately
      setWebhookData(prev => prev.filter(item => item.id !== callLogId));
      
      toast({
        title: "Call Log Deleted",
        description: `Call log has been permanently deleted (${count} row${count !== 1 ? 's' : ''} affected)`
      });

      // Re-enable auto-refresh after a delay to prevent immediate re-fetch
      setTimeout(() => {
        if (wasAutoRefreshOn) {
          setAutoRefresh(true);
        }
      }, 3000);

    } catch (error) {
      console.error('Error deleting call log:', error);
      
      // Show detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete call log: ${errorMessage}`
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

    // Set up real-time subscription for call_logs
    const channel = supabase
      .channel('call-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs'
        },
        (payload) => {
          console.log('Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Refresh data when new calls come in
            fetchWebhookData();
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted item from local state
            const deletedId = payload.old?.id;
            if (deletedId) {
              setWebhookData(prev => prev.filter(item => item.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (interval) clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [autoRefresh]);


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Post-Call Data
            </CardTitle>
            <CardDescription>
              Real-time monitoring of completed call summaries and transcripts
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
        <div className="space-y-4 max-h-[1200px] overflow-y-auto">
          {webhookData.map((data) => (
            <div key={data.id} className="p-4 border rounded-lg bg-muted/30 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Call Time: {data.call_datetime}</Badge>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteSingle(data.id)}
                  disabled={loading}
                  className="absolute top-3 right-3"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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

                {data.raw_webhook_data && (
                  <Collapsible 
                    open={expandedRawData[data.id]} 
                    onOpenChange={(open) => 
                      setExpandedRawData(prev => ({ ...prev, [data.id]: open }))
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start p-0 h-auto"
                      >
                        <div className="flex items-center gap-2">
                          {expandedRawData[data.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Code className="h-4 w-4" />
                          <h4 className="text-sm font-medium text-muted-foreground">Raw Webhook Data</h4>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="text-xs bg-slate-900 text-green-400 p-4 rounded border max-h-80 overflow-y-auto font-mono">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(data.raw_webhook_data, null, 2)}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
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
              <p className="text-xs text-muted-foreground mb-2">
                Data will appear here when calls are processed through your ElevenLabs conversational AI
              </p>
              <p className="text-xs text-muted-foreground">
                Each call will include processed data plus raw webhook payload for debugging
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};