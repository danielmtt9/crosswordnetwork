import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompetitiveChallenge from './CompetitiveChallenge';

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

describe('CompetitiveChallenge', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockChallenges = [
    {
      id: 'challenge1',
      name: 'Speed Challenge',
      description: 'Complete 10 puzzles in under 5 minutes each',
      type: 'speed',
      target: 10,
      duration: 24,
      participants: [
        {
          userId: 'user1',
          userName: 'Alice',
          userAvatar: 'https://example.com/alice.jpg',
          progress: 8,
          rank: 1,
          isCurrentUser: false,
        },
        {
          userId: 'user2',
          userName: 'Bob',
          userAvatar: 'https://example.com/bob.jpg',
          progress: 6,
          rank: 2,
          isCurrentUser: true,
        },
      ],
      status: 'active',
      startTime: '2024-01-15T10:00:00Z',
      endTime: '2024-01-16T10:00:00Z',
      reward: {
        points: 500,
        badge: 'Speed Demon',
      },
    },
    {
      id: 'challenge2',
      name: 'Accuracy Challenge',
      description: 'Maintain 95% accuracy for 20 puzzles',
      type: 'accuracy',
      target: 20,
      duration: 48,
      participants: [
        {
          userId: 'user3',
          userName: 'Charlie',
          userAvatar: 'https://example.com/charlie.jpg',
          progress: 15,
          rank: 1,
          isCurrentUser: false,
        },
      ],
      status: 'upcoming',
      startTime: '2024-01-17T10:00:00Z',
      endTime: '2024-01-19T10:00:00Z',
      reward: {
        points: 750,
        badge: 'Precision Master',
      },
    },
  ];

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenges: mockChallenges }),
    });

    render(<CompetitiveChallenge />);
    
    expect(screen.getByText('Competitive Challenges')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render challenges when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenges: mockChallenges }),
    });

    render(<CompetitiveChallenge />);

    await waitFor(() => {
      expect(screen.getByText('Speed Challenge')).toBeInTheDocument();
      expect(screen.getByText('Accuracy Challenge')).toBeInTheDocument();
    });

    expect(screen.getByText('Complete 10 puzzles in under 5 minutes each')).toBeInTheDocument();
    expect(screen.getByText('Maintain 95% accuracy for 20 puzzles')).toBeInTheDocument();
  });

  it('should show create challenge form when create button is clicked', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenges: [] }),
    });

    render(<CompetitiveChallenge />);

    const createButton = screen.getByText('Create Challenge');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Challenge')).toBeInTheDocument();
    expect(screen.getByLabelText('Challenge Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('should create a new challenge when form is submitted', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenges: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, challenge: mockChallenges[0] }),
      });

    render(<CompetitiveChallenge />);

    const createButton = screen.getByText('Create Challenge');
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText('Challenge Name');
    const descriptionInput = screen.getByLabelText('Description');
    const typeSelect = screen.getByLabelText('Challenge Type');
    const targetInput = screen.getByLabelText('Target');
    const durationInput = screen.getByLabelText('Duration (hours)');

    fireEvent.change(nameInput, { target: { value: 'Test Challenge' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.change(typeSelect, { target: { value: 'puzzle_count' } });
    fireEvent.change(targetInput, { target: { value: '5' } });
    fireEvent.change(durationInput, { target: { value: '12' } });

    const submitButton = screen.getByText('Create Challenge');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Challenge',
          description: 'Test Description',
          type: 'puzzle_count',
          target: 5,
          duration: 12,
        }),
      });
    });
  });

  it('should join a challenge when join button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ challenges: [mockChallenges[1]] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, participant: mockChallenges[1].participants[0] }),
      });

    render(<CompetitiveChallenge />);

    await waitFor(() => {
      expect(screen.getByText('Accuracy Challenge')).toBeInTheDocument();
    });

    const joinButton = screen.getByText('Join Challenge');
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/challenges/challenge2/join', {
        method: 'POST',
      });
    });
  });

  it('should render challenge status correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenges: mockChallenges }),
    });

    render(<CompetitiveChallenge />);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Upcoming')).toBeInTheDocument();
    });
  });

  it('should render participant progress correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenges: mockChallenges }),
    });

    render(<CompetitiveChallenge />);

    await waitFor(() => {
      expect(screen.getByText('8/10')).toBeInTheDocument();
      expect(screen.getByText('6/10')).toBeInTheDocument();
    });
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<CompetitiveChallenge />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load challenges')).toBeInTheDocument();
    });
  });

  it('should show empty state when no challenges', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ challenges: [] }),
    });

    render(<CompetitiveChallenge />);

    await waitFor(() => {
      expect(screen.getByText('No challenges found')).toBeInTheDocument();
      expect(screen.getByText('Create the first challenge to get started!')).toBeInTheDocument();
    });
  });
});
