import { useState, useEffect, useCallback, useMemo } from 'react';

interface PremiumUpgradePromptState {
  isVisible: boolean;
  trigger: 'role_limit' | 'feature_restriction' | 'hint_limit' | 'export_restriction' | 'share_restriction' | 'analytics_restriction';
  currentFeature?: string;
  dismissed: boolean;
  lastShown?: Date;
  showCount: number;
}

interface PremiumUpgradePromptConfig {
  maxShowCount: number;
  cooldownMinutes: number;
  showDelay: number;
  autoHideDelay: number;
}

interface UsePremiumUpgradePromptProps {
  userRole: 'HOST' | 'MODERATOR' | 'PLAYER' | 'SPECTATOR';
  isPremium: boolean;
  roomParticipantCount: number;
  maxFreeParticipants: number;
  currentFeature?: string;
  config?: Partial<PremiumUpgradePromptConfig>;
}

interface UsePremiumUpgradePromptReturn {
  promptState: PremiumUpgradePromptState;
  showPrompt: (trigger: PremiumUpgradePromptState['trigger'], feature?: string) => void;
  hidePrompt: () => void;
  dismissPrompt: () => void;
  onUpgrade: () => void;
  onRemindLater: () => void;
  shouldShowPrompt: (trigger: PremiumUpgradePromptState['trigger']) => boolean;
  getPromptConfig: (trigger: PremiumUpgradePromptState['trigger']) => {
    title: string;
    description: string;
    features: string[];
  };
}

const defaultConfig: PremiumUpgradePromptConfig = {
  maxShowCount: 3,
  cooldownMinutes: 30,
  showDelay: 2000,
  autoHideDelay: 10000
};

const promptConfigs = {
  role_limit: {
    title: 'Unlock Premium Collaboration',
    description: 'Upgrade to premium to invite more players and collaborate with unlimited participants.',
    features: [
      'Invite up to 10 players per room',
      'Unlimited spectator access',
      'Advanced role management',
      'Priority support'
    ]
  },
  feature_restriction: {
    title: 'Premium Features Available',
    description: 'Access advanced puzzle features and collaboration tools with premium.',
    features: [
      'Advanced puzzle types',
      'Custom room settings',
      'Real-time collaboration',
      'Enhanced analytics'
    ]
  },
  hint_limit: {
    title: 'Unlimited Hints with Premium',
    description: 'Get unlimited hints and advanced puzzle assistance with premium.',
    features: [
      'Unlimited hints per puzzle',
      'Smart hint suggestions',
      'Advanced puzzle analysis',
      'Progress tracking'
    ]
  },
  export_restriction: {
    title: 'Export Puzzles with Premium',
    description: 'Save and share your favorite puzzles with premium export features.',
    features: [
      'Export puzzles to PDF',
      'Share custom puzzles',
      'Print high-quality puzzles',
      'Create puzzle collections'
    ]
  },
  share_restriction: {
    title: 'Share Puzzles with Premium',
    description: 'Share your puzzles and achievements with premium sharing features.',
    features: [
      'Share to social media',
      'Create puzzle challenges',
      'Public puzzle gallery',
      'Achievement sharing'
    ]
  },
  analytics_restriction: {
    title: 'Advanced Analytics with Premium',
    description: 'Get detailed insights into your puzzle-solving performance with premium analytics.',
    features: [
      'Detailed performance metrics',
      'Progress tracking',
      'Skill analysis',
      'Personalized recommendations'
    ]
  }
};

