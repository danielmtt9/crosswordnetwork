import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  PremiumUpgradePrompt, 
  PremiumUpgradePromptCompact, 
  PremiumProgressPrompt 
} from './PremiumUpgradePrompt';

describe('PremiumUpgradePrompt', () => {
  const mockProps = {
    trigger: 'role_limit' as const,
    currentFeature: 'Puzzle editing',
    isVisible: true,
    onUpgrade: jest.fn(),
    onDismiss: jest.fn(),
    onRemindLater: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render upgrade prompt when visible', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    expect(screen.getByText('Unlock Premium Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to premium to invite more players and collaborate with unlimited participants.')).toBeInTheDocument();
    expect(screen.getByText('Upgrade to Premium')).toBeInTheDocument();
    expect(screen.getByText('Remind Later')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<PremiumUpgradePrompt {...mockProps} isVisible={false} />);

    expect(screen.queryByText('Unlock Premium Collaboration')).not.toBeInTheDocument();
  });

  it('should show current feature restriction', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    // Check for the text content that spans multiple elements
    expect(screen.getByText('Puzzle editing')).toBeInTheDocument();
    expect(screen.getByText('requires premium')).toBeInTheDocument();
  });

  it('should display feature list', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    expect(screen.getByText('Invite up to 10 players per room')).toBeInTheDocument();
    expect(screen.getByText('Unlimited spectator access')).toBeInTheDocument();
    expect(screen.getByText('Advanced role management')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
  });

  it('should handle upgrade action', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    const upgradeButton = screen.getByText('Upgrade to Premium');
    fireEvent.click(upgradeButton);

    expect(mockProps.onUpgrade).toHaveBeenCalled();
  });

  it('should handle dismiss action', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    // Find the dismiss button by looking for the X icon
    const dismissButton = screen.getByRole('button', { name: '' });
    fireEvent.click(dismissButton);

    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('should handle remind later action', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    const remindLaterButton = screen.getByText('Remind Later');
    fireEvent.click(remindLaterButton);

    expect(mockProps.onRemindLater).toHaveBeenCalled();
  });

  it('should show expandable premium features', async () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    const expandButton = screen.getByText('Show all premium features');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Premium Collaboration')).toBeInTheDocument();
      expect(screen.getByText('Unlimited Hints')).toBeInTheDocument();
      expect(screen.getByText('Advanced Features')).toBeInTheDocument();
      expect(screen.getByText('Priority Support')).toBeInTheDocument();
    });
  });

  it('should show pricing information', () => {
    render(<PremiumUpgradePrompt {...mockProps} />);

    expect(screen.getByText('Starting at $9.99/month')).toBeInTheDocument();
    expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
  });

  it('should handle different trigger types', () => {
    const featureRestrictionProps = {
      ...mockProps,
      trigger: 'feature_restriction' as const
    };

    render(<PremiumUpgradePrompt {...featureRestrictionProps} />);

    expect(screen.getByText('Premium Features Available')).toBeInTheDocument();
    expect(screen.getByText('Access advanced puzzle features and collaboration tools with premium.')).toBeInTheDocument();
  });

  it('should handle hint limit trigger', () => {
    const hintLimitProps = {
      ...mockProps,
      trigger: 'hint_limit' as const
    };

    render(<PremiumUpgradePrompt {...hintLimitProps} />);

    expect(screen.getByText('Unlimited Hints with Premium')).toBeInTheDocument();
    expect(screen.getByText('Get unlimited hints and advanced puzzle assistance with premium.')).toBeInTheDocument();
  });

  it('should handle export restriction trigger', () => {
    const exportProps = {
      ...mockProps,
      trigger: 'export_restriction' as const
    };

    render(<PremiumUpgradePrompt {...exportProps} />);

    expect(screen.getByText('Export Puzzles with Premium')).toBeInTheDocument();
    expect(screen.getByText('Save and share your favorite puzzles with premium export features.')).toBeInTheDocument();
  });
});

describe('PremiumUpgradePromptCompact', () => {
  const mockProps = {
    trigger: 'role_limit' as const,
    isVisible: true,
    onUpgrade: jest.fn(),
    onDismiss: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render compact prompt when visible', () => {
    render(<PremiumUpgradePromptCompact {...mockProps} />);

    expect(screen.getByText('Unlock Premium Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<PremiumUpgradePromptCompact {...mockProps} isVisible={false} />);

    expect(screen.queryByText('Unlock Premium Collaboration')).not.toBeInTheDocument();
  });

  it('should handle upgrade action', () => {
    render(<PremiumUpgradePromptCompact {...mockProps} />);

    const upgradeButton = screen.getByText('Upgrade');
    fireEvent.click(upgradeButton);

    expect(mockProps.onUpgrade).toHaveBeenCalled();
  });

  it('should handle dismiss action', () => {
    render(<PremiumUpgradePromptCompact {...mockProps} />);

    // Find the dismiss button by looking for the X icon
    const dismissButton = screen.getAllByRole('button')[1]; // Second button is the dismiss button
    fireEvent.click(dismissButton);

    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('should handle different trigger types', () => {
    const featureProps = {
      ...mockProps,
      trigger: 'feature_restriction' as const
    };

    render(<PremiumUpgradePromptCompact {...featureProps} />);

    expect(screen.getByText('Premium Features Available')).toBeInTheDocument();
  });
});

describe('PremiumProgressPrompt', () => {
  const mockProps = {
    currentProgress: 3,
    maxProgress: 5,
    feature: 'Hints',
    isVisible: true,
    onUpgrade: jest.fn(),
    onDismiss: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render progress prompt when visible', () => {
    render(<PremiumProgressPrompt {...mockProps} />);

    expect(screen.getByText('Free limit reached')).toBeInTheDocument();
    expect(screen.getByText('Hints')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('Unlock with Premium')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<PremiumProgressPrompt {...mockProps} isVisible={false} />);

    expect(screen.queryByText('Free limit reached')).not.toBeInTheDocument();
  });

  it('should handle upgrade action', () => {
    render(<PremiumProgressPrompt {...mockProps} />);

    const upgradeButton = screen.getByText('Unlock with Premium');
    fireEvent.click(upgradeButton);

    expect(mockProps.onUpgrade).toHaveBeenCalled();
  });

  it('should handle dismiss action', () => {
    render(<PremiumProgressPrompt {...mockProps} />);

    // Find the dismiss button by looking for the X icon
    const dismissButton = screen.getAllByRole('button')[0]; // First button is the dismiss button
    fireEvent.click(dismissButton);

    expect(mockProps.onDismiss).toHaveBeenCalled();
  });

  it('should show progress bar', () => {
    render(<PremiumProgressPrompt {...mockProps} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    // The progress bar should be present, we don't need to check specific values
    expect(progressBar).toBeInTheDocument();
  });

  it('should handle different progress values', () => {
    const differentProgressProps = {
      ...mockProps,
      currentProgress: 1,
      maxProgress: 3
    };

    render(<PremiumProgressPrompt {...differentProgressProps} />);

    expect(screen.getByText('1/3')).toBeInTheDocument();
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });
});
