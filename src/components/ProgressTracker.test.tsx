import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ProgressTracker } from './ProgressTracker';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the API response
const mockProgressData = {
  totalPuzzlesCompleted: 25,
  totalPuzzlesStarted: 30,
  averageAccuracy: 95.5,
  averageCompletionTime: 1800, // 30 minutes
  currentStreak: 7,
  longestStreak: 15,
  achievementPoints: 150,
  globalRank: 42,
  lastPlayedDate: '2024-01-15T10:30:00Z',
};

describe('ProgressTracker', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should render loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<ProgressTracker userId="test-user" />);
    
    expect(screen.getByText('Progress Overview')).toBeInTheDocument();
    // Loading state shows skeleton elements, not specific text
  });

  it('should render progress data when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProgressData,
    });

    render(<ProgressTracker userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Progress Overview')).toBeInTheDocument();
      expect(screen.getByText('Track your crossword solving journey')).toBeInTheDocument();
    });

    // Check completion rate
    expect(screen.getByText('25 / 30')).toBeInTheDocument();
    expect(screen.getByText('83.3% of started puzzles completed')).toBeInTheDocument();

    // Check stats
    expect(screen.getByText('95.5%')).toBeInTheDocument();
    expect(screen.getByText('30:00')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();

    // Check streak info
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('15 days')).toBeInTheDocument();

    // Check last played date
    expect(screen.getByText('Last played: 2024-01-15')).toBeInTheDocument();
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<ProgressTracker userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should render no data message when no progress data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<ProgressTracker userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('No progress data available')).toBeInTheDocument();
    });
  });

  it('should handle zero values gracefully', async () => {
    const zeroData = {
      totalPuzzlesCompleted: 0,
      totalPuzzlesStarted: 0,
      averageAccuracy: 0,
      averageCompletionTime: 0,
      currentStreak: 0,
      longestStreak: 0,
      achievementPoints: 0,
      globalRank: null,
      lastPlayedDate: null,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => zeroData,
    });

    render(<ProgressTracker userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('0 / 0')).toBeInTheDocument();
      expect(screen.getByText('0.0% of started puzzles completed')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('0:00')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  it('should not fetch data when no userId provided', () => {
    render(<ProgressTracker />);
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should have proper accessibility attributes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProgressData,
    });

    render(<ProgressTracker userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Progress Overview')).toBeInTheDocument();
    });

    // Check for proper heading structure
    const heading = screen.getByRole('heading', { name: 'Progress Overview' });
    expect(heading).toBeInTheDocument();
  });

  it('should format time correctly', async () => {
    const timeData = {
      ...mockProgressData,
      averageCompletionTime: 3661, // 1 hour, 1 minute, 1 second
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => timeData,
    });

    render(<ProgressTracker userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('61:01')).toBeInTheDocument();
    });
  });

  it('should handle custom className', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProgressData,
    });

    const { container } = render(
      <ProgressTracker userId="test-user" className="custom-class" />
    );

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
