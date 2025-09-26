import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, Database, Minimize2, Maximize2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      setLoading(true);
      
      const { error, count } = await supabase
        .from('business_data_requests')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Remove the deleted item from local state immediately
      setRequestData(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Deleted",
        description: `Business data request permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const toggleItemExpansion = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleManualRequest = async () => {
    const businessId = "5a8a338e-d401-4a14-a109-6974859ce5b8";
    
    try {
      setLoading(true);
      
      // Make a request to the business-data endpoint using Supabase client
      const { data: result, error } = await supabase.functions.invoke('business-data', {
        body: {
          business_id: businessId
        }
      });

      if (error) throw error;
      
      toast({
        title: "Manual Request Sent",
        description: `Business data request sent for ID: ${businessId}`,
      });
      
      // Refresh the data to show the new request
      setTimeout(() => {
        fetchBusinessDataRequests();
      }, 1000);
      
    } catch (error) {
      console.error('Error making manual request:', error);
      toast({
        title: "Error",
        description: "Failed to send manual business data request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(requestData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = requestData.slice(startIndex, endIndex);
  const actualEndIndex = Math.min(endIndex, requestData.length);

  const renderPagination = () => (
    <div className="flex flex-col space-y-3 pt-4 border-t">
      <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
        Showing {startIndex + 1}-{actualEndIndex} of {requestData.length}
      </div>
      <div className="flex items-center justify-center space-x-1 sm:space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="text-xs px-2 sm:px-3 flex-shrink-0"
        >
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>
        
        {/* Mobile: Show only current page and total */}
        <div className="flex items-center sm:hidden">
          <span className="text-xs text-muted-foreground px-2">
            {currentPage} of {totalPages}
          </span>
        </div>
        
        {/* Desktop: Show limited page numbers */}
        <div className="hidden sm:flex items-center space-x-1">
          {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
            let page;
            if (totalPages <= 3) {
              page = i + 1;
            } else if (currentPage === 1) {
              page = i + 1;
            } else if (currentPage === totalPages) {
              page = totalPages - 2 + i;
            } else {
              page = currentPage - 1 + i;
            }
            return (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0 text-sm"
              >
                {page}
              </Button>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="text-xs px-2 sm:px-3 flex-shrink-0"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        {/* Mobile Layout */}
        <div className="md:hidden space-y-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-4 w-4 text-primary" />
            Business Data Requests
          </CardTitle>
          <CardDescription className="text-sm">
            Monitor POST requests to the get-business-data endpoint
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRequest}
              disabled={loading}
              className="flex items-center gap-1 text-xs"
            >
              <Send className="h-3 w-3" />
              Test Request
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex items-center gap-1 text-xs"
            >
              {isMinimized ? (
                <>
                  <Maximize2 className="h-3 w-3" />
                  Expand
                </>
              ) : (
                <>
                  <Minimize2 className="h-3 w-3" />
                  Minimize
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-start">
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
              onClick={handleManualRequest}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Test Request
            </Button>
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
              onClick={fetchBusinessDataRequests}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isMinimized && (
      <CardContent>
        <div className="space-y-4">
          {requestData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No business data requests received yet</p>
              <p className="text-sm">Real POST requests to /functions/v1/business-data will appear here</p>
            </div>
          ) : (
            <>
              {/* Top Pagination and Info */}
                  {requestData.length > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {startIndex + 1}-{actualEndIndex} of {requestData.length}
                      </div>
                      <div className="flex-shrink-0">
                        {renderPagination()}
                      </div>
                    </div>
                  )}
              
              {currentData.map((request) => {
                const isItemExpanded = expandedItems[request.id] || false;
                
                return (
                <Card 
                  key={request.id} 
                  className={`relative ${!isItemExpanded ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
                  onClick={!isItemExpanded ? () => toggleItemExpansion(request.id) : undefined}
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={
                              request.request_source.toLowerCase() === 'elevenlabs' 
                                ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                : request.request_source.toLowerCase() === 'manual'
                                ? 'bg-white text-gray-800 border-gray-300'
                                : ''
                            }
                          >
                            {request.request_source.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={
                              request.response_status === 200 
                                ? 'bg-green-100 text-green-800 border-green-300' 
                                : 'bg-red-100 text-red-800 border-red-300'
                            }
                          >
                            {request.response_status}
                          </Badge>
                        </div>
                        {!isItemExpanded && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">
                              Business ID: {request.business_id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(request.created_at)}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleItemExpansion(request.id)}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSingle(request.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {isItemExpanded && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {formatTime(request.created_at)}
                      </p>
                      <span className="text-sm font-medium">{request.request_type}</span>
                      
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
                      
                      {request.request_data && (
                        <div>
                          <span className="font-medium text-sm">Request Data:</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(request.request_data, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {request.response_data && (
                        <div>
                          <span className="font-medium text-sm">Response Data:</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(request.response_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>
                );
              })}
              
              {/* Bottom Pagination Controls */}
              {requestData.length > 0 && (
                <div className="flex justify-center mt-6">
                  {renderPagination()}
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
      )}
    </Card>
  );
};