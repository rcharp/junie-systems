import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface QueueEntry {
  id: string;
  customer_name: string;
  customer_phone: string;
  appointment_date_time: string;
  service_address: string;
  service_type: string | null;
  sync_status: 'pending' | 'processing' | 'completed' | 'failed';
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  calendar_event_id: string | null;
  created_at: string;
  next_retry_at: string | null;
}

export function AppointmentSyncQueue() {
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_sync_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setQueueEntries((data || []) as QueueEntry[]);
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast.error('Failed to fetch sync queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('appointment_sync_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointment_sync_queue',
        },
        () => {
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRetry = async (queueId: string) => {
    setRetrying(queueId);
    try {
      // Reset the entry to pending with immediate next retry
      const { error } = await supabase
        .from('appointment_sync_queue')
        .update({
          sync_status: 'pending',
          next_retry_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', queueId);

      if (error) throw error;

      // Call the google-calendar-book function to process immediately
      const { error: invokeError } = await supabase.functions.invoke('google-calendar-book', {
        body: { queueId },
      });

      if (invokeError) throw invokeError;

      toast.success('Retry initiated');
      fetchQueue();
    } catch (error) {
      console.error('Error retrying:', error);
      toast.error('Failed to retry sync');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case 'pending':
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Sync Queue</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Calendar Sync Queue</CardTitle>
            <CardDescription>
              Appointments waiting to be synced with Google Calendar
            </CardDescription>
          </div>
          <Button onClick={fetchQueue} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {queueEntries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No appointments in queue</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Appointment</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{entry.customer_name}</TableCell>
                    <TableCell>{entry.customer_phone}</TableCell>
                    <TableCell>
                      {format(new Date(entry.appointment_date_time), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {entry.service_address}
                    </TableCell>
                    <TableCell>{entry.service_type || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(entry.sync_status)}
                        {entry.error_message && (
                          <p className="text-xs text-destructive mt-1">
                            {entry.error_message}
                          </p>
                        )}
                        {entry.calendar_event_id && (
                          <p className="text-xs text-muted-foreground">
                            Event: {entry.calendar_event_id}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {entry.retry_count} / {entry.max_retries}
                      </span>
                    </TableCell>
                    <TableCell>
                      {(entry.sync_status === 'failed' || entry.sync_status === 'pending') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetry(entry.id)}
                          disabled={retrying === entry.id}
                        >
                          {retrying === entry.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Retry
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