export function usePremiumUpgradePrompt({
  userRole,
  isPremium,
  roomParticipantCount,
  maxFreeParticipants,
  currentFeature,
  config = {}
}: UsePremiumUpgradePromptProps): UsePremiumUpgradePromptReturn {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [promptState, setPromptState] = useState<PremiumUpgradePromptState>({
    isVisible: false,
    trigger: 'feature_restriction',
    dismissed: false,
    showCount: 0
  });

  // Check if user should see upgrade prompts
  const shouldShowPrompts = useMemo(() => {
    return !isPremium && userRole !== 'SPECTATOR';
  }, [isPremium, userRole]);

  // Check if prompt should be shown based on trigger
  const shouldShowPrompt = useCallback((trigger: PremiumUpgradePromptState['trigger']) => {
    if (!shouldShowPrompts) return false;
    if (promptState.dismissed) return false;
    if (promptState.showCount >= finalConfig.maxShowCount) return false;

    // Check cooldown
    if (promptState.lastShown) {
      const timeSinceLastShown = Date.now() - promptState.lastShown.getTime();
      const cooldownMs = finalConfig.cooldownMinutes * 60 * 1000;
      if (timeSinceLastShown < cooldownMs) return false;
    }

    // Check specific triggers
    switch (trigger) {
      case 'role_limit':
        return roomParticipantCount >= maxFreeParticipants;
      case 'feature_restriction':
        return currentFeature !== undefined;
      case 'hint_limit':
        return true; // Always show for hint limits
      case 'export_restriction':
        return true; // Always show for export restrictions
      case 'share_restriction':
        return true; // Always show for share restrictions
      case 'analytics_restriction':
        return true; // Always show for analytics restrictions
      default:
        return false;
    }
  }, [
    shouldShowPrompts,
    promptState.dismissed,
    promptState.showCount,
    promptState.lastShown,
    finalConfig.maxShowCount,
    finalConfig.cooldownMinutes,
    roomParticipantCount,
    maxFreeParticipants,
    currentFeature
  ]);

  // Show prompt
  const showPrompt = useCallback((trigger: PremiumUpgradePromptState['trigger'], feature?: string) => {
    if (!shouldShowPrompt(trigger)) return;

    setPromptState(prev => ({
      ...prev,
      isVisible: true,
      trigger,
      currentFeature: feature,
      lastShown: new Date(),
      showCount: prev.showCount + 1
    }));

    // Auto-hide after delay
    setTimeout(() => {
      setPromptState(prev => ({
        ...prev,
        isVisible: false
      }));
    }, finalConfig.autoHideDelay);
  }, [shouldShowPrompt, finalConfig.autoHideDelay]);

  // Hide prompt
  const hidePrompt = useCallback(() => {
    setPromptState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    setPromptState(prev => ({
      ...prev,
      isVisible: false,
      dismissed: true
    }));
  }, []);

  // Handle upgrade
  const onUpgrade = useCallback(() => {
    // In a real implementation, this would redirect to the upgrade page
    console.log('Redirecting to upgrade page...');
    
    setPromptState(prev => ({
      ...prev,
      isVisible: false,
      dismissed: true
    }));
  }, []);

  // Handle remind later
  const onRemindLater = useCallback(() => {
    setPromptState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  // Get prompt configuration
  const getPromptConfig = useCallback((trigger: PremiumUpgradePromptState['trigger']) => {
    return promptConfigs[trigger];
  }, []);

  // Auto-trigger prompts based on conditions
  useEffect(() => {
    if (!shouldShowPrompts) return;

    // Check for role limit
    if (roomParticipantCount >= maxFreeParticipants) {
      showPrompt('role_limit');
    }

    // Check for feature restrictions
    if (currentFeature) {
      showPrompt('feature_restriction', currentFeature);
    }
  }, [shouldShowPrompts, roomParticipantCount, maxFreeParticipants, currentFeature, showPrompt]);

  // Reset dismissed state after cooldown
  useEffect(() => {
    if (promptState.dismissed && promptState.lastShown) {
      const timeSinceLastShown = Date.now() - promptState.lastShown.getTime();
      const cooldownMs = finalConfig.cooldownMinutes * 60 * 1000;
      
      if (timeSinceLastShown >= cooldownMs) {
        setPromptState(prev => ({
          ...prev,
          dismissed: false
        }));
      }
    }
  }, [promptState.dismissed, promptState.lastShown, finalConfig.cooldownMinutes]);

  return {
    promptState,
    showPrompt,
    hidePrompt,
    dismissPrompt,
    onUpgrade,
    onRemindLater,
    shouldShowPrompt,
    getPromptConfig
  };
}

// Hook for managing upgrade prompt analytics
export function useUpgradePromptAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalShown: 0,
    totalDismissed: 0,
    totalUpgraded: 0,
    totalRemindLater: 0,
    triggers: {
      role_limit: 0,
      feature_restriction: 0,
      hint_limit: 0,
      export_restriction: 0,
      share_restriction: 0,
      analytics_restriction: 0
    }
  });

  const trackPromptShown = useCallback((trigger: string) => {
    setAnalytics(prev => ({
      ...prev,
      totalShown: prev.totalShown + 1,
      triggers: {
        ...prev.triggers,
        [trigger]: prev.triggers[trigger as keyof typeof prev.triggers] + 1
      }
    }));
  }, []);

  const trackPromptDismissed = useCallback(() => {
    setAnalytics(prev => ({
      ...prev,
      totalDismissed: prev.totalDismissed + 1
    }));
  }, []);

  const trackPromptUpgraded = useCallback(() => {
    setAnalytics(prev => ({
      ...prev,
      totalUpgraded: prev.totalUpgraded + 1
    }));
  }, []);

  const trackPromptRemindLater = useCallback(() => {
    setAnalytics(prev => ({
      ...prev,
      totalRemindLater: prev.totalRemindLater + 1
    }));
  }, []);

  const getConversionRate = useCallback(() => {
    if (analytics.totalShown === 0) return 0;
    return (analytics.totalUpgraded / analytics.totalShown) * 100;
  }, [analytics]);

  const getDismissalRate = useCallback(() => {
    if (analytics.totalShown === 0) return 0;
    return (analytics.totalDismissed / analytics.totalShown) * 100;
  }, [analytics]);

  return {
    analytics,
    trackPromptShown,
    trackPromptDismissed,
    trackPromptUpgraded,
    trackPromptRemindLater,
    getConversionRate,
    getDismissalRate
  };
}
