import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Play, Clock, User, MessageSquare, Calendar, RefreshCw, Plus, FileText, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";

interface BlandCall {
  call_id: string;
  created_at: string;
  call_length: number;
  to: string;
  from: string;
  completed: boolean;
  queue_status: string;
  error_message: string | null;
  answered_by: string;
  batch_id?: string;
}

interface CallDetails {
  call_id: string;
  to: string;
  from: string;
  call_length: number;
  call_type: string;
  completed: boolean;
  created_at: string;
  inbound: boolean;
  queue_status: string;
  endpoint_url: string;
  max_duration: number;
  answered_by: string;
  record: boolean;
  summary: string;
  price: number;
  status: string;
  error_message: string | null;
}

const BlandAIMonitoring = () => {
  const [calls, setCalls] = useState<BlandCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallDetails | null>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [showNewCallDialog, setShowNewCallDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pathwayId, setPathwayId] = useState("");
  const { toast } = useToast();

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bland-ai-calls', {
        body: {},
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (error) throw error;

      setCalls(data.calls || []);
      toast({
        title: "Calls Updated",
        description: `Fetched ${data.calls?.length || 0} calls from Bland AI`,
      });
    } catch (error: any) {
      console.error('Error fetching calls:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch calls",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCallDetails = async (callId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('bland-ai-calls', {
        body: { action: 'get-call', call_id: callId },
        method: 'POST',
      });

      if (error) throw error;
      
      setSelectedCall(data);
    } catch (error: any) {
      console.error('Error fetching call details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch call details",
        variant: "destructive",
      });
    }
  };

  const fetchTranscript = async (callId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('bland-ai-calls', {
        body: { action: 'get-transcript', call_id: callId },
        method: 'POST',
      });

      if (error) throw error;
      
      setTranscript(data);
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch transcript",
        variant: "destructive",
      });
    }
  };

  const sendCall = async () => {
    if (!phoneNumber || !pathwayId) {
      toast({
        title: "Missing Information",
        description: "Please provide both phone number and pathway ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('bland-ai-calls', {
        body: {
          phone_number: phoneNumber,
          pathway_id: pathwayId
        },
      });

      if (error) throw error;

      toast({
        title: "Call Initiated! 📞",
        description: `Call started with ID: ${data.call_id}`,
      });

      setShowNewCallDialog(false);
      setPhoneNumber("");
      setPathwayId("");
      
      // Refresh calls list after a short delay
      setTimeout(fetchCalls, 2000);
    } catch (error: any) {
      console.error('Error sending call:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const formatDuration = (minutes: number) => {
    const totalSeconds = Math.round(minutes * 60);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string, completed: boolean) => {
    if (!completed) return "bg-yellow-500";
    if (status === "complete") return "bg-green-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bland AI Call Monitoring</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchCalls} disabled={loading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowNewCallDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Call
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <span>Recent Calls ({calls.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {calls.map((call) => (
                  <div 
                    key={call.call_id} 
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => fetchCallDetails(call.call_id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(call.queue_status, call.completed)}`} />
                        <span className="font-medium">{call.to}</span>
                      </div>
                      <Badge variant={call.completed ? "default" : "secondary"}>
                        {call.queue_status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(call.call_length)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{call.answered_by}</span>
                        </div>
                      </div>
                      <span>{new Date(call.created_at).toLocaleString()}</span>
                    </div>
                    {call.error_message && (
                      <div className="mt-2 text-xs text-destructive">
                        Error: {call.error_message}
                      </div>
                    )}
                  </div>
                ))}
                {calls.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    No calls found. Start by initiating a new call.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Call Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>Call Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCall ? (
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="transcript" onClick={() => fetchTranscript(selectedCall.call_id)}>
                    Transcript
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Call ID</Label>
                      <p className="text-sm font-mono">{selectedCall.call_id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <p className="text-sm">{selectedCall.status}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">To</Label>
                      <p className="text-sm">{selectedCall.to}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">From</Label>
                      <p className="text-sm">{selectedCall.from}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Duration</Label>
                      <p className="text-sm">{formatDuration(selectedCall.call_length)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Answered By</Label>
                      <p className="text-sm">{selectedCall.answered_by}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                      <p className="text-sm">${selectedCall.price?.toFixed(4) || '0.0000'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Type</Label>
                      <p className="text-sm">{selectedCall.inbound ? 'Inbound' : 'Outbound'}</p>
                    </div>
                  </div>
                  
                  {selectedCall.summary && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Summary</Label>
                      <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{selectedCall.summary}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="transcript">
                  <ScrollArea className="h-64">
                    {transcript ? (
                      <div className="space-y-2">
                        {transcript.transcript?.map((entry: any, index: number) => (
                          <div key={index} className="p-2 rounded-lg bg-muted">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={entry.user === 'user' ? 'default' : 'secondary'}>
                                {entry.user === 'user' ? 'Caller' : 'AI'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {entry.timestamp}s
                              </span>
                            </div>
                            <p className="text-sm">{entry.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        Select a call to view transcript
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Select a call to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Call Dialog */}
      <Dialog open={showNewCallDialog} onOpenChange={setShowNewCallDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate New Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use E.164 format for best results (e.g., +1234567890)
              </p>
            </div>
            <div>
              <Label htmlFor="pathway">Pathway ID</Label>
              <Input
                id="pathway"
                placeholder="Enter your pathway ID"
                value={pathwayId}
                onChange={(e) => setPathwayId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get this from your Bland AI dashboard pathways section
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewCallDialog(false)}>
                Cancel
              </Button>
              <Button onClick={sendCall}>
                <Phone className="w-4 h-4 mr-2" />
                Start Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlandAIMonitoring;