import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CallFailure {
  id: string;
  phone_number: string;
  created_at: string;
  call_summary: string;
  metadata: any;
}

const CallInitiationFailuresPage = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [failures, setFailures] = useState<CallFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }

    if (!loading && !isAdmin) {
      navigate('/dashboard');
    }

    if (!loading && isAdmin) {
      fetchFailures();
    }
  }, [user, isAdmin, loading, navigate]);

  const fetchFailures = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-primary">Call Initiation Failures</h1>
            </div>
            <Button onClick={fetchFailures} disabled={isLoading} size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Call Initiation Failures
            </CardTitle>
            <CardDescription>
              Failed attempts to initiate calls via ElevenLabs
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CallInitiationFailuresPage;
