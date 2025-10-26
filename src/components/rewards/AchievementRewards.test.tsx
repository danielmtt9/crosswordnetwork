import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AchievementRewards } from './AchievementRewards';

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

describe('AchievementRewards', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const mockRewardsData = {
    totalPoints: 5000,
    availablePoints: 2500,
    spentPoints: 2500,
    unlockedRewards: [
      {
        id: 'reward1',
        type: 'badge',
        name: 'First Badge',
        description: 'Your first achievement badge',
        icon: '🏆',
        value: 100,
        rarity: 'common',
        unlocked: true,
        unlockedAt: '2024-01-15T10:00:00Z',
        requirements: [],
      },
    ],
    availableRewards: [
      {
        id: 'reward2',
        type: 'premium_feature',
        name: 'Premium Theme',
        description: 'Unlock exclusive themes',
        icon: '🎨',
        value: 1000,
        rarity: 'rare',
        unlocked: false,
        requirements: [
          {
            achievementId: 'ach1',
            achievementName: 'First Achievement',
            pointsRequired: 100,
          },
        ],
      },
    ],
    premiumFeatures: [
      {
        id: 'premium_theme',
        name: 'Premium Theme',
        description: 'Unlock exclusive dark and light themes',
        unlocked: false,
        requiredPoints: 1000,
      },
    ],
    hintBonuses: [
      {
        id: 'hint_pack_1',
        name: 'Hint Pack (5)',
        description: 'Get 5 extra hints for puzzles',
        bonusAmount: 5,
        unlocked: false,
        requiredPoints: 500,
      },
    ],
    specialEvents: [
      {
        id: 'weekly_challenge',
        name: 'Weekly Challenge Access',
        description: 'Participate in exclusive weekly challenges',
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-22T00:00:00Z',
        unlocked: false,
        requiredPoints: 3000,
      },
    ],
  };

  it('should render loading state initially', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);
    
    expect(screen.getByText('Achievement Rewards')).toBeInTheDocument();
    expect(screen.getByText('Unlock rewards with your achievement points')).toBeInTheDocument();
  });

  it('should render rewards data when loaded', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('5,000')).toBeInTheDocument(); // totalPoints
      expect(screen.getByText('2,500')).toBeInTheDocument(); // availablePoints
      expect(screen.getByText('1')).toBeInTheDocument(); // unlockedRewards.length
    });
  });

  it('should render overview tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('Recent Unlocks')).toBeInTheDocument();
      expect(screen.getByText('Available Rewards')).toBeInTheDocument();
    });

    expect(screen.getByText('First Badge')).toBeInTheDocument();
    expect(screen.getByText('Premium Theme')).toBeInTheDocument();
  });

  it('should render badges tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('Badges')).toBeInTheDocument();
    });

    const badgesTab = screen.getByText('Badges');
    fireEvent.click(badgesTab);

    await waitFor(() => {
      expect(screen.getByText('Special Badges')).toBeInTheDocument();
    });
  });

  it('should render premium features tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('Premium Features')).toBeInTheDocument();
    });

    const premiumTab = screen.getByText('Premium Features');
    fireEvent.click(premiumTab);

    await waitFor(() => {
      expect(screen.getByText('Premium Theme')).toBeInTheDocument();
      expect(screen.getByText('Unlock exclusive dark and light themes')).toBeInTheDocument();
    });
  });

  it('should render hint bonuses tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('Hint Bonuses')).toBeInTheDocument();
    });

    const hintsTab = screen.getByText('Hint Bonuses');
    fireEvent.click(hintsTab);

    await waitFor(() => {
      expect(screen.getByText('Hint Pack (5)')).toBeInTheDocument();
      expect(screen.getByText('Get 5 extra hints for puzzles')).toBeInTheDocument();
      expect(screen.getByText('+5 hints')).toBeInTheDocument();
    });
  });

  it('should render special events tab content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('Special Events')).toBeInTheDocument();
    });

    const eventsTab = screen.getByText('Special Events');
    fireEvent.click(eventsTab);

    await waitFor(() => {
      expect(screen.getByText('Weekly Challenge Access')).toBeInTheDocument();
      expect(screen.getByText('Participate in exclusive weekly challenges')).toBeInTheDocument();
    });
  });

  it('should unlock reward when unlock button is clicked', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRewardsData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockRewardsData,
      });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('Unlock')).toBeInTheDocument();
    });

    const unlockButton = screen.getByText('Unlock');
    fireEvent.click(unlockButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/rewards/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: 'reward2' }),
      });
    });
  });

  it('should disable unlock button when insufficient points', async () => {
    const insufficientPointsData = {
      ...mockRewardsData,
      availablePoints: 500, // Less than required 1000
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => insufficientPointsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      const unlockButton = screen.getByText('Unlock');
      expect(unlockButton).toBeDisabled();
    });
  });

  it('should render error state when API fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('should show rarity badges correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('common')).toBeInTheDocument();
      expect(screen.getByText('rare')).toBeInTheDocument();
    });
  });

  it('should display reward icons correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRewardsData,
    });

    render(<AchievementRewards />);

    await waitFor(() => {
      expect(screen.getByText('🏆')).toBeInTheDocument(); // First Badge icon
      expect(screen.getByText('🎨')).toBeInTheDocument(); // Premium Theme icon
    });
  });
});
