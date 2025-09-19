import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Database, Pause, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BusinessDataRequest {
  id: string;
  business_id: string;
  request_type: string;
  request_source: string;
  request_data: any;
  response_status: number;
  response_data: any;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  company_name?: string;
}

export const BusinessDataMonitor: React.FC = () => {
  const [requestData, setRequestData] = useState<BusinessDataRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchBusinessDataRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('business_data_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get business names for each request
      const businessIds = [...new Set(data?.map(item => item.business_id))];
      const { data: businessData } = await supabase
        .from('business_settings')
        .select('id, business_name')
        .in('id', businessIds);

      const businessMap = businessData?.reduce((acc, business) => {
        acc[business.id] = business.business_name || 'Unknown';
        return acc;
      }, {} as Record<string, string>) || {};

      const formattedData: BusinessDataRequest[] = data?.map(item => ({
        id: item.id,
        business_id: item.business_id,
        request_type: item.request_type,
        request_source: item.request_source,
        request_data: item.request_data,
        response_status: item.response_status,
        response_data: item.response_data,
        user_agent: item.user_agent,
        ip_address: item.ip_address as string | null,
        created_at: item.created_at,
        company_name: businessMap[item.business_id] || 'Unknown'
      })) || [];

      setRequestData(formattedData);
    } catch (error) {
      console.error('Error fetching business data requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch business data requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      setRequestData(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Deleted",
        description: "Business data request removed successfully",
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchBusinessDataRequests();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchBusinessDataRequests, 10000); // Refresh every 10 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Business Data Requests
            </CardTitle>
            <CardDescription>
              Monitor POST requests to the get-business-data endpoint
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center gap-2"
            >
              {autoRefresh ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause Auto-refresh
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Enable Auto-refresh
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBusinessDataRequests}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requestData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No business data requests received yet</p>
              <p className="text-sm">Real POST requests to /functions/v1/business-data will appear here</p>
            </div>
          ) : (
            requestData.map((request) => (
              <Card key={request.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{request.request_source.toUpperCase()}</Badge>
                        <span className="text-sm font-medium">{request.request_type}</span>
                        <Badge 
                          variant={request.response_status === 200 ? 'default' : 'destructive'}
                        >
                          {request.response_status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(request.created_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSingle(request.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Business ID:</span>
                        <p className="text-muted-foreground font-mono">{request.business_id}</p>
                      </div>
                      <div>
                        <span className="font-medium">Company:</span>
                        <p className="text-muted-foreground">{request.company_name}</p>
                      </div>
                    </div>
                    
                    {request.response_data && (
                      <div>
                        <span className="font-medium text-sm">Response Data:</span>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(request.response_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};