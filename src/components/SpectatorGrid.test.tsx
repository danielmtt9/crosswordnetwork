import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpectatorGrid } from './SpectatorGrid';

// Mock the hooks
jest.mock('../hooks/useSocket', () => ({
  useSocket: jest.fn(() => ({
    socket: null,
    isConnected: true,
    connectionStatus: 'Connected',
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
  }))
}));

jest.mock('../hooks/useClientPrediction', () => ({
  useClientPrediction: jest.fn(() => ({
    predictCellUpdate: jest.fn(),
    rollbackPrediction: jest.fn(),
    isPredicting: false
  }))
}));

// Mock the components
jest.mock('./PuzzleRenderer', () => ({
  PuzzleRenderer: ({ puzzle, gridState, onCellUpdate, isReadOnly, className }: any) => (
    <div data-testid="puzzle-renderer" className={className}>
      <div>Puzzle: {puzzle.title}</div>
      <div>Grid State: {JSON.stringify(gridState)}</div>
      <div>Read Only: {isReadOnly ? 'Yes' : 'No'}</div>
      <button onClick={() => onCellUpdate('A1', 'C')}>Click Cell A1</button>
    </div>
  )
}));

jest.mock('./CursorDisplay', () => ({
  CursorDisplay: ({ participants, currentUserId, className }: any) => (
    <div data-testid="cursor-display" className={className}>
      <div>Current User: {currentUserId}</div>
      <div>Participants: {participants.length}</div>
    </div>
  )
}));

jest.mock('./ConflictNotification', () => ({
  ConflictNotification: ({ cell, message, onDismiss }: any) => (
    <div data-testid="conflict-notification">
      <div>Cell: {cell}</div>
      <div>Message: {message}</div>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  )
}));

jest.mock('./PredictionFeedback', () => ({
  PredictionFeedback: ({ isPredicting, lastRollback, className }: any) => (
    <div data-testid="prediction-feedback" className={className}>
      <div>Predicting: {isPredicting ? 'Yes' : 'No'}</div>
      <div>Last Rollback: {lastRollback}</div>
    </div>
  )
}));

