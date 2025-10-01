export type SubscriptionPlan = 'free' | 'professional' | 'scale' | 'growth';

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
  professional: 1,
  scale: 2,
  growth: 3,
};

const FEATURE_TIER_MAP: Record<keyof FeatureAccess, SubscriptionPlan> = {
  // Professional tier features
  messageCapture: 'professional',
  callTranscription: 'professional',
  spamDetection: 'professional',
  realTimeNotifications: 'professional',
  
  // Scale tier features
  appointmentScheduling: 'scale',
  callTransfers: 'scale',
  sendTexts: 'scale',
  advancedAnalytics: 'scale',
  prioritySupport: 'scale',
  
  // Growth tier features
  liveTransfers: 'growth',
  trainingFiles: 'growth',
  multiplePhoneNumbers: 'growth',
  crmIntegrations: 'growth',
  teamCollaboration: 'growth',
  whiteLabel: 'growth',
  dedicatedManager: 'growth',
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
    professional: 'Professional',
    scale: 'Scale',
    growth: 'Growth',
  };
  return names[plan] || 'Unknown';
};

export const getRequiredPlanForFeature = (feature: keyof FeatureAccess): string => {
  return getPlanName(FEATURE_TIER_MAP[feature]);
};
