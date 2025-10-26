import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PremiumUpgradeIntegration } from './PremiumUpgradeIntegration';
import { usePuzzlePermissions } from '@/hooks/usePuzzlePermissions';
import { usePremiumUpgradePrompt } from '@/hooks/usePremiumUpgradePrompt';
import { useUpgradePromptAnalytics } from '@/hooks/usePremiumUpgradePrompt';

// Mock the hooks
jest.mock('@/hooks/usePuzzlePermissions');
jest.mock('@/hooks/usePremiumUpgradePrompt');
jest.mock('@/hooks/usePremiumUpgradePrompt', () => ({
  ...jest.requireActual('@/hooks/usePremiumUpgradePrompt'),
  useUpgradePromptAnalytics: jest.fn()
}));

const mockUsePuzzlePermissions = usePuzzlePermissions as jest.MockedFunction<typeof usePuzzlePermissions>;
const mockUsePremiumUpgradePrompt = usePremiumUpgradePrompt as jest.MockedFunction<typeof usePremiumUpgradePrompt>;
const mockUseUpgradePromptAnalytics = useUpgradePromptAnalytics as jest.MockedFunction<typeof useUpgradePromptAnalytics>;

const mockUserContext = {
  id: 'user1',
  role: 'PLAYER' as const,
  isHost: false,
  isModerator: false,
  isPremium: false,
  subscriptionStatus: 'TRIAL' as const
};

const mockRoomContext = {
  id: 'room1',
  currentPlayerCount: 3,
  maxPlayers: 10,
  isPrivate: false,
  hostId: 'host1'
};

const mockPuzzleContext = {
  id: 'puzzle1',
  isLocked: false,
  canCollaborate: true,
  hintsUsed: 2,
  maxHints: 5,
  isPublic: false
};

const mockPermissions = {
  canView: true,
  canEdit: true,
  canHint: true,
  canReveal: false,
  canReset: false,
  canShare: false,
  canExport: false,
  canModerate: false,
  canInvite: false,
  canKick: false,
  canChangeSettings: false,
  canViewAnalytics: false,
  canManageRoles: false
};

