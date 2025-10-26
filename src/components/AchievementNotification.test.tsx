import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AchievementNotification, useAchievementNotifications } from './AchievementNotification';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockAchievement = {
  id: 'test-achievement-1',
  key: 'first_puzzle',
  name: 'First Puzzle',
  description: 'Complete your first puzzle',
  category: 'COMPLETION',
  tier: 'BRONZE',
  points: 10,
  iconName: 'Trophy',
  earnedAt: '2024-01-15T10:30:00Z',
};

describe('AchievementNotification', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  it('should render achievement notification', () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    expect(screen.getByText('First Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Complete your first puzzle')).toBeInTheDocument();
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
    expect(screen.getByText('COMPLETION')).toBeInTheDocument();
  });

  it('should call onDismiss when close button is clicked', async () => {
    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    // Wait for the animation to complete and onDismiss to be called
    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should auto-hide after duration', async () => {
    jest.useFakeTimers();

    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={mockOnDismiss}
        autoHide={true}
        duration={1000}
      />
    );

    // Fast-forward time
    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  it('should not auto-hide when autoHide is false', async () => {
    jest.useFakeTimers();

    render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={mockOnDismiss}
        autoHide={false}
        duration={1000}
      />
    );

    // Fast-forward time
    jest.advanceTimersByTime(2000);

    expect(mockOnDismiss).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('should render different tier colors', () => {
    const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];

    tiers.forEach(tier => {
      const achievement = {
        ...mockAchievement,
        tier,
      };

      const { unmount } = render(
        <AchievementNotification
          achievement={achievement}
          onDismiss={mockOnDismiss}
        />
      );

      expect(screen.getByText(tier)).toBeInTheDocument();
      unmount();
    });
  });

  it('should handle missing description', () => {
    const achievementWithoutDescription = {
      ...mockAchievement,
      description: null,
    };

    render(
      <AchievementNotification
        achievement={achievementWithoutDescription}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('First Puzzle')).toBeInTheDocument();
    expect(screen.queryByText('Complete your first puzzle')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <AchievementNotification
        achievement={mockAchievement}
        onDismiss={mockOnDismiss}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should render with different icons', () => {
    const icons = ['Trophy', 'Award', 'Crown', 'Star', 'Zap', 'Target', 'Users', 'Shield', 'Sparkles'];

    icons.forEach(iconName => {
      const achievement = {
        ...mockAchievement,
        iconName,
      };

      const { unmount } = render(
        <AchievementNotification
          achievement={achievement}
          onDismiss={mockOnDismiss}
        />
      );

      // The icon should be rendered (we can't easily test the specific icon component)
      expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
      unmount();
    });
  });
});

describe('useAchievementNotifications', () => {
  it('should manage notification state', () => {
    const TestComponent = () => {
      const { notifications, addNotification, removeNotification, clearAll } = useAchievementNotifications();

      return (
        <div>
          <div data-testid="count">{notifications.length}</div>
          <button onClick={() => addNotification(mockAchievement)}>Add</button>
          <button onClick={() => removeNotification(mockAchievement.id)}>Remove</button>
          <button onClick={clearAll}>Clear</button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');

    // Add notification
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    // Remove notification
    fireEvent.click(screen.getByText('Remove'));
    expect(screen.getByText('0')).toBeInTheDocument();

    // Add multiple notifications
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('count')).toHaveTextContent('2');

    // Clear all
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});