export type SubscriptionPlan = 'free' | 'starter' | 'growth' | 'enterprise';

export interface FeatureAccess {
  messageCapture: boolean;
  callTranscription: boolean;
  spamDetection: boolean;
  realTimeNotifications: boolean;
  appointmentScheduling: boolean;
  callTransfers: boolean;
  sendTexts: boolean;
  advancedAnalytics: boolean;
  prioritySupport: boolean;
  liveTransfers: boolean;
  trainingFiles: boolean;
  multiplePhoneNumbers: boolean;
  crmIntegrations: boolean;
  teamCollaboration: boolean;
  whiteLabel: boolean;
  dedicatedManager: boolean;
}

const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

const FEATURE_TIER_MAP: Record<keyof FeatureAccess, SubscriptionPlan> = {
  // Starter tier features
  messageCapture: 'starter',
  callTranscription: 'starter',
  spamDetection: 'starter',
  realTimeNotifications: 'starter',
  
  // Growth tier features
  appointmentScheduling: 'growth',
  callTransfers: 'growth',
  sendTexts: 'growth',
  advancedAnalytics: 'growth',
  prioritySupport: 'growth',
  
  // Enterprise tier features
  liveTransfers: 'enterprise',
  trainingFiles: 'enterprise',
  multiplePhoneNumbers: 'enterprise',
  crmIntegrations: 'enterprise',
  teamCollaboration: 'enterprise',
  whiteLabel: 'enterprise',
  dedicatedManager: 'enterprise',
};

export const hasFeatureAccess = (
  userPlan: SubscriptionPlan,
  feature: keyof FeatureAccess,
  isAdmin: boolean = false
): boolean => {
  // Admins have access to all features
  if (isAdmin) return true;
  
  const requiredPlan = FEATURE_TIER_MAP[feature];
  const userTier = PLAN_HIERARCHY[userPlan] || 0;
  const requiredTier = PLAN_HIERARCHY[requiredPlan];
  
  return userTier >= requiredTier;
};

export const getFeatureAccess = (
  userPlan: SubscriptionPlan,
  isAdmin: boolean = false
): FeatureAccess => {
  return {
    messageCapture: hasFeatureAccess(userPlan, 'messageCapture', isAdmin),
    callTranscription: hasFeatureAccess(userPlan, 'callTranscription', isAdmin),
    spamDetection: hasFeatureAccess(userPlan, 'spamDetection', isAdmin),
    realTimeNotifications: hasFeatureAccess(userPlan, 'realTimeNotifications', isAdmin),
    appointmentScheduling: hasFeatureAccess(userPlan, 'appointmentScheduling', isAdmin),
    callTransfers: hasFeatureAccess(userPlan, 'callTransfers', isAdmin),
    sendTexts: hasFeatureAccess(userPlan, 'sendTexts', isAdmin),
    advancedAnalytics: hasFeatureAccess(userPlan, 'advancedAnalytics', isAdmin),
    prioritySupport: hasFeatureAccess(userPlan, 'prioritySupport', isAdmin),
    liveTransfers: hasFeatureAccess(userPlan, 'liveTransfers', isAdmin),
    trainingFiles: hasFeatureAccess(userPlan, 'trainingFiles', isAdmin),
    multiplePhoneNumbers: hasFeatureAccess(userPlan, 'multiplePhoneNumbers', isAdmin),
    crmIntegrations: hasFeatureAccess(userPlan, 'crmIntegrations', isAdmin),
    teamCollaboration: hasFeatureAccess(userPlan, 'teamCollaboration', isAdmin),
    whiteLabel: hasFeatureAccess(userPlan, 'whiteLabel', isAdmin),
    dedicatedManager: hasFeatureAccess(userPlan, 'dedicatedManager', isAdmin),
  };
};

export const getPlanName = (plan: SubscriptionPlan): string => {
  const names: Record<SubscriptionPlan, string> = {
    free: 'Free Trial',
    starter: 'Starter',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };
  return names[plan] || 'Unknown';
};

export const getRequiredPlanForFeature = (feature: keyof FeatureAccess): string => {
  return getPlanName(FEATURE_TIER_MAP[feature]);
};
