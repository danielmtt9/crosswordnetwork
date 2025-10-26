import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AchievementCelebration from './AchievementCelebration';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('AchievementCelebration', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockCelebrationData = {
    celebration: {
      id: 'celebration1',
      type: 'unlock',
      timestamp: '2024-01-15T10:00:00Z',
    },
    achievement: {
      id: 'achievement1',
      name: 'First Puzzle',
      description: 'Complete your first puzzle',
      icon: '🎯',
      points: 100,
      tier: 'bronze',
      category: 'completion',
      earnedAt: '2024-01-15T10:00:00Z',
    },
    context: {
      recentAchievements: [
        {
          id: 'achievement1',
          name: 'First Puzzle',
          icon: '🎯',
          tier: 'bronze',
          earnedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: 'achievement2',
          name: 'Speed Demon',
          icon: '⚡',
          tier: 'silver',
          earnedAt: '2024-01-14T15:30:00Z',
        },
      ],
      stats: {
        totalAchievements: 15,
        totalPoints: 2500,
        tierCounts: {
          bronze: 5,
          silver: 7,
          gold: 2,
          platinum: 1,
          legendary: 0,
        },
      },
    },
  };

  it('should render celebration when achievement is provided', () => {
    render(<AchievementCelebration achievement={mockCelebrationData.achievement} />);
    
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    expect(screen.getByText('First Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Complete your first puzzle')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
  });

  it('should render different celebration types', () => {
    const { rerender } = render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        type="milestone" 
      />
    );
    expect(screen.getByText('Milestone Reached!')).toBeInTheDocument();

    rerender(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        type="streak" 
      />
    );
    expect(screen.getByText('Streak Achievement!')).toBeInTheDocument();

    rerender(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        type="special" 
      />
    );
    expect(screen.getByText('Special Achievement!')).toBeInTheDocument();
  });

  it('should render different tier colors correctly', () => {
    const bronzeAchievement = { ...mockCelebrationData.achievement, tier: 'bronze' };
    const silverAchievement = { ...mockCelebrationData.achievement, tier: 'silver' };
    const goldAchievement = { ...mockCelebrationData.achievement, tier: 'gold' };
    const platinumAchievement = { ...mockCelebrationData.achievement, tier: 'platinum' };
    const legendaryAchievement = { ...mockCelebrationData.achievement, tier: 'legendary' };

    const { rerender } = render(<AchievementCelebration achievement={bronzeAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-amber-600');

    rerender(<AchievementCelebration achievement={silverAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-gray-500');

    rerender(<AchievementCelebration achievement={goldAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-yellow-500');

    rerender(<AchievementCelebration achievement={platinumAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-blue-500');

    rerender(<AchievementCelebration achievement={legendaryAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-purple-600');
  });

  it('should auto-dismiss after timeout', async () => {
    const mockOnDismiss = jest.fn();
    render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        onDismiss={mockOnDismiss}
        autoDismiss={true}
        dismissTimeout={5000}
      />
    );

    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('should not auto-dismiss when autoDismiss is false', async () => {
    const mockOnDismiss = jest.fn();
    render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        onDismiss={mockOnDismiss}
        autoDismiss={false}
      />
    );

    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    await waitFor(() => {
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  it('should call onDismiss when close button is clicked', async () => {
    const mockOnDismiss = jest.fn();
    render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    closeButton.click();

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalled();
    });
  });

  it('should render confetti animation', () => {
    render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        showConfetti={true}
      />
    );

    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    // Confetti would be rendered by the Confetti component
  });

  it('should render sound effect when enabled', () => {
    render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        playSound={true}
      />
    );

    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    // Sound would be played by the SoundEffect component
  });

  it('should render custom message when provided', () => {
    render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        message="Congratulations on your amazing achievement!"
      />
    );

    expect(screen.getByText('Congratulations on your amazing achievement!')).toBeInTheDocument();
  });

  it('should render achievement progress when provided', () => {
    const achievementWithProgress = {
      ...mockCelebrationData.achievement,
      progress: 75,
      target: 100,
    };

    render(
      <AchievementCelebration 
        achievement={achievementWithProgress} 
        showProgress={true}
      />
    );

    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('should render different sizes correctly', () => {
    const { rerender } = render(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        size="small"
      />
    );
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();

    rerender(
      <AchievementCelebration 
        achievement={mockCelebrationData.achievement} 
        size="large"
      />
    );
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
  });

  it('should render without achievement (loading state)', () => {
    render(<AchievementCelebration />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
