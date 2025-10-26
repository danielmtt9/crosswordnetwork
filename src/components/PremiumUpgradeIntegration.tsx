import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { PremiumUpgradePrompt, PremiumUpgradePromptCompact, PremiumProgressPrompt } from './PremiumUpgradePrompt';
import { usePremiumUpgradePrompt, useUpgradePromptAnalytics } from '@/hooks/usePremiumUpgradePrompt';
import { usePuzzlePermissions } from '@/hooks/usePuzzlePermissions';
import { UserContext, RoomContext, PuzzleContext } from '@/lib/puzzlePermissions';

interface PremiumUpgradeIntegrationProps {
  userContext: UserContext;
  roomContext: RoomContext;
  puzzleContext: PuzzleContext;
  onUpgrade: () => void;
  className?: string;
}

export function PremiumUpgradeIntegration({
  userContext,
  roomContext,
  puzzleContext,
  onUpgrade,
  className
}: PremiumUpgradeIntegrationProps) {
  const { permissions } = usePuzzlePermissions({
    userContext,
    roomContext,
    puzzleContext
  });

  const {
    promptState,
    showPrompt,
    hidePrompt,
    dismissPrompt,
    onUpgrade: handleUpgrade,
    onRemindLater,
    shouldShowPrompt,
    getPromptConfig
  } = usePremiumUpgradePrompt({
    userRole: userContext.role,
    isPremium: userContext.isPremium,
    roomParticipantCount: roomContext.currentPlayerCount,
    maxFreeParticipants: 2, // Free users can have 2 players
    currentFeature: getCurrentFeature(),
    config: {
      maxShowCount: 3,
      cooldownMinutes: 30,
      showDelay: 2000,
      autoHideDelay: 10000
    }
  });

  const {
    trackPromptShown,
    trackPromptDismissed,
    trackPromptUpgraded,
    trackPromptRemindLater
  } = useUpgradePromptAnalytics();

  // Determine current feature restriction
  function getCurrentFeature(): string | undefined {
    if (!permissions.canEdit && userContext.role === 'SPECTATOR') {
      return 'Puzzle editing';
    }
    if (!permissions.canHint && puzzleContext.hintsUsed >= Math.floor(puzzleContext.maxHints * 0.5)) {
      return 'Additional hints';
    }
    if (!permissions.canShare && !puzzleContext.isPublic) {
      return 'Puzzle sharing';
    }
    if (!permissions.canExport && !puzzleContext.isPublic) {
      return 'Puzzle export';
    }
    if (!permissions.canViewAnalytics) {
      return 'Analytics dashboard';
    }
    return undefined;
  }

  // Track prompt events
  useEffect(() => {
    if (promptState.isVisible) {
      trackPromptShown(promptState.trigger);
    }
  }, [promptState.isVisible, promptState.trigger, trackPromptShown]);

  const handleUpgradeClick = () => {
    trackPromptUpgraded();
    handleUpgrade();
    onUpgrade();
  };

  const handleDismiss = () => {
    trackPromptDismissed();
    dismissPrompt();
  };

  const handleRemindLater = () => {
    trackPromptRemindLater();
    onRemindLater();
  };

  // Show prompts based on permission restrictions
  useEffect(() => {
    if (!userContext.isPremium) {
      // Role limit prompt
      if (roomContext.currentPlayerCount >= 2 && shouldShowPrompt('role_limit')) {
        showPrompt('role_limit');
      }

      // Feature restriction prompt
      const currentFeature = getCurrentFeature();
      if (currentFeature && shouldShowPrompt('feature_restriction')) {
        showPrompt('feature_restriction', currentFeature);
      }

      // Hint limit prompt
      if (puzzleContext.hintsUsed >= Math.floor(puzzleContext.maxHints * 0.5) && shouldShowPrompt('hint_limit')) {
        showPrompt('hint_limit');
      }

      // Export restriction prompt
      if (!permissions.canExport && shouldShowPrompt('export_restriction')) {
        showPrompt('export_restriction');
      }

      // Share restriction prompt
      if (!permissions.canShare && shouldShowPrompt('share_restriction')) {
        showPrompt('share_restriction');
      }

      // Analytics restriction prompt
      if (!permissions.canViewAnalytics && shouldShowPrompt('analytics_restriction')) {
        showPrompt('analytics_restriction');
      }
    }
  }, [
    userContext.isPremium,
    roomContext.currentPlayerCount,
    puzzleContext.hintsUsed,
    puzzleContext.maxHints,
    permissions.canExport,
    permissions.canShare,
    permissions.canViewAnalytics,
    shouldShowPrompt,
    showPrompt
  ]);

  return (
    <div className={className} data-testid="premium-upgrade-integration">
      {/* Main upgrade prompt */}
      {promptState.isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="mb-4"
        >
          <PremiumUpgradePrompt
            trigger={promptState.trigger}
            currentFeature={promptState.currentFeature}
            isVisible={promptState.isVisible}
            onUpgrade={handleUpgradeClick}
            onDismiss={handleDismiss}
            onRemindLater={handleRemindLater}
          />
        </motion.div>
      )}

      {/* Compact prompts for specific features */}
      {!permissions.canEdit && userContext.role === 'SPECTATOR' && (
        <PremiumUpgradePromptCompact
          trigger="feature_restriction"
          isVisible={true}
          onUpgrade={handleUpgradeClick}
          onDismiss={handleDismiss}
          className="mb-2"
        />
      )}

      {!permissions.canHint && puzzleContext.hintsUsed >= Math.floor(puzzleContext.maxHints * 0.5) && (
        <PremiumProgressPrompt
          currentProgress={puzzleContext.hintsUsed}
          maxProgress={Math.floor(puzzleContext.maxHints * 0.5)}
          feature="Hints"
          isVisible={true}
          onUpgrade={handleUpgradeClick}
          onDismiss={handleDismiss}
          className="mb-2"
        />
      )}

      {!permissions.canShare && !puzzleContext.isPublic && (
        <PremiumUpgradePromptCompact
          trigger="share_restriction"
          isVisible={true}
          onUpgrade={handleUpgradeClick}
          onDismiss={handleDismiss}
          className="mb-2"
        />
      )}

      {!permissions.canExport && !puzzleContext.isPublic && (
        <PremiumUpgradePromptCompact
          trigger="export_restriction"
          isVisible={true}
          onUpgrade={handleUpgradeClick}
          onDismiss={handleDismiss}
          className="mb-2"
        />
      )}
    </div>
  );
}

// Hook for managing upgrade prompt context
export function useUpgradePromptContext() {
  const {
    promptState,
    showPrompt,
    hidePrompt,
    dismissPrompt,
    onUpgrade,
    onRemindLater,
    shouldShowPrompt,
    getPromptConfig
  } = usePremiumUpgradePrompt({
    userRole: 'PLAYER',
    isPremium: false,
    roomParticipantCount: 0,
    maxFreeParticipants: 2
  });

  const {
    analytics,
    trackPromptShown,
    trackPromptDismissed,
    trackPromptUpgraded,
    trackPromptRemindLater,
    getConversionRate,
    getDismissalRate
  } = useUpgradePromptAnalytics();

  return {
    promptState,
    showPrompt,
    hidePrompt,
    dismissPrompt,
    onUpgrade,
    onRemindLater,
    shouldShowPrompt,
    getPromptConfig,
    analytics,
    trackPromptShown,
    trackPromptDismissed,
    trackPromptUpgraded,
    trackPromptRemindLater,
    getConversionRate,
    getDismissalRate
  };
}
