// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { getFeatureAccess, hasFeatureAccess, SubscriptionPlan, FeatureAccess } from "@/lib/subscription-utils";

export const useSubscription = () => {
  const { user } = useAuth();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_profiles")
        .select("subscription_plan, subscription_status")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = rolesData?.some(role => role.role === 'admin') || false;
  const subscriptionPlan = (profileData?.subscription_plan || 'free') as SubscriptionPlan;
  const subscriptionStatus = profileData?.subscription_status || 'active';
  const isActive = subscriptionStatus === 'active';

  const featureAccess = getFeatureAccess(subscriptionPlan, isAdmin);

  const checkFeature = (feature: keyof FeatureAccess): boolean => {
    return hasFeatureAccess(subscriptionPlan, feature, isAdmin);
  };

  return {
    subscriptionPlan,
    subscriptionStatus,
    isActive,
    isAdmin,
    featureAccess,
    checkFeature,
    isLoading: profileLoading || rolesLoading,
  };
};
