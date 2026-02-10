import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AchievementAnalytics } from './AchievementAnalytics';

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

// Mock window.URL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
  writable: true,
});

describe('AchievementAnalytics', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockAnalyticsData = {
    completionRates: [
      {
        category: 'completion',
        completionRate: 75.5,
        totalUsers: 1000,
        completedUsers: 755,
      },
      {
        category: 'speed',
        completionRate: 45.2,
        totalUsers: 1000,
        completedUsers: 452,
      },
    ],
    engagementMetrics: {
      totalAchievements: 50,
      averageCompletionTime: 15.5,
      mostPopularAchievement: 'First Puzzle',
      leastPopularAchievement: 'Speed Demon',
      dailyActiveUsers: 250,
      weeklyActiveUsers: 800,
      monthlyActiveUsers: 1200,
    },
    difficultyAnalysis: [
      {
        tier: 'bronze',
        completionRate: 80.0,
        averageTime: 10.5,
        userCount: 800,
      },
      {
        tier: 'gold',
        completionRate: 25.0,
        averageTime: 45.2,
        userCount: 250,
      },
    ],
    userSegmentation: [
      {
        segment: 'casual',
        userCount: 500,
        averageAchievements: 5.2,
        engagementScore: 65.5,
      },
      {
        segment: 'hardcore',
        userCount: 200,
        averageAchievements: 25.8,
        engagementScore: 95.2,
      },
    ],
    trendData: [
      {
        date: '2024-01-15',
        achievementsUnlocked: 45,
        newUsers: 12,
        activeUsers: 180,
      },
      {
        date: '2024-01-16',
        achievementsUnlocked: 52,
        newUsers: 15,
        activeUsers: 195,
      },
    ],
  };

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);
    
    expect(screen.getByText('Achievement Analytics')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive analytics and reporting')).toBeInTheDocument();
  });

  it('should render analytics data when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument(); // totalAchievements
      expect(screen.getByText('250')).toBeInTheDocument(); // dailyActiveUsers
      expect(screen.getByText('16m')).toBeInTheDocument(); // averageCompletionTime
    });
  });

  it('should render completion rates tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Completion Rates by Category')).toBeInTheDocument();
    });

    expect(screen.getByText('completion')).toBeInTheDocument();
    expect(screen.getByText('speed')).toBeInTheDocument();
    expect(screen.getByText('75.5%')).toBeInTheDocument();
    expect(screen.getByText('45.2%')).toBeInTheDocument();
  });

  it('should render engagement tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Engagement')).toBeInTheDocument();
    });

    const engagementTab = screen.getByText('Engagement');
    fireEvent.click(engagementTab);

    await waitFor(() => {
      expect(screen.getByText('Most Popular Achievement')).toBeInTheDocument();
      expect(screen.getByText('Least Popular Achievement')).toBeInTheDocument();
      expect(screen.getByText('First Puzzle')).toBeInTheDocument();
      expect(screen.getByText('Speed Demon')).toBeInTheDocument();
    });
  });

  it('should render difficulty analysis tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Difficulty Analysis')).toBeInTheDocument();
    });

    const difficultyTab = screen.getByText('Difficulty Analysis');
    fireEvent.click(difficultyTab);

    await waitFor(() => {
      expect(screen.getByText('bronze')).toBeInTheDocument();
      expect(screen.getByText('gold')).toBeInTheDocument();
      expect(screen.getByText('80.0%')).toBeInTheDocument();
      expect(screen.getByText('25.0%')).toBeInTheDocument();
    });
  });

  it('should render user segmentation tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('User Segmentation')).toBeInTheDocument();
    });

    const segmentationTab = screen.getByText('User Segmentation');
    fireEvent.click(segmentationTab);

    await waitFor(() => {
      expect(screen.getByText('casual')).toBeInTheDocument();
      expect(screen.getByText('hardcore')).toBeInTheDocument();
      expect(screen.getByText('500 users')).toBeInTheDocument();
      expect(screen.getByText('200 users')).toBeInTheDocument();
    });
  });

  it('should render trends tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Trends')).toBeInTheDocument();
    });

    const trendsTab = screen.getByText('Trends');
    fireEvent.click(trendsTab);

    await waitFor(() => {
      expect(screen.getByText('Achievement Trends')).toBeInTheDocument();
      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('2024-01-16')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument(); // achievementsUnlocked
      expect(screen.getByText('52')).toBeInTheDocument();
    });
  });

  it('should change period when period buttons are clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('7d')).toBeInTheDocument();
    });

    const sevenDayButton = screen.getByText('7d');
    fireEvent.click(sevenDayButton);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('period=7d')
    );
  });

  it('should change category when category select is changed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
    });

    const categorySelect = screen.getByDisplayValue('All Categories');
    fireEvent.change(categorySelect, { target: { value: 'completion' } });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('category=completion')
    );
  });

  it('should export analytics when export button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['mock csv content'], { type: 'text/csv' }),
      });

    // Mock document.createElement and related methods
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    const mockCreateElement = jest.fn(() => mockAnchor);
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();

    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true,
    });
    Object.defineProperty(document.body, 'appendChild', {
      value: mockAppendChild,
      writable: true,
    });
    Object.defineProperty(document.body, 'removeChild', {
      value: mockRemoveChild,
      writable: true,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/achievements/export'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalyticsData,
    });

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<AchievementAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });
});
