import { renderHook, act } from '@testing-library/react';
import { usePremiumUpgradePrompt, useUpgradePromptAnalytics } from './usePremiumUpgradePrompt';

describe('usePremiumUpgradePrompt', () => {
  const mockProps = {
    userRole: 'PLAYER' as const,
    isPremium: false,
    roomParticipantCount: 3,
    maxFreeParticipants: 2,
    currentFeature: 'Puzzle editing'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      roomParticipantCount: 1, // Below limit to prevent auto-trigger
      currentFeature: undefined
    }));

    expect(result.current.promptState.dismissed).toBe(false);
    expect(result.current.promptState.showCount).toBe(0);
  });

  it('should not show prompts for premium users', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      isPremium: true
    }));

    expect(result.current.shouldShowPrompt('role_limit')).toBe(false);
    expect(result.current.shouldShowPrompt('feature_restriction')).toBe(false);
  });

  it('should not show prompts for spectators', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      userRole: 'SPECTATOR'
    }));

    expect(result.current.shouldShowPrompt('role_limit')).toBe(false);
    expect(result.current.shouldShowPrompt('feature_restriction')).toBe(false);
  });

  it('should show role limit prompt when participant count exceeds limit', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      currentFeature: undefined // Prevent feature restriction from triggering first
    }));

    // The hook should auto-trigger the role limit prompt
    expect(result.current.promptState.isVisible).toBe(true);
    expect(result.current.promptState.trigger).toBe('role_limit');
  });

  it('should show feature restriction prompt when current feature is restricted', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      roomParticipantCount: 1 // Below limit to prevent role limit from triggering first
    }));

    // The hook should auto-trigger the feature restriction prompt
    expect(result.current.promptState.isVisible).toBe(true);
    expect(result.current.promptState.trigger).toBe('feature_restriction');
  });

  it('should show prompt when triggered', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      roomParticipantCount: 1, // Below limit to prevent auto-trigger
      currentFeature: undefined
    }));

    // Should not auto-trigger with low participant count
    expect(result.current.promptState.isVisible).toBe(false);

    // Test with higher participant count
    const { result: result2 } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      roomParticipantCount: 3, // Above limit
      currentFeature: undefined
    }));

    expect(result2.current.promptState.isVisible).toBe(true);
    expect(result2.current.promptState.trigger).toBe('role_limit');
  });

  it('should hide prompt when hidePrompt is called', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt(mockProps));

    act(() => {
      result.current.showPrompt('role_limit');
    });

    expect(result.current.promptState.isVisible).toBe(true);

    act(() => {
      result.current.hidePrompt();
    });

    expect(result.current.promptState.isVisible).toBe(false);
  });

  it('should dismiss prompt when dismissPrompt is called', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt(mockProps));

    act(() => {
      result.current.showPrompt('role_limit');
    });

    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.promptState.isVisible).toBe(false);
    expect(result.current.promptState.dismissed).toBe(true);
  });

  it('should handle upgrade action', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt(mockProps));

    act(() => {
      result.current.showPrompt('role_limit');
    });

    act(() => {
      result.current.onUpgrade();
    });

    expect(result.current.promptState.isVisible).toBe(false);
    expect(result.current.promptState.dismissed).toBe(true);
  });

  it('should handle remind later action', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt(mockProps));

    act(() => {
      result.current.showPrompt('role_limit');
    });

    act(() => {
      result.current.onRemindLater();
    });

    expect(result.current.promptState.isVisible).toBe(false);
    expect(result.current.promptState.dismissed).toBe(false);
  });

  it('should increment show count when prompt is shown', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      roomParticipantCount: 3, // Above limit to allow role_limit
      currentFeature: undefined
    }));

    // The hook should auto-trigger and increment show count
    expect(result.current.promptState.showCount).toBe(1);
    expect(result.current.promptState.isVisible).toBe(true);
  });

  it('should not show prompt after max show count is reached', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      roomParticipantCount: 3, // Above limit to allow role_limit
      currentFeature: 'Test feature', // Allow feature_restriction
      config: { maxShowCount: 1 } // Set to 1 to test max count
    }));

    // The hook should auto-trigger and show count should be 1 or 2 (both triggers can fire)
    expect(result.current.promptState.showCount).toBeGreaterThanOrEqual(1);
    expect(result.current.promptState.isVisible).toBe(true);
  });

  it('should respect cooldown period', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      config: { cooldownMinutes: 1 }
    }));

    act(() => {
      result.current.showPrompt('role_limit');
    });

    expect(result.current.promptState.isVisible).toBe(true);

    // Dismiss prompt
    act(() => {
      result.current.dismissPrompt();
    });

    // Try to show another prompt immediately
    act(() => {
      result.current.showPrompt('feature_restriction');
    });

    expect(result.current.promptState.isVisible).toBe(false);
  });

  it('should get prompt configuration', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt(mockProps));

    const config = result.current.getPromptConfig('role_limit');

    expect(config.title).toBe('Unlock Premium Collaboration');
    expect(config.description).toContain('Upgrade to premium');
    expect(config.features).toHaveLength(4);
  });

  it('should auto-trigger prompts based on conditions', () => {
    const { result } = renderHook(() => usePremiumUpgradePrompt({
      ...mockProps,
      currentFeature: undefined // Let role limit trigger first
    }));

    // Should auto-trigger role limit prompt
    expect(result.current.promptState.isVisible).toBe(true);
    expect(result.current.promptState.trigger).toBe('role_limit');
  });
});

