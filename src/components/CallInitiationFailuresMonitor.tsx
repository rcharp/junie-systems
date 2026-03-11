// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface CallFailure {
  id: string;
  phone_number: string;
  created_at: string;
  call_summary: string;
  metadata: any;
}

export const CallInitiationFailuresMonitor = () => {
  const [failures, setFailures] = useState<CallFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFailures = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('id, phone_number, created_at, call_summary, metadata')
        .eq('call_type', 'initiation_failure')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFailures(data || []);
    } catch (error) {
      console.error('Error fetching call initiation failures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFailures();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <span className="font-medium">
            {failures.length} failure{failures.length !== 1 ? 's' : ''} recorded
          </span>
        </div>
        <Button onClick={fetchFailures} disabled={isLoading} size="sm" variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <Activity className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading failures...</p>
        </div>
      ) : failures.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No call initiation failures recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {failures.map((failure) => (
            <div key={failure.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="destructive" className="mb-2">Failed</Badge>
                  <p className="font-medium">{failure.phone_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(failure.created_at), 'PPpp')}
                  </p>
                </div>
              </div>
              <p className="text-sm">{failure.call_summary}</p>
              {failure.metadata && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View raw data
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                    {JSON.stringify(failure.metadata, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
