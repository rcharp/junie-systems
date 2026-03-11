// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type TrialStatus = 'active' | 'ending_soon' | 'grace_period' | 'expired';

export interface TrialInfo {
  status: TrialStatus;
  trialEndsAt: Date | null;
  daysRemaining: number;
  isInGracePeriod: boolean;
  gracePeriodEndsAt: Date | null;
}

const TRIAL_WARNING_DAYS = 3; // Show warning when 3 days or less remaining
const GRACE_PERIOD_DAYS = 3; // 3-day grace period after trial ends

export const useTrialStatus = () => {
  const { user } = useAuth();

  const { data: trialInfo, isLoading } = useQuery({
    queryKey: ["trial-status", user?.id],
    queryFn: async (): Promise<TrialInfo> => {
      if (!user?.id) {
        return {
          status: 'expired',
          trialEndsAt: null,
          daysRemaining: 0,
          isInGracePeriod: false,
          gracePeriodEndsAt: null,
        };
      }
      
      const { data, error } = await supabase
        .from("user_profiles")
        .select("trial_ends_at, subscription_plan, subscription_status")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // If user has a paid subscription, they're not in trial
      if (data.subscription_plan !== 'free' && data.subscription_status === 'active') {
        return {
          status: 'active',
          trialEndsAt: null,
          daysRemaining: 0,
          isInGracePeriod: false,
          gracePeriodEndsAt: null,
        };
      }

      const now = new Date();
      const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      
      if (!trialEndsAt) {
        return {
          status: 'expired',
          trialEndsAt: null,
          daysRemaining: 0,
          isInGracePeriod: false,
          gracePeriodEndsAt: null,
        };
      }

      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const gracePeriodEndsAt = new Date(trialEndsAt.getTime() + (GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000));
      const isInGracePeriod = now > trialEndsAt && now <= gracePeriodEndsAt;
      const isFullyExpired = now > gracePeriodEndsAt;

      let status: TrialStatus;
      if (isFullyExpired) {
        status = 'expired';
      } else if (isInGracePeriod) {
        status = 'grace_period';
      } else if (daysRemaining <= TRIAL_WARNING_DAYS) {
        status = 'ending_soon';
      } else {
        status = 'active';
      }

      return {
        status,
        trialEndsAt,
        daysRemaining: Math.max(0, daysRemaining),
        isInGracePeriod,
        gracePeriodEndsAt,
      };
    },
    enabled: !!user?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  return {
    trialInfo,
    isLoading,
  };
};