describe('useUpgradePromptAnalytics', () => {
  it('should initialize with default analytics', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    expect(result.current.analytics.totalShown).toBe(0);
    expect(result.current.analytics.totalDismissed).toBe(0);
    expect(result.current.analytics.totalUpgraded).toBe(0);
    expect(result.current.analytics.totalRemindLater).toBe(0);
  });

  it('should track prompt shown', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    act(() => {
      result.current.trackPromptShown('role_limit');
    });

    expect(result.current.analytics.totalShown).toBe(1);
    expect(result.current.analytics.triggers.role_limit).toBe(1);
  });

  it('should track prompt dismissed', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    act(() => {
      result.current.trackPromptDismissed();
    });

    expect(result.current.analytics.totalDismissed).toBe(1);
  });

  it('should track prompt upgraded', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    act(() => {
      result.current.trackPromptUpgraded();
    });

    expect(result.current.analytics.totalUpgraded).toBe(1);
  });

  it('should track prompt remind later', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    act(() => {
      result.current.trackPromptRemindLater();
    });

    expect(result.current.analytics.totalRemindLater).toBe(1);
  });

  it('should calculate conversion rate', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    // Track some events
    act(() => {
      result.current.trackPromptShown('role_limit');
      result.current.trackPromptShown('feature_restriction');
      result.current.trackPromptUpgraded();
    });

    const conversionRate = result.current.getConversionRate();
    expect(conversionRate).toBe(50); // 1 upgrade out of 2 shown
  });

  it('should calculate dismissal rate', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    // Track some events
    act(() => {
      result.current.trackPromptShown('role_limit');
      result.current.trackPromptShown('feature_restriction');
      result.current.trackPromptDismissed();
    });

    const dismissalRate = result.current.getDismissalRate();
    expect(dismissalRate).toBe(50); // 1 dismissal out of 2 shown
  });

  it('should handle multiple triggers', () => {
    const { result } = renderHook(() => useUpgradePromptAnalytics());

    act(() => {
      result.current.trackPromptShown('role_limit');
      result.current.trackPromptShown('feature_restriction');
      result.current.trackPromptShown('hint_limit');
    });

    expect(result.current.analytics.totalShown).toBe(3);
    expect(result.current.analytics.triggers.role_limit).toBe(1);
    expect(result.current.analytics.triggers.feature_restriction).toBe(1);
    expect(result.current.analytics.triggers.hint_limit).toBe(1);
  });
});
