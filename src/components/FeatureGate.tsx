import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { FeatureAccess, getRequiredPlanForFeature } from "@/lib/subscription-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
        <Alert className="border-primary/50 bg-primary/5">
          <Lock className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              This feature requires the <strong>{requiredPlan}</strong> plan or higher.
            </span>
            <Button 
              size="sm" 
              onClick={() => navigate("/#pricing")}
              className="ml-4"
            >
              Upgrade
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
};
