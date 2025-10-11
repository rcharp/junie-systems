import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const GoogleAuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Wait for Supabase to process the OAuth callback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error('No session found after OAuth');
        }

        console.log('Session established for user:', session.user.id);

        // Check if user has completed business setup
        const { data: businessSettings } = await supabase
          .from('business_settings')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        // User is "new" if they don't have business settings (haven't completed onboarding)
        const isNewUser = !businessSettings;

        if (isNewUser) {
          console.log('New user detected (no business settings) - will redirect to onboarding');
        } else {
          console.log('Existing user with completed setup - will redirect to dashboard');
        }

        setStatus('success');
        
        // Send session tokens to parent window
        if (window.opener) {
          console.log('Sending session tokens to parent window');
          window.opener.postMessage({ 
            type: 'google-oauth-success',
            isNewUser,
            session: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              user: session.user
            }
          }, window.location.origin);
          
          // Keep popup open briefly to ensure message is sent
          await new Promise(resolve => setTimeout(resolve, 1000));
          window.close();
        } else {
          // Fallback for non-popup case (direct navigation to callback URL)
          const redirectPath = isNewUser ? '/onboarding' : '/dashboard';
          console.log(`Not a popup, redirecting to ${redirectPath}...`);
          
          // Set flag to prevent flicker during redirect
          sessionStorage.setItem('oauth_completing', 'true');
          
          setTimeout(() => {
            window.location.href = redirectPath;
          }, 1500);
        }

      } catch (err) {
        console.error('Google auth callback error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setStatus('error');
        
        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage({ 
            type: 'google-oauth-error', 
            error: errorMessage 
          }, window.location.origin);
          setTimeout(() => {
            window.close();
          }, 2000);
        }
      }
    };

    handleCallback();
  }, [navigate]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
            <CardTitle>Completing Sign In</CardTitle>
            <CardDescription>
              Please wait while we complete your Google sign-in...
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
            <CardTitle className="text-green-900">Sign In Successful!</CardTitle>
            <CardDescription>
              You've successfully signed in with Google. This window will close shortly...
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
          <CardTitle className="text-red-900">Sign In Failed</CardTitle>
          <CardDescription>
            There was an error signing in with Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
            {error}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthCallback;