describe('SpectatorGrid', () => {
  const defaultProps = {
    roomId: 'room1',
    roomCode: 'ABC123',
    puzzle: { title: 'Test Puzzle' },
    gridState: { 'A1': 'C', 'A2': 'A' },
    participants: [
      {
        userId: 'user1',
        displayName: 'Alice',
        role: 'HOST' as const,
        isOnline: true,
        lastSeen: new Date('2023-01-01T10:00:00Z'),
        cursorPosition: { row: 0, col: 0 }
      },
      {
        userId: 'user2',
        displayName: 'Bob',
        role: 'SPECTATOR' as const,
        isOnline: true,
        lastSeen: new Date('2023-01-01T10:00:00Z')
      }
    ],
    currentUserId: 'user2',
    canUpgrade: true,
    onUpgradeToPlayer: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render spectator mode banner', () => {
    render(<SpectatorGrid {...defaultProps} />);

    expect(screen.getByText('Spectator Mode')).toBeInTheDocument();
    expect(screen.getByText('View-only access')).toBeInTheDocument();
  });

  it('should show upgrade button when canUpgrade is true', () => {
    render(<SpectatorGrid {...defaultProps} canUpgrade={true} />);

    expect(screen.getByText('Upgrade to Player')).toBeInTheDocument();
  });

  it('should not show upgrade button when canUpgrade is false', () => {
    render(<SpectatorGrid {...defaultProps} canUpgrade={false} />);

    expect(screen.queryByText('Upgrade to Player')).not.toBeInTheDocument();
  });

  it('should call onUpgradeToPlayer when upgrade button is clicked', () => {
    const mockOnUpgrade = jest.fn();
    render(<SpectatorGrid {...defaultProps} onUpgradeToPlayer={mockOnUpgrade} />);

    const upgradeButton = screen.getByText('Upgrade to Player');
    fireEvent.click(upgradeButton);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it('should show connection status', () => {
    render(<SpectatorGrid {...defaultProps} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show spectator count', () => {
    render(<SpectatorGrid {...defaultProps} />);

    expect(screen.getByText('1 spectator')).toBeInTheDocument();
  });

  it('should render puzzle renderer in read-only mode', () => {
    render(<SpectatorGrid {...defaultProps} />);

    const puzzleRenderer = screen.getByTestId('puzzle-renderer');
    expect(puzzleRenderer).toBeInTheDocument();
    expect(screen.getByText('Read Only: Yes')).toBeInTheDocument();
  });

  it('should render cursor display', () => {
    render(<SpectatorGrid {...defaultProps} />);

    const cursorDisplay = screen.getByTestId('cursor-display');
    expect(cursorDisplay).toBeInTheDocument();
    expect(screen.getByText('Current User: user2')).toBeInTheDocument();
  });

  it('should call onUpgradeToPlayer when cell is clicked', () => {
    const mockOnUpgrade = jest.fn();
    render(<SpectatorGrid {...defaultProps} onUpgradeToPlayer={mockOnUpgrade} />);

    const cellButton = screen.getByText('Click Cell A1');
    fireEvent.click(cellButton);

    expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
  });

  it('should show spectator info panel', () => {
    render(<SpectatorGrid {...defaultProps} />);

    expect(screen.getByText('Spectator Mode:')).toBeInTheDocument();
    expect(screen.getByText('You can view the puzzle and chat, but cannot edit cells or use hints.')).toBeInTheDocument();
    expect(screen.getByText('👀 View-only access')).toBeInTheDocument();
    expect(screen.getByText('💬 Chat available')).toBeInTheDocument();
    expect(screen.getByText('🚫 No cell editing')).toBeInTheDocument();
    expect(screen.getByText('🚫 No hints')).toBeInTheDocument();
  });

  it('should handle multiple spectators correctly', () => {
    const propsWithMultipleSpectators = {
      ...defaultProps,
      participants: [
        ...defaultProps.participants,
        {
          userId: 'user3',
          displayName: 'Charlie',
          role: 'SPECTATOR' as const,
          isOnline: true,
          lastSeen: new Date('2023-01-01T10:00:00Z')
        }
      ]
    };

    render(<SpectatorGrid {...propsWithMultipleSpectators} />);

    expect(screen.getByText('2 spectators')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<SpectatorGrid {...defaultProps} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show conflicts when they occur', async () => {
    const mockUseSocket = require('../hooks/useSocket').useSocket;
    const mockOnCellConflict = jest.fn();
    
    mockUseSocket.mockReturnValue({
      socket: null,
      isConnected: true,
      connectionStatus: 'Connected',
      emit: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'cellConflict') {
          mockOnCellConflict.mockImplementation(callback);
        }
      }),
      off: jest.fn()
    });

    render(<SpectatorGrid {...defaultProps} />);

    // Simulate a conflict
    mockOnCellConflict({
      cell: 'A1',
      message: 'Conflict detected'
    });

    await waitFor(() => {
      expect(screen.getByTestId('conflict-notification')).toBeInTheDocument();
      expect(screen.getByText('Cell: A1')).toBeInTheDocument();
      expect(screen.getByText('Message: Conflict detected')).toBeInTheDocument();
    });
  });

  it('should dismiss conflicts when dismiss button is clicked', async () => {
    const mockUseSocket = require('../hooks/useSocket').useSocket;
    const mockOnCellConflict = jest.fn();
    
    mockUseSocket.mockReturnValue({
      socket: null,
      isConnected: true,
      connectionStatus: 'Connected',
      emit: jest.fn(),
      on: jest.fn((event, callback) => {
        if (event === 'cellConflict') {
          mockOnCellConflict.mockImplementation(callback);
        }
      }),
      off: jest.fn()
    });

    render(<SpectatorGrid {...defaultProps} />);

    // Simulate a conflict
    mockOnCellConflict({
      cell: 'A1',
      message: 'Conflict detected'
    });

    await waitFor(() => {
      expect(screen.getByTestId('conflict-notification')).toBeInTheDocument();
    });

    // Dismiss the conflict
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByTestId('conflict-notification')).not.toBeInTheDocument();
    });
  });
});
