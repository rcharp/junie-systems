import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minimize2, Maximize2 } from "lucide-react";
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

export function ClientToolMonitor({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [events, setEvents] = useState<ClientToolEvent[]>([]);
  const [isMinimized, setIsMinimized] = useState(!defaultExpanded);

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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Client Tool Events</CardTitle>
            <CardDescription className="mt-1.5">
              Real-time monitoring of ElevenLabs client tool calls
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="shrink-0"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </div>
        {!isMinimized && (
          <div className="pt-3 border-t mt-3">
            <p className="text-xs text-muted-foreground">
              Showing {events.length} recent events
            </p>
          </div>
        )}
      </CardHeader>
      {!isMinimized && (
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground text-center">No events yet. Events will appear here in real-time.</p>
                </div>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={event.is_error ? "destructive" : event.result ? "default" : "secondary"} className="text-xs">
                          {event.tool_name}
                        </Badge>
                        {event.is_error && <Badge variant="destructive" className="text-xs">Error</Badge>}
                        {event.result && !event.is_error && <Badge variant="outline" className="text-xs">Completed</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="text-sm">
                        <span className="font-medium text-xs">Call SID:</span> 
                        <code className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">{event.call_sid}</code>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium text-xs">Tool Call ID:</span> 
                        <code className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">{event.tool_call_id}</code>
                      </div>
                      {event.parameters && Object.keys(event.parameters).length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-xs">Parameters:</span> 
                          <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                            {JSON.stringify(event.parameters, null, 2)}
                          </pre>
                        </div>
                      )}
                      {event.result && (
                        <div className="text-sm">
                          <span className="font-medium text-xs">Result:</span> 
                          <p className="mt-1 text-xs bg-muted p-2 rounded">{event.result}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  );
}
