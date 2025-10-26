import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FriendLeaderboard } from './FriendLeaderboard';

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

describe('FriendLeaderboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockLeaderboardData = {
    leaderboard: [
      {
        rank: 1,
        userId: 'user1',
        userName: 'Alice',
        userAvatar: 'https://example.com/alice.jpg',
        score: 1500,
        isCurrentUser: false,
      },
      {
        rank: 2,
        userId: 'user2',
        userName: 'Bob',
        userAvatar: 'https://example.com/bob.jpg',
        score: 1200,
        isCurrentUser: true,
      },
      {
        rank: 3,
        userId: 'user3',
        userName: 'Charlie',
        userAvatar: 'https://example.com/charlie.jpg',
        score: 900,
        isCurrentUser: false,
      },
    ],
    currentUserRank: 2,
    totalFriends: 3,
  };

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeaderboardData,
    });

    render(<FriendLeaderboard />);
    
    expect(screen.getByText('Friend Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render leaderboard data when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeaderboardData,
    });

    render(<FriendLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.getByText('2nd')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('1,200')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
  });

  it('should highlight current user', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockLeaderboardData,
    });

    render(<FriendLeaderboard />);

    await waitFor(() => {
      const currentUserRow = screen.getByText('Bob').closest('tr');
      expect(currentUserRow).toHaveClass('bg-blue-50');
    });
  });

  it('should render empty state when no friends', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        leaderboard: [],
        currentUserRank: 0,
        totalFriends: 0,
      }),
    });

    render(<FriendLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('No friends found')).toBeInTheDocument();
      expect(screen.getByText('Add friends to see how you compare!')).toBeInTheDocument();
    });
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<FriendLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load friend leaderboard')).toBeInTheDocument();
    });
  });

  it('should render different rank formats correctly', async () => {
    const dataWithDifferentRanks = {
      leaderboard: [
        { rank: 1, userId: 'user1', userName: 'First', userAvatar: '', score: 1000, isCurrentUser: false },
        { rank: 2, userId: 'user2', userName: 'Second', userAvatar: '', score: 900, isCurrentUser: false },
        { rank: 3, userId: 'user3', userName: 'Third', userAvatar: '', score: 800, isCurrentUser: false },
        { rank: 4, userId: 'user4', userName: 'Fourth', userAvatar: '', score: 700, isCurrentUser: false },
        { rank: 5, userId: 'user5', userName: 'Fifth', userAvatar: '', score: 600, isCurrentUser: false },
      ],
      currentUserRank: 0,
      totalFriends: 5,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => dataWithDifferentRanks,
    });

    render(<FriendLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText('1st')).toBeInTheDocument();
      expect(screen.getByText('2nd')).toBeInTheDocument();
      expect(screen.getByText('3rd')).toBeInTheDocument();
      expect(screen.getByText('4th')).toBeInTheDocument();
      expect(screen.getByText('5th')).toBeInTheDocument();
    });
  });
});
