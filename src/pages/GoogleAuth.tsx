import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GoogleAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state parameter');
        }

        // Exchange the code for tokens using the Google Calendar OAuth function
        const { data, error: exchangeError } = await supabase.functions.invoke('google-calendar-oauth', {
          body: { code, state },
        });

        if (exchangeError) {
          throw new Error(exchangeError.message || 'Failed to exchange authorization code');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Token exchange failed');
        }

        setStatus('success');
        
        // Send success message to parent window and close popup
        // Use window.location.origin for secure postMessage
        if (window.opener) {
          window.opener.postMessage({ type: 'google-calendar-connected' }, window.location.origin);
          window.close();
        } else {
          // Fallback for non-popup case
          setTimeout(() => {
            navigate('/settings', { replace: true });
          }, 2000);
        }

      } catch (err) {
        console.error('Google auth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setStatus('error');
        
        // Send error message to parent window and close popup
        // Use window.location.origin for secure postMessage
        if (window.opener) {
          window.opener.postMessage({ type: 'google-calendar-error', error: errorMessage }, window.location.origin);
          window.close();
        }
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/settings', { replace: true });
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <CardTitle>Connecting Google Calendar</CardTitle>
            <CardDescription>
              Please wait while we complete the connection to your Google Calendar...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Connection Successful!</CardTitle>
            <CardDescription>
              Your Google Calendar has been connected successfully. Redirecting to settings...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-red-900">Connection Failed</CardTitle>
          <CardDescription>
            There was an error connecting your Google Calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            {error}
          </div>
          <Button onClick={handleRetry} className="w-full">
            Return to Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuth;