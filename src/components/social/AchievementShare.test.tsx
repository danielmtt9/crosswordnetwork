import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AchievementShare from './AchievementShare';

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

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true,
});

describe('AchievementShare', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockOpen.mockClear();
  });

  const mockAchievement = {
    id: 'achievement1',
    name: 'First Puzzle',
    description: 'Complete your first puzzle',
    icon: '🎯',
    points: 100,
    tier: 'bronze',
    category: 'completion',
    earnedAt: '2024-01-15T10:00:00Z',
  };

  it('should render achievement share component', () => {
    render(<AchievementShare achievement={mockAchievement} />);
    
    expect(screen.getByText('Share Achievement')).toBeInTheDocument();
    expect(screen.getByText('First Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Complete your first puzzle')).toBeInTheDocument();
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('100 points')).toBeInTheDocument();
  });

  it('should show share options when share button is clicked', () => {
    render(<AchievementShare achievement={mockAchievement} />);
    
    const shareButton = screen.getByText('Share Achievement');
    fireEvent.click(shareButton);
    
    expect(screen.getByText('Share on Twitter')).toBeInTheDocument();
    expect(screen.getByText('Share on Facebook')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('should copy link to clipboard when copy button is clicked', async () => {
    // Mock clipboard API
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<AchievementShare achievement={mockAchievement} />);
    
    const shareButton = screen.getByText('Share Achievement');
    fireEvent.click(shareButton);
    
    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('achievement1')
      );
    });
  });

  it('should open Twitter share when Twitter button is clicked', () => {
    render(<AchievementShare achievement={mockAchievement} />);
    
    const shareButton = screen.getByText('Share Achievement');
    fireEvent.click(shareButton);
    
    const twitterButton = screen.getByText('Share on Twitter');
    fireEvent.click(twitterButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank'
    );
  });

  it('should open Facebook share when Facebook button is clicked', () => {
    render(<AchievementShare achievement={mockAchievement} />);
    
    const shareButton = screen.getByText('Share Achievement');
    fireEvent.click(shareButton);
    
    const facebookButton = screen.getByText('Share on Facebook');
    fireEvent.click(facebookButton);
    
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('facebook.com/sharer/sharer.php'),
      '_blank'
    );
  });

  it('should show success message when link is copied', async () => {
    // Mock clipboard API
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<AchievementShare achievement={mockAchievement} />);
    
    const shareButton = screen.getByText('Share Achievement');
    fireEvent.click(shareButton);
    
    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Link copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('should render different tier colors correctly', () => {
    const bronzeAchievement = { ...mockAchievement, tier: 'bronze' };
    const silverAchievement = { ...mockAchievement, tier: 'silver' };
    const goldAchievement = { ...mockAchievement, tier: 'gold' };
    const platinumAchievement = { ...mockAchievement, tier: 'platinum' };
    const legendaryAchievement = { ...mockAchievement, tier: 'legendary' };

    const { rerender } = render(<AchievementShare achievement={bronzeAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-amber-600');

    rerender(<AchievementShare achievement={silverAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-gray-500');

    rerender(<AchievementShare achievement={goldAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-yellow-500');

    rerender(<AchievementShare achievement={platinumAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-blue-500');

    rerender(<AchievementShare achievement={legendaryAchievement} />);
    expect(screen.getByText('100 points')).toHaveClass('text-purple-600');
  });

  it('should close share options when clicking outside', () => {
    render(<AchievementShare achievement={mockAchievement} />);
    
    const shareButton = screen.getByText('Share Achievement');
    fireEvent.click(shareButton);
    
    expect(screen.getByText('Share on Twitter')).toBeInTheDocument();
    
    // Click outside
    fireEvent.click(document.body);
    
    expect(screen.queryByText('Share on Twitter')).not.toBeInTheDocument();
  });
});
