import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Webhook, Activity, Trash2, ChevronDown, ChevronRight, Code, Minimize2, Maximize2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid, parseISO } from 'date-fns';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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
  appointment_scheduled: string;
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
  const [isMinimized, setIsMinimized] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchWebhookData = async () => {
    try {
      setLoading(true);
      console.log('Starting webhook data fetch...'); // Debug log
      
      // Fetch recent call logs to show incoming webhook data (show all for admin)
      const { data: logs, error: logsError } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) {
        console.error('Supabase error:', logsError);
        throw logsError;
      }

      console.log('Successfully fetched logs:', logs?.length || 0, 'records'); // Debug log

      // Filter out logs that don't have meaningful call data before processing
      const filteredLogs = (logs || []).filter(log => {
        // Type-safe metadata access
        const metadata = log.metadata as any;
        const rawWebhookData = metadata?.raw_webhook_data;
        
        // Check if the log has any meaningful call data
        const hasCallData = (
          (log.transcript && log.transcript.trim() !== '') ||
          (log.caller_name && log.caller_name.trim() !== '' && log.caller_name !== 'N/A') ||
          (log.phone_number && log.phone_number.trim() !== '' && log.phone_number !== 'N/A') ||
          (log.message && log.message.trim() !== '') ||
          (rawWebhookData && 
           (rawWebhookData.data?.analysis?.transcript_summary ||
            rawWebhookData.data?.analysis?.data_collection_results ||
            rawWebhookData.variables))
        );
        
        // If no meaningful data, mark for deletion
        if (!hasCallData) {
          console.log('Filtering out empty webhook log:', log.id);
          // Delete empty webhook logs asynchronously
          supabase
            .from('call_logs')
            .delete()
            .eq('id', log.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error deleting empty webhook log:', error);
              } else {
                console.log('Deleted empty webhook log:', log.id);
              }
            });
        }
        
        return hasCallData;
      });

      console.log('Filtered logs:', filteredLogs?.length || 0, 'records with meaningful data');

      // Transform filtered call logs to webhook data format
      const transformedData: WebhookData[] = filteredLogs.map(log => {
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
        let businessName = log.business_name || 'N/A';

        // Extract data from the new nested structure: data.analysis.data_collection_results
        if (rawWebhookData && rawWebhookData.data && rawWebhookData.data.analysis) {
          const analysis = rawWebhookData.data.analysis;
          
          // Use transcript_summary for the call summary (keep it short)
          if (analysis.transcript_summary) {
            serviceRequested = analysis.transcript_summary;
          }
          
          // Extract from data_collection_results if available
          if (analysis.data_collection_results) {
            const results = analysis.data_collection_results;
            
            // Extract business name
            if (results.business_name && results.business_name.value) {
              businessName = results.business_name.value;
            }
            
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
            if (results.email_address && results.email_address.value) {
              customerEmail = results.email_address.value;
              console.log('✅ Found email in data_collection_results.email_address:', customerEmail);
            } else if (results.email && results.email.value) {
              customerEmail = results.email.value;
              console.log('✅ Found email in data_collection_results.email:', customerEmail);
            } else {
              console.log('❌ No email found in data_collection_results');
              console.log('Available fields:', Object.keys(results));
              console.log('Full results object:', results);
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
          if (vars.email) {
            customerEmail = vars.email;
            console.log('Found email in variables:', customerEmail);
          } else {
            console.log('No email found in variables. Available variables:', Object.keys(vars));
          }
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
          console.log('Raw webhook data for transcript:', rawData); // Debug log
          
          // Get transcript from data.transcript (it's an array of conversation objects)
          if (rawData?.data?.transcript && Array.isArray(rawData.data.transcript)) {
            console.log('Found transcript array in data.transcript:', rawData.data.transcript);
            return formatTranscriptArray(rawData.data.transcript);
          }
          
          // Check for transcript at root level
          if (rawData?.transcript && Array.isArray(rawData.transcript)) {
            console.log('Found transcript array at root level:', rawData.transcript);
            return formatTranscriptArray(rawData.transcript);
          }
          
          // Fallback to log transcript
          if (log.transcript) {
            console.log('Using log transcript:', log.transcript);
            return formatTranscriptText(log.transcript);
          }
          
          console.log('No transcript found anywhere');
          return "No transcript available";
        };

        const formatTranscriptArray = (transcriptArray: any[]) => {
          if (!transcriptArray || !Array.isArray(transcriptArray)) return "No transcript available";
          
          return transcriptArray.map(item => {
            if (item.role && item.message) {
              const role = item.role === 'agent' ? 'Agent' : 
                          item.role === 'user' ? 'Caller' : 
                          item.role.charAt(0).toUpperCase() + item.role.slice(1);
              
              // Clean up the message (remove quotes if present)
              let message = item.message || '';
              if (typeof message === 'string') {
                message = message.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
              }
              
              return `${role}: ${message}`;
            }
            return '';
          }).filter(line => line.trim()).join('\n\n');
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

        // Create a structured call summary (keep it short)
        const createCallSummary = () => {
          // Just return the transcript summary from the analysis
          if (rawWebhookData?.data?.analysis?.transcript_summary) {
            return rawWebhookData.data.analysis.transcript_summary.trim();
          }
          
          // Fallback to a simple summary if no transcript summary available
          const displayService = serviceRequested === 'N/A' ? 'general inquiry' : serviceRequested;
          return `Customer called regarding ${displayService}.`;
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
        
        console.log('Final extracted customer data:', {
          customerName,
          customerPhone,
          customerEmail,
          serviceAddress,
          appointmentDetails,
          serviceRequested,
          appointmentScheduled,
          businessName
        });
        
        console.log('📧 Final email assignment:', {
          customerEmail,
          logEmail: log.email,
          finalEmail: customerEmail || log.email || 'N/A'
        });

        return {
          id: log.id,
          business_id: businessId,
          company_name: businessName,
          call_summary: cleanSummary,
          transcript: cleanTranscript,
          caller_name: customerName,
          phone_number: customerPhone,
          address: serviceAddress,
          email: customerEmail || log.email || 'N/A',
          service_info: serviceRequested,
          appointment_datetime: formatDisplayDateTime(appointmentDetails),
          appointment_scheduled: appointmentScheduled,
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

  const handleDeleteClick = (callLogId: string) => {
    setConfirmingDelete(callLogId);
  };

  const handleCancelDelete = () => {
    setConfirmingDelete(null);
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

  // Pagination calculations
  const totalPages = Math.ceil(webhookData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = webhookData.slice(startIndex, endIndex);
  const actualEndIndex = Math.min(endIndex, webhookData.length);

  const renderPagination = () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) setCurrentPage(currentPage - 1);
            }}
            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
        
        {Array.from({ length: totalPages }, (_, i) => (
          <PaginationItem key={i + 1}>
            <PaginationLink
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(i + 1);
              }}
              isActive={currentPage === i + 1}
            >
              {i + 1}
            </PaginationLink>
          </PaginationItem>
        ))}
        
        <PaginationItem>
          <PaginationNext 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
            }}
            className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );

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
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex items-center gap-2"
            >
              {isMinimized ? (
                <>
                  <Maximize2 className="h-4 w-4" />
                  Expand
                </>
              ) : (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Minimize
                </>
              )}
            </Button>
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
      {!isMinimized && (
      <CardContent>
        <div className="space-y-4 max-h-[1200px] overflow-y-auto">
          {/* Top Pagination and Info */}
          {webhookData.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{actualEndIndex} of {webhookData.length}
              </div>
              <div className="flex-shrink-0">
                {renderPagination()}
              </div>
            </div>
          )}
          
          {currentData.map((data) => {
            const isItemExpanded = expandedItems[data.id] || false;
            
            return (
              <div 
                key={data.id} 
                className={`p-4 border rounded-lg bg-muted/30 relative ${!isItemExpanded ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                onClick={!isItemExpanded ? () => setExpandedItems(prev => ({ ...prev, [data.id]: !prev[data.id] })) : undefined}
              >
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col gap-1">
                  {/* Incoming Call Header */}
                  {(() => {
                    const incomingCall = data.raw_webhook_data?.data?.metadata?.phone_call?.external_number ||
                                       data.raw_webhook_data?.data?.analysis?.data_collection_results?.caller_id?.value || 
                                       data.raw_webhook_data?.caller_id || 
                                       data.phone_number;
                    return (
                      <div className="text-2xl font-bold text-foreground">
                        Incoming - {incomingCall}
                      </div>
                    );
                  })()}
                  <Badge variant="outline">Call Time: {data.call_datetime}</Badge>
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedItems(prev => ({ ...prev, [data.id]: !prev[data.id] }))}
                    className="flex items-center gap-1"
                  >
                    {isItemExpanded ? (
                      <>
                        <Minimize2 className="h-4 w-4" />
                        Minimize
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-4 w-4" />
                        Expand
                      </>
                    )}
                  </Button>
                  {confirmingDelete === data.id ? (
                    <div className="flex gap-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSingle(data.id)}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelDelete}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(data.id)}
                      disabled={loading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {!isItemExpanded && (
                <div className="text-sm text-muted-foreground">
                  {data.call_datetime}
                </div>
              )}
              
              {isItemExpanded && (
              <>
              <div>
                <h3 className="text-lg font-semibold mb-3">Call Details</h3>
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
                      <h4 className="text-sm font-medium text-muted-foreground">Service Address</h4>
                      <p className="text-sm">{data.address}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Appointment Scheduled</h4>
                      <p className="text-sm">{data.appointment_scheduled}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Appointment Date/Time</h4>
                      <p className="text-sm">{data.appointment_datetime}</p>
                    </div>
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
              </>
              )}
              </div>
            );
          })}
          
          {/* Bottom Pagination Controls */}
          {webhookData.length > 0 && (
            <div className="flex justify-center mt-6">
              {renderPagination()}
            </div>
          )}
          
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
      )}
    </Card>
  );
};
