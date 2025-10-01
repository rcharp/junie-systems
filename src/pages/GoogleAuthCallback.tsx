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
        // Wait a moment for the URL hash to be processed by Supabase
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the session after OAuth redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error('No session found after OAuth');
        }

        console.log('Session established for user:', session.user.id);

        // Create user profile if it doesn't exist
        const { data: existingProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!existingProfile) {
          console.log('Creating new user profile...');
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
              subscription_plan: 'free',
              subscription_status: 'active',
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            throw profileError;
          }
          console.log('User profile created successfully');
        }

        // Get the selected business data from sessionStorage
        const selectedBusinessData = sessionStorage.getItem('selectedBusiness');
        
        if (selectedBusinessData) {
          try {
            const businessData = JSON.parse(selectedBusinessData);
            console.log('Creating business settings with data:', businessData);
            
            // Check if business settings already exist
            const { data: existingSettings } = await supabase
              .from('business_settings')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (!existingSettings) {
              // Create business settings with the selected business data
              const { error: businessError } = await supabase
                .from('business_settings')
                .insert({
                  user_id: session.user.id,
                  business_name: businessData.name,
                  business_phone: businessData.phone,
                  business_address: businessData.address,
                  business_website: businessData.website,
                  business_hours: businessData.openingHours?.join('\n'),
                  business_type: businessData.types?.[0] || 'general',
                });

              if (businessError) {
                console.error('Error creating business settings:', businessError);
                throw businessError;
              }
              console.log('Business settings created successfully');
            } else {
              console.log('Business settings already exist');
            }
          } catch (parseError) {
            console.error('Error parsing business data:', parseError);
          }
        }

        setStatus('success');
        
        // For full page redirects (not popup), navigate to settings
        console.log('OAuth complete, redirecting to settings...');
        setTimeout(() => {
          window.location.href = '/settings';
        }, 1500);

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
