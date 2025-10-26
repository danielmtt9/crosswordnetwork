import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MultiplayerStatsDisplay } from './MultiplayerStatsDisplay';

// Mock fetch
global.fetch = jest.fn();

describe('MultiplayerStatsDisplay', () => {
  const mockStats = {
    roomsJoined: 25,
    roomsHosted: 5,
    roomsCompleted: 20,
    roomsSpectated: 3,
    totalMultiplayerTime: 7200,
    averageSessionDuration: 1800,
    uniquePlayersMet: 15,
    friendsPlayedWith: 8,
    multiplayerCompletionRate: 80.0,
    averageMultiplayerScore: 85.5,
    bestMultiplayerScore: 100,
    timesAsHost: 5,
    timesAsPlayer: 20,
    timesAsSpectator: 3,
    lastMultiplayerSession: new Date('2023-01-01T10:00:00Z'),
    currentStreak: 3,
    longestStreak: 7,
    multiplayerAchievementsEarned: 5,
    multiplayerAchievementPoints: 250
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<MultiplayerStatsDisplay userId="user1" />);

    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should render stats when loaded successfully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // roomsJoined
      expect(screen.getByText('Rooms Joined')).toBeInTheDocument();
    });

    expect(screen.getByText('Rooms Hosted')).toBeInTheDocument();
    expect(screen.getByText('Rooms Completed')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument(); // completionRate
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
  });

  it('should render role statistics', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Role Statistics')).toBeInTheDocument();
    });

    expect(screen.getByText('Times as Host')).toBeInTheDocument();
    expect(screen.getByText('Times as Player')).toBeInTheDocument();
    expect(screen.getByText('Times as Spectator')).toBeInTheDocument();
  });

  it('should render social metrics', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Social Metrics')).toBeInTheDocument();
    });

    expect(screen.getByText('Unique Players Met')).toBeInTheDocument();
    expect(screen.getByText('Friends Played With')).toBeInTheDocument();
  });

  it('should render performance metrics', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });

    expect(screen.getByText('Avg Score')).toBeInTheDocument();
    expect(screen.getByText('Best Score')).toBeInTheDocument();
    expect(screen.getByText('Avg Session')).toBeInTheDocument();
    expect(screen.getByText('Total Time')).toBeInTheDocument();
  });

  it('should render streak information', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Activity Streak')).toBeInTheDocument();
    });

    expect(screen.getByText('Current Streak (days)')).toBeInTheDocument();
    expect(screen.getByText('Longest Streak (days)')).toBeInTheDocument();
    expect(screen.getByText(/Last multiplayer session:/)).toBeInTheDocument();
  });

  it('should render achievement summary', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeInTheDocument();
    });

    expect(screen.getByText('Achievements Earned')).toBeInTheDocument();
    expect(screen.getByText('Achievement Points')).toBeInTheDocument();
  });

  it('should handle fetch errors', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading stats: Network error')).toBeInTheDocument();
    });
  });

  it('should handle API errors', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading stats: Failed to fetch stats')).toBeInTheDocument();
    });
  });

  it('should show no stats message when stats are null', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: null })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('No multiplayer stats available')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: mockStats })
    });

    const { container } = render(
      <MultiplayerStatsDisplay userId="user1" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should format duration correctly', async () => {
    const statsWithVariousDurations = {
      ...mockStats,
      averageSessionDuration: 90, // 90 seconds
      totalMultiplayerTime: 3661 // 1 hour, 1 minute, 1 second
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: statsWithVariousDurations })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Avg Session')).toBeInTheDocument();
      expect(screen.getByText('Total Time')).toBeInTheDocument();
    });
  });

  it('should handle zero values correctly', async () => {
    const zeroStats = {
      ...mockStats,
      roomsJoined: 0,
      roomsHosted: 0,
      roomsCompleted: 0,
      totalMultiplayerTime: 0,
      averageSessionDuration: 0
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ stats: zeroStats })
    });

    render(<MultiplayerStatsDisplay userId="user1" />);

    await waitFor(() => {
      expect(screen.getByText('Rooms Joined')).toBeInTheDocument();
      expect(screen.getByText('Rooms Hosted')).toBeInTheDocument();
    });
  });
});
