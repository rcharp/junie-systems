import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface ClientToolEvent {
  id: string;
  call_sid: string;
  tool_name: string;
  tool_call_id: string;
  parameters: any;
  result: string | null;
  is_error: boolean;
  created_at: string;
}

export function ClientToolMonitor() {
  const [events, setEvents] = useState<ClientToolEvent[]>([]);

  useEffect(() => {
    // Fetch initial events
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('client_tool_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && !error) {
        setEvents(data);
      }
    };

    fetchEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('client-tool-events')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_tool_events'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setEvents(prev => [payload.new as ClientToolEvent, ...prev].slice(0, 50));
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev => prev.map(e => 
              e.id === payload.new.id ? payload.new as ClientToolEvent : e
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Tool Events</CardTitle>
        <CardDescription>
          Real-time monitoring of ElevenLabs client tool calls
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet. Events will appear here in real-time.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={event.is_error ? "destructive" : event.result ? "default" : "secondary"}>
                        {event.tool_name}
                      </Badge>
                      {event.is_error && <Badge variant="destructive">Error</Badge>}
                      {event.result && !event.is_error && <Badge variant="outline">Completed</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Call SID:</span> 
                      <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{event.call_sid}</code>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Tool Call ID:</span> 
                      <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{event.tool_call_id}</code>
                    </div>
                  </div>

                  {Object.keys(event.parameters || {}).length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Parameters:</span>
                      <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.parameters, null, 2)}
                      </pre>
                    </div>
                  )}

                  {event.result && (
                    <div className="text-sm">
                      <span className="font-medium">Result:</span>
                      <p className={`mt-1 text-xs p-2 rounded ${
                        event.is_error ? 'bg-destructive/10 text-destructive' : 'bg-muted'
                      }`}>
                        {event.result}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
