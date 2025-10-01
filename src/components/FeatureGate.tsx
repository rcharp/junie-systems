import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureAccess, getRequiredPlanForFeature } from "@/lib/subscription-utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface FeatureGateProps {
  feature: keyof FeatureAccess;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradeMessage?: boolean;
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showUpgradeMessage = true 
}: FeatureGateProps) => {
  const { checkFeature, isLoading } = useSubscription();
  const navigate = useNavigate();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const hasAccess = checkFeature(feature);

  if (isLoading) {
    return null;
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgradeMessage) {
      const requiredPlan = getRequiredPlanForFeature(feature);
      return (
        <>
          <div className="border border-primary/50 bg-primary/5 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span>
                This feature requires the <strong>{requiredPlan}</strong> plan or higher.
              </span>
              <Button 
                size="sm" 
                onClick={() => setShowUpgradeDialog(true)}
                className="ml-4"
              >
                Upgrade
              </Button>
            </div>
          </div>

          <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Upgrade Required</AlertDialogTitle>
                <AlertDialogDescription>
                  This feature is available on the {requiredPlan} plan. Upgrade your plan to access this feature.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setShowUpgradeDialog(false);
                  navigate('/pricing');
                }}>
                  View Plans
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      );
    }

    return null;
  }

  return <>{children}</>;
};
