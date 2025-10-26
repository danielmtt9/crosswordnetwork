import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeamAchievements from './TeamAchievements';

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

describe('TeamAchievements', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockTeamData = {
    achievements: [
      {
        id: 'team-achievement-1',
        name: 'Team First',
        description: 'Complete first puzzle as a team',
        icon: '🎯',
        points: 200,
        tier: 'bronze',
        category: 'completion',
        unlockedAt: '2024-01-15T10:00:00Z',
        unlockedBy: {
          userId: 'user1',
          userName: 'Alice',
          userAvatar: 'https://example.com/alice.jpg',
        },
      },
      {
        id: 'team-achievement-2',
        name: 'Speed Demons',
        description: 'Complete 10 puzzles in under 3 minutes each',
        icon: '⚡',
        points: 500,
        tier: 'gold',
        category: 'speed',
        unlockedAt: '2024-01-16T15:30:00Z',
        unlockedBy: {
          userId: 'user2',
          userName: 'Bob',
          userAvatar: 'https://example.com/bob.jpg',
        },
      },
    ],
    stats: {
      totalPuzzles: 25,
      totalPoints: 1500,
      averageAccuracy: 92.5,
      averageTime: 180,
      streak: 7,
      rank: 3,
    },
    members: [
      {
        userId: 'user1',
        userName: 'Alice',
        userAvatar: 'https://example.com/alice.jpg',
        role: 'leader',
        joinedAt: '2024-01-01T00:00:00Z',
        contribution: 45,
      },
      {
        userId: 'user2',
        userName: 'Bob',
        userAvatar: 'https://example.com/bob.jpg',
        role: 'member',
        joinedAt: '2024-01-05T00:00:00Z',
        contribution: 35,
      },
      {
        userId: 'user3',
        userName: 'Charlie',
        userAvatar: 'https://example.com/charlie.jpg',
        role: 'member',
        joinedAt: '2024-01-10T00:00:00Z',
        contribution: 20,
      },
    ],
  };

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamData,
    });

    render(<TeamAchievements teamId="team1" />);
    
    expect(screen.getByText('Team Achievements')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render team achievements when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamData,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('Team First')).toBeInTheDocument();
      expect(screen.getByText('Speed Demons')).toBeInTheDocument();
    });

    expect(screen.getByText('Complete first puzzle as a team')).toBeInTheDocument();
    expect(screen.getByText('Complete 10 puzzles in under 3 minutes each')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('should render team stats correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamData,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // totalPuzzles
      expect(screen.getByText('1,500')).toBeInTheDocument(); // totalPoints
      expect(screen.getByText('92.5%')).toBeInTheDocument(); // averageAccuracy
      expect(screen.getByText('3:00')).toBeInTheDocument(); // averageTime
      expect(screen.getByText('7')).toBeInTheDocument(); // streak
      expect(screen.getByText('#3')).toBeInTheDocument(); // rank
    });
  });

  it('should render team members correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamData,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    expect(screen.getByText('Leader')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });

  it('should render achievement unlock information', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamData,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('Unlocked by Alice')).toBeInTheDocument();
      expect(screen.getByText('Unlocked by Bob')).toBeInTheDocument();
    });
  });

  it('should render different tier colors correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTeamData,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      const bronzeAchievement = screen.getByText('200 points');
      const goldAchievement = screen.getByText('500 points');
      
      expect(bronzeAchievement).toHaveClass('text-amber-600');
      expect(goldAchievement).toHaveClass('text-yellow-500');
    });
  });

  it('should render empty state when no achievements', async () => {
    const emptyData = {
      achievements: [],
      stats: {
        totalPuzzles: 0,
        totalPoints: 0,
        averageAccuracy: 0,
        averageTime: 0,
        streak: 0,
        rank: 0,
      },
      members: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('No team achievements yet')).toBeInTheDocument();
      expect(screen.getByText('Start playing together to earn team achievements!')).toBeInTheDocument();
    });
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load team achievements')).toBeInTheDocument();
    });
  });

  it('should format time correctly', async () => {
    const dataWithDifferentTimes = {
      ...mockTeamData,
      stats: {
        ...mockTeamData.stats,
        averageTime: 125, // 2 minutes 5 seconds
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithDifferentTimes,
    });

    render(<TeamAchievements teamId="team1" />);

    await waitFor(() => {
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });
  });

  it('should handle missing team ID', () => {
    render(<TeamAchievements teamId="" />);
    
    expect(screen.getByText('Team ID is required')).toBeInTheDocument();
  });
});
