/**
 * Unit tests for RoomRecoverySystem component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomRecoverySystem } from './RoomRecoverySystem';
import { useRoomRecovery } from '@/hooks/useRoomRecovery';

// Mock the hook
jest.mock('@/hooks/useRoomRecovery');
const mockUseRoomRecovery = useRoomRecovery as jest.MockedFunction<typeof useRoomRecovery>;

describe('RoomRecoverySystem', () => {
  const defaultProps = {
    roomId: 'room-123'
  };

  const mockRecoveryState = {
    status: 'CONNECTED' as const,
    latency: 50,
    lastConnected: new Date(),
    disconnectionCount: 0,
    recoveryAttempts: 0,
    successRate: 100,
    recoveryProgress: 0,
    participantCount: 5,
    messageCount: 150,
    puzzleProgress: 75,
    sessionDuration: '2h 30m',
    hasBackup: true,
    lastBackup: new Date(),
    backupSize: '2.5 MB',
    autoBackup: true,
    recoveryHistory: [
      {
        status: 'SUCCESS' as const,
        description: 'Recovery completed successfully',
        timestamp: new Date()
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render connected state', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    expect(screen.getByText('Room Recovery')).toBeInTheDocument();
    expect(screen.getAllByText('CONNECTED')).toHaveLength(2);
    expect(screen.getByText('50ms')).toBeInTheDocument();
  });

  it('should render disconnected state', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: { ...mockRecoveryState, status: 'DISCONNECTED' },
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    expect(screen.getAllByText('DISCONNECTED')).toHaveLength(2);
  });

  it('should render recovering state', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: { ...mockRecoveryState, status: 'RECOVERING', recoveryProgress: 50 },
      isRecovering: true,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    expect(screen.getAllByText('RECOVERING')).toHaveLength(2);
    expect(screen.getByText('Recovery Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should render error state', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: 'Recovery failed',
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    expect(screen.getByText('Recovery failed: Recovery failed')).toBeInTheDocument();
  });

  it('should handle start recovery button click', () => {
    const mockStartRecovery = jest.fn();
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: { ...mockRecoveryState, status: 'DISCONNECTED' },
      isRecovering: false,
      error: null,
      startRecovery: mockStartRecovery,
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const startButton = screen.getByText('Start Recovery');
    fireEvent.click(startButton);

    expect(mockStartRecovery).toHaveBeenCalled();
  });

  it('should handle cancel recovery button click', () => {
    const mockCancelRecovery = jest.fn();
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: true,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: mockCancelRecovery,
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel Recovery');
    fireEvent.click(cancelButton);

    expect(mockCancelRecovery).toHaveBeenCalled();
  });

  it('should handle check connection button click', () => {
    const mockCheckConnection = jest.fn();
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: mockCheckConnection,
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const checkButton = screen.getByText('Check Connection');
    fireEvent.click(checkButton);

    expect(mockCheckConnection).toHaveBeenCalled();
  });

  it('should handle restore from backup button click', () => {
    const mockRestoreFromBackup = jest.fn();
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: mockRestoreFromBackup
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from Backup');
    fireEvent.click(restoreButton);

    expect(mockRestoreFromBackup).toHaveBeenCalled();
  });

  it('should toggle details visibility', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const toggleButton = screen.getByText('Show Details');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Hide Details')).toBeInTheDocument();
    expect(screen.getByText('Connection Details')).toBeInTheDocument();
  });

  it('should display connection details when expanded', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const toggleButton = screen.getByText('Show Details');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Last Connected:')).toBeInTheDocument();
    expect(screen.getByText('Disconnection Count:')).toBeInTheDocument();
    expect(screen.getByText('Recovery Attempts:')).toBeInTheDocument();
    expect(screen.getByText('Success Rate:')).toBeInTheDocument();
  });

  it('should display room state when expanded', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const toggleButton = screen.getByText('Show Details');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Participants: 5')).toBeInTheDocument();
    expect(screen.getByText('Messages: 150')).toBeInTheDocument();
    expect(screen.getByText('Puzzle Progress: 75%')).toBeInTheDocument();
    expect(screen.getByText('Session Time: 2h 30m')).toBeInTheDocument();
  });

  it('should display backup information when expanded', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const toggleButton = screen.getByText('Show Details');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Last Backup:')).toBeInTheDocument();
    expect(screen.getByText('Backup Size:')).toBeInTheDocument();
    expect(screen.getByText('Backup Status:')).toBeInTheDocument();
    expect(screen.getByText('Auto Backup:')).toBeInTheDocument();
  });

  it('should display recovery history when expanded', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const toggleButton = screen.getByText('Show Details');
    fireEvent.click(toggleButton);

    expect(screen.getByText('Recovery History')).toBeInTheDocument();
    expect(screen.getByText('Recovery completed successfully')).toBeInTheDocument();
  });

  it('should disable buttons when recovering', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: true,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    const startButton = screen.queryByText('Start Recovery');
    expect(startButton).not.toBeInTheDocument(); // Should not show when recovering
  });

  it('should show restore button only when backup is available', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: { ...mockRecoveryState, hasBackup: false },
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    render(<RoomRecoverySystem {...defaultProps} />);

    expect(screen.queryByText('Restore from Backup')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseRoomRecovery.mockReturnValue({
      recoveryState: mockRecoveryState,
      isRecovering: false,
      error: null,
      startRecovery: jest.fn(),
      cancelRecovery: jest.fn(),
      checkConnection: jest.fn(),
      restoreFromBackup: jest.fn()
    });

    const { container } = render(
      <RoomRecoverySystem {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should handle different recovery states', () => {
    const testCases = [
      { status: 'CONNECTED', expectedText: 'CONNECTED' },
      { status: 'DISCONNECTED', expectedText: 'DISCONNECTED' },
      { status: 'RECONNECTING', expectedText: 'RECONNECTING' },
      { status: 'RECOVERING', expectedText: 'RECOVERING' }
    ];

    testCases.forEach(({ status, expectedText }) => {
      mockUseRoomRecovery.mockReturnValue({
        recoveryState: { ...mockRecoveryState, status: status as any },
        isRecovering: status === 'RECOVERING',
        error: null,
        startRecovery: jest.fn(),
        cancelRecovery: jest.fn(),
        checkConnection: jest.fn(),
        restoreFromBackup: jest.fn()
      });

      const { unmount } = render(<RoomRecoverySystem {...defaultProps} />);

      expect(screen.getAllByText(expectedText)).toHaveLength(2);

      unmount();
    });
  });
});
