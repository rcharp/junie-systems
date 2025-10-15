import { AlertCircle, Clock, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTrialStatus } from "@/hooks/useTrialStatus";

const TrialBanner = () => {
  const { trialInfo, isLoading } = useTrialStatus();
  const navigate = useNavigate();

  if (isLoading || !trialInfo) return null;

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  // Don't show banner if trial is fully active
  if (trialInfo.status === 'active' && trialInfo.daysRemaining > 3) {
    return null;
  }

  // Ending soon (3 days or less)
  if (trialInfo.status === 'ending_soon') {
    return (
      <Alert className="border-yellow-500/50 bg-yellow-500/10">
        <Clock className="h-4 w-4 text-yellow-500" />
        <AlertTitle className="text-yellow-500">Trial Ending Soon</AlertTitle>
        <AlertDescription className="text-yellow-500/90">
          Your 7-day free trial ends in {trialInfo.daysRemaining} {trialInfo.daysRemaining === 1 ? 'day' : 'days'}. 
          Add a payment method to continue using Junie AI after your trial.
          <div className="mt-2">
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Add Payment Method
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Grace period (3 days after trial)
  if (trialInfo.status === 'grace_period') {
    const graceDaysRemaining = trialInfo.gracePeriodEndsAt 
      ? Math.ceil((trialInfo.gracePeriodEndsAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertCircle className="h-4 w-4 text-orange-500" />
        <AlertTitle className="text-orange-500">Trial Expired - Grace Period Active</AlertTitle>
        <AlertDescription className="text-orange-500/90">
          Your trial has ended, but your service is still active for {graceDaysRemaining} more {graceDaysRemaining === 1 ? 'day' : 'days'}. 
          Add payment to avoid service interruption.
          <div className="mt-2">
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Add Payment Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Fully expired
  if (trialInfo.status === 'expired') {
    return (
      <Alert className="border-red-500/50 bg-red-500/10">
        <XCircle className="h-4 w-4 text-red-500" />
        <AlertTitle className="text-red-500">Service Suspended</AlertTitle>
        <AlertDescription className="text-red-500/90">
          Your trial and grace period have ended. AI call handling is currently disabled. 
          Add payment to reactivate your service immediately.
          <div className="mt-2">
            <Button 
              size="sm" 
              onClick={handleUpgrade}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reactivate Service
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export default TrialBanner;