describe('PremiumUpgradeIntegration', () => {
  const mockProps = {
    userContext: mockUserContext,
    roomContext: mockRoomContext,
    puzzleContext: mockPuzzleContext,
    onUpgrade: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePuzzlePermissions.mockReturnValue({
      permissions: mockPermissions,
      isLoading: false,
      error: null,
      canPerform: jest.fn().mockReturnValue(true),
      getPermissionError: jest.fn().mockReturnValue(null),
      isEditDisabled: false,
      editTooltip: '',
      isHintDisabled: false,
      hintTooltip: '',
      isShareDisabled: false,
      shareTooltip: '',
      isExportDisabled: false,
      exportTooltip: ''
    });

    mockUsePremiumUpgradePrompt.mockReturnValue({
      promptState: {
        isVisible: false,
        trigger: 'feature_restriction',
        dismissed: false,
        showCount: 0
      },
      showPrompt: jest.fn(),
      hidePrompt: jest.fn(),
      dismissPrompt: jest.fn(),
      onUpgrade: jest.fn(),
      onRemindLater: jest.fn(),
      shouldShowPrompt: jest.fn().mockReturnValue(true),
      getPromptConfig: jest.fn().mockReturnValue({
        title: 'Test Title',
        description: 'Test Description',
        features: ['Feature 1', 'Feature 2']
      })
    });

    mockUseUpgradePromptAnalytics.mockReturnValue({
      analytics: {
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
      },
      trackPromptShown: jest.fn(),
      trackPromptDismissed: jest.fn(),
      trackPromptUpgraded: jest.fn(),
      trackPromptRemindLater: jest.fn(),
      getConversionRate: jest.fn().mockReturnValue(0),
      getDismissalRate: jest.fn().mockReturnValue(0)
    });
  });

  it('should render premium upgrade integration', () => {
    render(<PremiumUpgradeIntegration {...mockProps} />);

    // Should render without errors
    expect(screen.getByTestId('premium-upgrade-integration')).toBeInTheDocument();
  });

  it('should show main upgrade prompt when visible', () => {
    mockUsePremiumUpgradePrompt.mockReturnValue({
      ...mockUsePremiumUpgradePrompt(),
      promptState: {
        isVisible: true,
        trigger: 'role_limit',
        dismissed: false,
        showCount: 1
      }
    });

    render(<PremiumUpgradeIntegration {...mockProps} />);

    expect(screen.getByText('Unlock Premium Collaboration')).toBeInTheDocument();
  });

  it('should show compact prompt for spectator mode', () => {
    const spectatorUserContext = {
      ...mockUserContext,
      role: 'SPECTATOR' as const
    };

    const spectatorPermissions = {
      ...mockPermissions,
      canEdit: false
    };

    mockUsePuzzlePermissions.mockReturnValue({
      ...mockUsePuzzlePermissions(),
      permissions: spectatorPermissions
    });

    render(<PremiumUpgradeIntegration {...mockProps} userContext={spectatorUserContext} />);

    expect(screen.getByText('Premium Features Available')).toBeInTheDocument();
  });

  it('should show progress prompt for hint limits', () => {
    const hintLimitPuzzleContext = {
      ...mockPuzzleContext,
      hintsUsed: 3,
      maxHints: 5
    };

    const hintLimitPermissions = {
      ...mockPermissions,
      canHint: false
    };

    mockUsePuzzlePermissions.mockReturnValue({
      ...mockUsePuzzlePermissions(),
      permissions: hintLimitPermissions
    });

    render(<PremiumUpgradeIntegration {...mockProps} puzzleContext={hintLimitPuzzleContext} />);

    expect(screen.getByText('Free limit reached')).toBeInTheDocument();
    expect(screen.getByText('Hints')).toBeInTheDocument();
  });

  it('should show compact prompt for share restrictions', () => {
    const shareRestrictedPermissions = {
      ...mockPermissions,
      canShare: false
    };

    const publicPuzzleContext = {
      ...mockPuzzleContext,
      isPublic: false
    };

    mockUsePuzzlePermissions.mockReturnValue({
      ...mockUsePuzzlePermissions(),
      permissions: shareRestrictedPermissions
    });

    render(<PremiumUpgradeIntegration {...mockProps} puzzleContext={publicPuzzleContext} />);

    expect(screen.getByText('Share Puzzles with Premium')).toBeInTheDocument();
  });

  it('should show compact prompt for export restrictions', () => {
    const exportRestrictedPermissions = {
      ...mockPermissions,
      canExport: false
    };

    const privatePuzzleContext = {
      ...mockPuzzleContext,
      isPublic: false
    };

    mockUsePuzzlePermissions.mockReturnValue({
      ...mockUsePuzzlePermissions(),
      permissions: exportRestrictedPermissions
    });

    render(<PremiumUpgradeIntegration {...mockProps} puzzleContext={privatePuzzleContext} />);

    expect(screen.getByText('Export Puzzles with Premium')).toBeInTheDocument();
  });

  it('should handle upgrade action', () => {
    render(<PremiumUpgradeIntegration {...mockProps} />);

    const upgradeButton = screen.getByText('Upgrade to Premium');
    fireEvent.click(upgradeButton);

    expect(mockProps.onUpgrade).toHaveBeenCalled();
  });

  it('should handle dismiss action', () => {
    render(<PremiumUpgradeIntegration {...mockProps} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(mockUsePremiumUpgradePrompt().dismissPrompt).toHaveBeenCalled();
  });

  it('should handle remind later action', () => {
    render(<PremiumUpgradeIntegration {...mockProps} />);

    const remindLaterButton = screen.getByText('Remind Later');
    fireEvent.click(remindLaterButton);

    expect(mockUsePremiumUpgradePrompt().onRemindLater).toHaveBeenCalled();
  });

  it('should track analytics events', () => {
    render(<PremiumUpgradeIntegration {...mockProps} />);

    expect(mockUseUpgradePromptAnalytics().trackPromptShown).toHaveBeenCalled();
  });

  it('should handle premium users without showing prompts', () => {
    const premiumUserContext = {
      ...mockUserContext,
      isPremium: true
    };

    render(<PremiumUpgradeIntegration {...mockProps} userContext={premiumUserContext} />);

    // Should not show any upgrade prompts for premium users
    expect(screen.queryByText('Upgrade to Premium')).not.toBeInTheDocument();
  });

  it('should handle different user roles', () => {
    const hostUserContext = {
      ...mockUserContext,
      role: 'HOST' as const,
      isHost: true
    };

    render(<PremiumUpgradeIntegration {...mockProps} userContext={hostUserContext} />);

    // Should render without errors for different roles
    expect(screen.getByTestId('premium-upgrade-integration')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    mockUsePuzzlePermissions.mockReturnValue({
      ...mockUsePuzzlePermissions(),
      isLoading: true
    });

    render(<PremiumUpgradeIntegration {...mockProps} />);

    // Should render without errors even when loading
    expect(screen.getByTestId('premium-upgrade-integration')).toBeInTheDocument();
  });

  it('should handle error state', () => {
    mockUsePuzzlePermissions.mockReturnValue({
      ...mockUsePuzzlePermissions(),
      error: 'Permission check failed'
    });

    render(<PremiumUpgradeIntegration {...mockProps} />);

    // Should render without errors even when there's an error
    expect(screen.getByTestId('premium-upgrade-integration')).toBeInTheDocument();
  });
});
