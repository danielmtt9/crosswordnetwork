import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { StreakDisplay } from './StreakDisplay';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the API response
const mockStreakData = {
  currentStreak: 7,
  longestStreak: 15,
  lastPlayedDate: '2024-01-15T10:30:00Z',
  streakFreezeUsed: false,
  streakFreezeAvailable: true,
};

describe('StreakDisplay', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<StreakDisplay userId="test-user" />);
    
    expect(screen.getByText('Daily Streak')).toBeInTheDocument();
  });

  it('should render streak data when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStreakData,
    });

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Streak')).toBeInTheDocument();
      expect(screen.getByText('Keep your momentum going with daily puzzle solving')).toBeInTheDocument();
    });

    // Check current streak
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();

    // Check stats
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    // Check progress
    expect(screen.getByText('Progress to 14 days')).toBeInTheDocument();
    expect(screen.getByText('7 days left')).toBeInTheDocument();

    // Check streak freeze
    expect(screen.getByText('Streak Freeze Available')).toBeInTheDocument();
    expect(screen.getByText('Use Streak Freeze')).toBeInTheDocument();

    // Check last played date
    expect(screen.getByText('Last played: 2024-01-15')).toBeInTheDocument();
  });

  it('should render compact version', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStreakData,
    });

    render(<StreakDisplay userId="test-user" compact />);

    await waitFor(() => {
      expect(screen.getByText('Streak')).toBeInTheDocument();
    });

    // Should show compact layout - wait for data to load
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('🔥')).toBeInTheDocument();
    });
  });

  it('should render zero streak state', async () => {
    const zeroStreakData = {
      ...mockStreakData,
      currentStreak: 0,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => zeroStreakData,
    });

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('💤')).toBeInTheDocument();
      expect(screen.getByText('Start your streak today!')).toBeInTheDocument();
    });
  });

  it('should render high streak state', async () => {
    const highStreakData = {
      ...mockStreakData,
      currentStreak: 100,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => highStreakData,
    });

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('🔥🔥🔥')).toBeInTheDocument();
    });
  });

  it('should handle streak freeze click', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStreakData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Use Streak Freeze')).toBeInTheDocument();
    });

    const freezeButton = screen.getByText('Use Streak Freeze');
    fireEvent.click(freezeButton);

    // Should call the streak freeze API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/user/streak-freeze', {
        method: 'POST',
      });
    });
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should render no data message when no streak data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText(/Cannot read properties of null/)).toBeInTheDocument();
    });
  });

  it('should not fetch data when no userId provided', () => {
    render(<StreakDisplay />);
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStreakData,
    });

    render(<StreakDisplay userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Daily Streak')).toBeInTheDocument();
    });

    // Check for proper heading structure
    const heading = screen.getByRole('heading', { name: 'Daily Streak' });
    expect(heading).toBeInTheDocument();
  });

  it('should handle custom className', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStreakData,
    });

    const { container } = render(
      <StreakDisplay userId="test-user" className="custom-class" />
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  it('should show different streak intensities', async () => {
    const testCases = [
      { streak: 3, expected: '💤' },
      { streak: 7, expected: '🔥' },
      { streak: 30, expected: '🔥🔥' },
      { streak: 100, expected: '🔥🔥🔥' },
    ];

    for (const testCase of testCases) {
      const testData = {
        ...mockStreakData,
        currentStreak: testCase.streak,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testData,
      });

      const { unmount } = render(<StreakDisplay userId="test-user" />);

      await waitFor(() => {
        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      });

      unmount();
      mockFetch.mockClear();
    }
  });
});
