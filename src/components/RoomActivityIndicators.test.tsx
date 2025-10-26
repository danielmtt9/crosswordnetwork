/**
 * Unit tests for RoomActivityIndicators component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomActivityIndicators } from './RoomActivityIndicators';
import { useRoomActivity } from '@/hooks/useRoomActivity';

// Mock the hook
jest.mock('@/hooks/useRoomActivity');
const mockUseRoomActivity = useRoomActivity as jest.MockedFunction<typeof useRoomActivity>;

describe('RoomActivityIndicators', () => {
  const defaultProps = {
    roomId: 'room-123'
  };

  const mockActivityData = {
    activityLevel: 0.8,
    isConnected: true,
    latency: 50,
    activeUsers: 5,
    totalUsers: 8,
    messagesPerMinute: 12,
    totalMessages: 150,
    puzzleActionsPerMinute: 8,
    completionRate: 75,
    recentActivity: [
      {
        type: 'message' as const,
        description: 'User sent a message',
        timestamp: new Date()
      },
      {
        type: 'puzzle' as const,
        description: 'Puzzle was edited',
        timestamp: new Date()
      }
    ],
    syncLatency: 25,
    uptime: 99.5,
    throughput: 15,
    isTyping: true,
    hasNewMessages: true,
    hasPuzzleUpdates: true,
    hasUserChanges: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: null,
      isLoading: true,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('Loading activity...')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: null,
      isLoading: false,
      error: 'Failed to load activity',
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('Failed to load activity: Failed to load activity')).toBeInTheDocument();
  });

  it('should render no data state', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: null,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('No activity data available')).toBeInTheDocument();
  });

  it('should render activity indicators', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('Room Activity')).toBeInTheDocument();
    expect(screen.getAllByText('connected')).toHaveLength(2);
    expect(screen.getByText('5')).toBeInTheDocument(); // activeUsers
    expect(screen.getByText('8 total')).toBeInTheDocument(); // totalUsers
    expect(screen.getByText('12')).toBeInTheDocument(); // messagesPerMinute
    expect(screen.getByText('150 total')).toBeInTheDocument(); // totalMessages
  });

  it('should display connection status correctly', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: { ...mockActivityData, isConnected: false },
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getAllByText('disconnected')).toHaveLength(2);
  });

  it('should display activity level correctly', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: { ...mockActivityData, activityLevel: 0.3 },
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('low')).toBeInTheDocument();
  });

  it('should display recent activity', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('User sent a message')).toBeInTheDocument();
    expect(screen.getByText('Puzzle was edited')).toBeInTheDocument();
  });

  it('should display performance metrics', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('25ms')).toBeInTheDocument(); // syncLatency
    expect(screen.getByText('99.5%')).toBeInTheDocument(); // uptime
    expect(screen.getByText('15')).toBeInTheDocument(); // throughput
  });

  it('should display status indicators', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('Someone is typing...')).toBeInTheDocument();
    expect(screen.getByText('New messages')).toBeInTheDocument();
    expect(screen.getByText('Puzzle updated')).toBeInTheDocument();
  });

  it('should handle refresh button click', async () => {
    const mockRefresh = jest.fn();
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: mockRefresh
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    const refreshButton = screen.getByRole('button', { name: '' });
    fireEvent.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should handle loading state in refresh button', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: true,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    // In loading state, there should be no refresh button
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    const { container } = render(
      <RoomActivityIndicators {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should display puzzle activity correctly', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: mockActivityData,
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('8')).toBeInTheDocument(); // puzzleActionsPerMinute
    expect(screen.getByText('75%')).toBeInTheDocument(); // completionRate
  });

  it('should handle different activity levels', () => {
    const testCases = [
      { level: 0.9, expectedStatus: 'high' },
      { level: 0.6, expectedStatus: 'medium' },
      { level: 0.3, expectedStatus: 'low' },
      { level: 0.1, expectedStatus: 'idle' }
    ];

    testCases.forEach(({ level, expectedStatus }) => {
      mockUseRoomActivity.mockReturnValue({
        activity: { ...mockActivityData, activityLevel: level },
        isLoading: false,
        error: null,
        refresh: jest.fn()
      });

      const { unmount } = render(<RoomActivityIndicators {...defaultProps} />);

      expect(screen.getByText(expectedStatus)).toBeInTheDocument();

      unmount();
    });
  });

  it('should handle empty recent activity', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: { ...mockActivityData, recentActivity: [] },
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    // Should not crash with empty array
  });

  it('should handle missing latency', () => {
    mockUseRoomActivity.mockReturnValue({
      activity: { ...mockActivityData, latency: undefined },
      isLoading: false,
      error: null,
      refresh: jest.fn()
    });

    render(<RoomActivityIndicators {...defaultProps} />);

    expect(screen.getAllByText('connected')).toHaveLength(2);
    // Should not display latency badge
  });
});
