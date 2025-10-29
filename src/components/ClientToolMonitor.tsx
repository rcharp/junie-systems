import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Minimize2, Maximize2, CalendarIcon } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ClientToolEvent {
  id: string;
  call_sid: string;
  tool_name: string;
  tool_call_id: string;
  parameters: any;
  result: string | null;
  is_error: boolean;
  created_at: string;
  is_test?: boolean;
}

export function ClientToolMonitor({ defaultExpanded = false }: { defaultExpanded?: boolean }) {
  const [events, setEvents] = useState<ClientToolEvent[]>([]);
  const [isMinimized, setIsMinimized] = useState(!defaultExpanded);
  const [testDate, setTestDate] = useState<Date>();
  const [testTime, setTestTime] = useState<string>("");
  const [naturalLanguage, setNaturalLanguage] = useState<string>("");
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingNL, setIsTestingNL] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = async () => {
    setIsRefreshing(true);
    try {
      console.log('Fetching client tool events...');
      const { data, error } = await supabase
        .from("client_tool_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      console.log('Client tool events query result:', { data, error, count: data?.length });

      if (error) {
        console.error("Error fetching client tool events:", error);
        toast.error(`Error loading events: ${error.message}`);
      } else if (data) {
        console.log(`✅ Loaded ${data.length} client tool events`);
        console.log('First event:', data[0]);
        console.log('Setting events state with:', data);
        setEvents(data);
        if (data.length === 0) {
          toast.info("No client tool events found in database");
        }
      }
    } catch (err) {
      console.error('Exception fetching events:', err);
      toast.error('Failed to fetch events');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Fetch initial events
    fetchEvents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("client-tool-events")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_tool_events",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setEvents((prev) => [payload.new as ClientToolEvent, ...prev].slice(0, 50));
          } else if (payload.eventType === "UPDATE") {
            setEvents((prev) => prev.map((e) => (e.id === payload.new.id ? (payload.new as ClientToolEvent) : e)));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const testSpecificAvailability = async () => {
    if (!testDate) {
      toast.error("Please select a date first");
      return;
    }

    setIsTesting(true);
    try {
      const dateStr = format(testDate, "yyyy-MM-dd");
      const testBusinessId = "16739d7f-5a78-499f-ba6d-7a8b72ccba58";

      const requestBody: any = {
        business_id: testBusinessId,
        date: dateStr,
      };

      if (testTime) {
        requestBody.time = testTime;
      }

      console.log("Testing get-specific-availability with:", requestBody);

      const { data, error } = await supabase.functions.invoke("get-specific-availability", {
        body: requestBody,
      });

      const testEvent: ClientToolEvent = {
        id: `test-${Date.now()}`,
        call_sid: "TEST",
        tool_name: "get-specific-availability",
        tool_call_id: `test-call-${Date.now()}`,
        parameters: requestBody,
        result: error ? `Error: ${error.message}` : JSON.stringify(data, null, 2),
        is_error: !!error,
        created_at: new Date().toISOString(),
        is_test: true,
      };

      setEvents((prev) => [testEvent, ...prev].slice(0, 50));

      if (error) {
        toast.error(`Error: ${error.message}`);
        console.error("Error response:", error);
      } else {
        toast.success(`Found ${data.available_slots?.length || 0} available slots`);
        console.log("Specific availability response:", data);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      console.error("Exception:", error);
    } finally {
      setIsTesting(false);
    }
  };

  const testGeneralAvailability = async () => {
    if (!naturalLanguage.trim()) {
      toast.error("Please enter a natural language query");
      return;
    }

    setIsTestingNL(true);
    try {
      const testBusinessId = "16739d7f-5a78-499f-ba6d-7a8b72ccba58";

      const requestBody = {
        business_id: testBusinessId,
        natural_language: naturalLanguage,
      };

      console.log("Testing get-general-availability with:", requestBody);

      const { data, error } = await supabase.functions.invoke("get-general-availability", {
        body: requestBody,
      });

      const testEvent: ClientToolEvent = {
        id: `test-${Date.now()}`,
        call_sid: "TEST",
        tool_name: "get-general-availability",
        tool_call_id: `test-call-${Date.now()}`,
        parameters: requestBody,
        result: error ? `Error: ${error.message}` : JSON.stringify(data, null, 2),
        is_error: !!error,
        created_at: new Date().toISOString(),
        is_test: true,
      };

      setEvents((prev) => [testEvent, ...prev].slice(0, 50));

      if (error) {
        toast.error(`Error: ${error.message}`);
        console.error("Error response:", error);
      } else {
        toast.success(`Found ${data.available_slots?.length || 0} available slots for "${naturalLanguage}"`);
        console.log("General availability response:", data);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      console.error("Exception:", error);
    } finally {
      setIsTestingNL(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Client Tool Events</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsMinimized(!isMinimized)} className="shrink-0">
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!isMinimized && (
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side - Testing Controls */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">API Testing</h3>
                <p className="text-xs text-muted-foreground">Test availability endpoints</p>
              </div>

              {/* Test Specific Date/Time Availability */}
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div>
                  <p className="text-xs font-semibold">Specific Date/Time Query</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Uses get-specific-availability endpoint</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="specific-date" className="text-xs mb-1 block">
                      Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="specific-date"
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !testDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {testDate ? format(testDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={testDate}
                          onSelect={setTestDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="specific-time" className="text-xs mb-1 block">
                      Time (optional)
                    </Label>
                    <Input
                      id="specific-time"
                      type="time"
                      value={testTime}
                      onChange={(e) => setTestTime(e.target.value)}
                      placeholder="HH:MM"
                      className="h-9 text-xs"
                    />
                  </div>

                  <Button
                    onClick={testSpecificAvailability}
                    disabled={!testDate || isTesting}
                    size="sm"
                    className="w-full"
                  >
                    {isTesting ? "Testing..." : "Test Specific Query"}
                  </Button>
                </div>
              </div>

              {/* Test Natural Language Query */}
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div>
                  <p className="text-xs font-semibold">Natural Language Query</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Uses get-general-availability endpoint</p>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="natural-language" className="text-xs mb-1 block">
                      Natural Language Input
                    </Label>
                    <Input
                      id="natural-language"
                      type="text"
                      value={naturalLanguage}
                      onChange={(e) => setNaturalLanguage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && naturalLanguage.trim() && !isTestingNL) {
                          testGeneralAvailability();
                        }
                      }}
                      placeholder='e.g., "tomorrow", "next Friday", "Monday morning"'
                      className="h-9 text-xs"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Try: "tomorrow", "next week", "Friday afternoon"
                    </p>
                  </div>

                  <Button
                    onClick={testGeneralAvailability}
                    disabled={!naturalLanguage.trim() || isTestingNL}
                    size="sm"
                    className="w-full"
                  >
                    {isTestingNL ? "Testing..." : "Test Natural Language Query"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right Side - Events List */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Live Events</h3>
                  <p className="text-xs text-muted-foreground">
                    Showing {events.length} recent events
                    {events.length > 0 && (
                      <span className="ml-2 text-xs">
                        (Latest: {new Date(events[0]?.created_at).toLocaleDateString()})
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={fetchEvents}
                  disabled={isRefreshing}
                  size="sm"
                  variant="outline"
                >
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
              </div>

              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <p className="text-sm text-muted-foreground text-center">
                        No events yet. Events will appear here in real-time.
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        Try using the test buttons above or make a live call to see events.
                      </p>
                    </div>
                   ) : (
                    events.map((event) => (
                      <div key={event.id} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {event.is_test ? (
                              <Badge variant="secondary" className="text-xs">
                                TEST
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                              >
                                LIVE
                              </Badge>
                            )}
                            <Badge
                              variant={event.is_error ? "destructive" : event.result ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {event.tool_name}
                            </Badge>
                            {event.is_error && (
                              <Badge variant="destructive" className="text-xs">
                                Error
                              </Badge>
                            )}
                            {event.result && !event.is_error && (
                              <Badge variant="outline" className="text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-sm">
                            <span className="font-medium text-xs">Call SID:</span>
                            <code className="ml-2 text-xs bg-muted px-2 py-0.5 rounded break-all">
                              {event.call_sid}
                            </code>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-xs">Tool Call ID:</span>
                            <code className="ml-2 text-xs bg-muted px-2 py-0.5 rounded break-all">
                              {event.tool_call_id}
                            </code>
                          </div>
                          {event.parameters && Object.keys(event.parameters).length > 0 && (
                            <div className="text-sm">
                              <span className="font-medium text-xs">Parameters:</span>
                              <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-w-full">
                                {JSON.stringify(event.parameters, null, 2)}
                              </pre>
                            </div>
                          )}
                          {event.result && (
                            <div className="text-sm">
                              <span className="font-medium text-xs">Result:</span>
                              <p className="mt-1 text-xs bg-muted p-2 rounded break-words max-w-full overflow-x-auto">
                                {event.result}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
