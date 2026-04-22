// @ts-nocheck
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StripeCustomers } from '@/components/StripeCustomers';
import { supabase } from '@/integrations/supabase/client';
import { handleRobustSignOut } from '@/lib/auth-utils';

const CustomersPage = () => {
  const { user, isAdmin, loading, adminLoading, setSigningOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading || (user && adminLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle overflow-x-hidden">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-primary">Customers</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Badge variant="secondary" className="hidden sm:flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Access
            </Badge>
            <Badge variant="outline" className="max-w-48 truncate hidden sm:inline-flex">
              {user?.email}
            </Badge>
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await handleRobustSignOut(supabase, setSigningOut);
                } catch {
                  window.location.href = '/';
                }
              }}
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-x-hidden">
        <StripeCustomers />
      </main>
    </div>
  );
};

export default CustomersPage;
