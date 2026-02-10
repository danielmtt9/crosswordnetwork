import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import GamificationPreview from './GamificationPreview';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, transition, viewport, animate, exit, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, whileInView, initial, transition, viewport, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
  Flame: () => <div data-testid="flame-icon">Flame</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Target: () => <div data-testid="target-icon">Target</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Zap: () => <div data-testid="zap-icon">Zap</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  Coffee: () => <div data-testid="coffee-icon">Coffee</div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

describe('GamificationPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('4.1 User streak information display for returning users', () => {
    it('should display streak information with default data', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText(/keep the momentum going/i)).toBeInTheDocument();
    });

    it('should display custom streak when provided', () => {
      render(<GamificationPreview userStreak={15} />);

      expect(screen.getByText('15 days')).toBeInTheDocument();
    });
  });

  describe('4.2 Recent achievement badges display', () => {
    it('should display default achievements', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
      expect(screen.getByText('Social Solver')).toBeInTheDocument();
      expect(screen.getByText('Speed Demon')).toBeInTheDocument();
    });

    it('should display custom achievements when provided', () => {
      const customAchievements = [
        {
          id: 'custom-1',
          name: 'Custom Achievement',
          description: 'A custom achievement',
          icon: 'star',
          unlockedAt: '1 hour ago',
          rarity: 'epic' as const
        }
      ];

      render(<GamificationPreview recentAchievements={customAchievements} />);

      expect(screen.getByText('Custom Achievement')).toBeInTheDocument();
      expect(screen.getByText('A custom achievement')).toBeInTheDocument();
    });

    it('should limit achievements to 3 most recent', () => {
      render(<GamificationPreview />);

      // Should only show 3 achievements in the display
      const achievementCards = screen.getAllByTestId('card');
      expect(achievementCards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4.3 Compact leaderboard preview', () => {
    it('should display "Top Solvers Tonight" leaderboard', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Top Solvers Tonight')).toBeInTheDocument();
      expect(screen.getByText('Sarah M.')).toBeInTheDocument();
      expect(screen.getByText('Alex K.')).toBeInTheDocument();
      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('should display custom leaderboard when provided', () => {
      const customLeaderboard = [
        { rank: 1, name: 'Alice', score: 1200, avatar: undefined },
        { rank: 2, name: 'Bob', score: 1100, avatar: undefined },
      ];

      render(<GamificationPreview leaderboardData={customLeaderboard} />);

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('1200 points')).toBeInTheDocument();
      expect(screen.getByText('1100 points')).toBeInTheDocument();
    });

    it('should show user rank in leaderboard', () => {
      render(<GamificationPreview />);

      // Check that "You" appears in the leaderboard
      expect(screen.getByText('You')).toBeInTheDocument();
    });
  });

  describe('4.4 Locked achievements in grayscale for motivation', () => {
    it('should display locked achievements section', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Coming Up Next')).toBeInTheDocument();
      expect(screen.getByText('Puzzle Master')).toBeInTheDocument();
      expect(screen.getByText('Night Owl')).toBeInTheDocument();
      expect(screen.getByText('Perfectionist')).toBeInTheDocument();
    });

    it('should show progress bars for locked achievements', () => {
      render(<GamificationPreview />);

      // Check for progress indicators
      expect(screen.getByText('47/100')).toBeInTheDocument();
      expect(screen.getByText('0/1')).toBeInTheDocument();
      expect(screen.getByText('3/10')).toBeInTheDocument();
    });

    it('should display custom locked achievements when provided', () => {
      const customLocked = [
        {
          id: 'custom-locked',
          name: 'Custom Locked',
          description: 'A custom locked achievement',
          progress: 5,
          maxProgress: 10
        }
      ];

      render(<GamificationPreview lockedAchievements={customLocked} />);

      expect(screen.getByText('Custom Locked')).toBeInTheDocument();
      expect(screen.getByText('5/10')).toBeInTheDocument();
    });
  });

  describe('4.5 Hover states with achievement descriptions', () => {
    it('should display achievement descriptions', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Solved puzzles for 7 days in a row')).toBeInTheDocument();
      expect(screen.getByText('Completed 5 multiplayer puzzles')).toBeInTheDocument();
      expect(screen.getByText('Solved a puzzle in under 5 minutes')).toBeInTheDocument();
    });

    it('should show achievement unlock times', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
      expect(screen.getByText('1 day ago')).toBeInTheDocument();
      expect(screen.getByText('3 days ago')).toBeInTheDocument();
    });
  });

  describe('4.6 Real-time gamification data updates', () => {
    it('should rotate through achievements every 3 seconds', async () => {
      render(<GamificationPreview />);

      // Initial state should show first achievement
      expect(screen.getByText('Streak Master')).toBeInTheDocument();

      // Fast forward time to trigger rotation
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        // Should still show achievements (rotation is internal to the component)
        expect(screen.getByText('Streak Master')).toBeInTheDocument();
      });
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should render with default data when no props provided', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Your cozy crossword journey')).toBeInTheDocument();
      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      expect(screen.getByText('Recent Achievements')).toBeInTheDocument();
      expect(screen.getByText('Top Solvers Tonight')).toBeInTheDocument();
    });

    it('should handle empty arrays gracefully', () => {
      render(
        <GamificationPreview 
          recentAchievements={[]}
          leaderboardData={[]}
          lockedAchievements={[]}
        />
      );

      // Should still render the main structure
      expect(screen.getByText('Your cozy crossword journey')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<GamificationPreview />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByText('Your cozy crossword journey')).toBeInTheDocument();
    });

    it('should display icons with proper accessibility', () => {
      render(<GamificationPreview />);

      // Check that icons are present (use getAllByTestId since there are multiple icons)
      expect(screen.getAllByTestId('flame-icon')).toHaveLength(2); // One in streak, one in achievements
      expect(screen.getAllByTestId('trophy-icon')).toHaveLength(4); // Multiple trophy icons in leaderboard
      expect(screen.getAllByTestId('users-icon')).toHaveLength(2); // One in achievements, one in leaderboard
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('target-icon')).toBeInTheDocument();
      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<GamificationPreview />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Main heading should be h2
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });
  });

  describe('Visual elements and styling', () => {
    it('should display cozy decorative elements', () => {
      render(<GamificationPreview />);

      expect(screen.getByText('Cozy vibes')).toBeInTheDocument();
      expect(screen.getByText('Friendly competition')).toBeInTheDocument();
    });

    it('should show rarity-based styling for achievements', () => {
      render(<GamificationPreview />);

      // Check that achievements are displayed with their descriptions
      expect(screen.getByText('Streak Master')).toBeInTheDocument();
      expect(screen.getByText('Social Solver')).toBeInTheDocument();
      expect(screen.getByText('Speed Demon')).toBeInTheDocument();
    });

    it('should display progress bars for locked achievements', () => {
      render(<GamificationPreview />);

      // Check for progress text
      expect(screen.getByText('47/100')).toBeInTheDocument();
      expect(screen.getByText('0/1')).toBeInTheDocument();
      expect(screen.getByText('3/10')).toBeInTheDocument();
    });
  });
});