import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { useState } from 'react';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BillingSettings = () => {
  const { subscriptionPlan, subscriptionStatus, isLoading } = useSubscription();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const handleManageBilling = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-portal');

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal. Please try again.');
    } finally {
      setLoadingPortal(false);
    }
  };

  const getStatusBadge = () => {
    if (subscriptionStatus === 'active') {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>;
    }
    if (subscriptionStatus === 'canceled') {
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Canceled</Badge>;
    }
    if (subscriptionStatus === 'past_due') {
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Past Due</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const getPlanBadge = () => {
    const colors = {
      free: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      professional: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      scale: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      growth: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    };

    return (
      <Badge variant="outline" className={colors[subscriptionPlan as keyof typeof colors]}>
        {subscriptionPlan.charAt(0).toUpperCase() + subscriptionPlan.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing & Subscription
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <p className="text-sm font-medium">Current Plan</p>
            <div className="flex items-center gap-2">
              {getPlanBadge()}
              {getStatusBadge()}
            </div>
          </div>
          {subscriptionPlan !== 'free' && (
            <Button 
              variant="outline" 
              onClick={handleManageBilling}
              disabled={loadingPortal}
            >
              {loadingPortal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Manage Billing
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>

        {subscriptionStatus === 'past_due' && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">
              Payment Required
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Your payment is past due. Please update your payment method to continue using premium features.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={handleManageBilling}
            >
              Update Payment Method
            </Button>
          </div>
        )}

        {subscriptionPlan === 'free' && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">
              Upgrade Your Plan
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock advanced features like analytics, call transfers, and appointment scheduling.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => navigate('/pricing')}
            >
              View Plans
            </Button>
          </div>
        )}

        {subscriptionPlan !== 'free' && subscriptionStatus === 'active' && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Billing Portal</p>
            <p className="text-sm text-muted-foreground">
              Manage your subscription, update payment methods, view invoices, and more through the Stripe billing portal.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
