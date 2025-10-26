import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomStateRecovery } from './RoomStateRecovery';

// Mock the useRoomState hook
jest.mock('../hooks/useRoomState', () => ({
  useRoomState: jest.fn(),
}));

const mockUseRoomState = require('../hooks/useRoomState').useRoomState;

describe('RoomStateRecovery', () => {
  const defaultProps = {
    roomId: 'room1',
    roomCode: 'ABC123',
    userId: 'user1',
    userName: 'Alice',
    userRole: 'HOST' as const,
    onRecoveryComplete: jest.fn(),
  };

  const mockRoomState = {
    gridState: { 'A1': 'C', 'A2': 'A' },
    participants: [
      {
        userId: 'user1',
        displayName: 'Alice',
        role: 'HOST' as const,
        isOnline: true,
        lastSeen: new Date('2023-01-01T10:00:00Z'),
      },
    ],
    sessionState: {
      status: 'ACTIVE' as const,
      startedAt: new Date('2023-01-01T10:00:00Z'),
      currentHost: 'user1',
    },
    chatHistory: [],
    metadata: {
      lastSaved: new Date('2023-01-01T10:00:00Z'),
      version: 1,
    },
  };

  const mockAvailableVersions = [
    { version: 1, timestamp: new Date('2023-01-01T10:00:00Z'), description: 'Initial state' },
    { version: 2, timestamp: new Date('2023-01-01T10:30:00Z'), description: 'After 30 minutes' },
    { version: 3, timestamp: new Date('2023-01-01T11:00:00Z'), description: 'After 1 hour' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRoomState.mockReturnValue({
      roomState: mockRoomState,
      loading: false,
      error: null,
      lastSaved: new Date('2023-01-01T10:00:00Z'),
      restoreRoomState: jest.fn(),
      saveRoomState: jest.fn(),
    });
  });

  it('should render recovery options when room state is available', () => {
    render(<RoomStateRecovery {...defaultProps} />);

    expect(screen.getByText('Room State Recovery')).toBeInTheDocument();
    expect(screen.getByText('Continue from last saved state')).toBeInTheDocument();
    expect(screen.getByText('Start fresh')).toBeInTheDocument();
    expect(screen.getByText('Restore from backup')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseRoomState.mockReturnValue({
      roomState: null,
      loading: true,
      error: null,
      lastSaved: null,
      restoreRoomState: jest.fn(),
      saveRoomState: jest.fn(),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    expect(screen.getByText('Loading room state...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseRoomState.mockReturnValue({
      roomState: null,
      loading: false,
      error: 'Failed to load room state',
      lastSaved: null,
      restoreRoomState: jest.fn(),
      saveRoomState: jest.fn(),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    expect(screen.getByText('Error loading room state: Failed to load room state')).toBeInTheDocument();
    expect(screen.getByText('Start fresh')).toBeInTheDocument();
  });

  it('should handle continue from last saved state', async () => {
    const mockOnRecoveryComplete = jest.fn();
    render(<RoomStateRecovery {...defaultProps} onRecoveryComplete={mockOnRecoveryComplete} />);

    const continueButton = screen.getByText('Continue from last saved state');
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(mockOnRecoveryComplete).toHaveBeenCalledWith('continue');
    });
  });

  it('should handle start fresh', async () => {
    const mockOnRecoveryComplete = jest.fn();
    render(<RoomStateRecovery {...defaultProps} onRecoveryComplete={mockOnRecoveryComplete} />);

    const startFreshButton = screen.getByText('Start fresh');
    fireEvent.click(startFreshButton);

    await waitFor(() => {
      expect(mockOnRecoveryComplete).toHaveBeenCalledWith('fresh');
    });
  });

  it('should show backup versions when restore is clicked', async () => {
    // Mock fetch for available versions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ versions: mockAvailableVersions }),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Available Backups')).toBeInTheDocument();
      expect(screen.getByText('Initial state')).toBeInTheDocument();
      expect(screen.getByText('After 30 minutes')).toBeInTheDocument();
      expect(screen.getByText('After 1 hour')).toBeInTheDocument();
    });
  });

  it('should handle backup version selection', async () => {
    const mockRestoreRoomState = jest.fn();
    mockUseRoomState.mockReturnValue({
      roomState: mockRoomState,
      loading: false,
      error: null,
      lastSaved: new Date('2023-01-01T10:00:00Z'),
      restoreRoomState: mockRestoreRoomState,
      saveRoomState: jest.fn(),
    });

    // Mock fetch for available versions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ versions: mockAvailableVersions }),
    });

    const mockOnRecoveryComplete = jest.fn();
    render(<RoomStateRecovery {...defaultProps} onRecoveryComplete={mockOnRecoveryComplete} />);

    // Click restore button
    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    // Wait for versions to load
    await waitFor(() => {
      expect(screen.getByText('Available Backups')).toBeInTheDocument();
    });

    // Select a version
    const versionButton = screen.getByText('After 30 minutes');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(mockRestoreRoomState).toHaveBeenCalledWith(2);
      expect(mockOnRecoveryComplete).toHaveBeenCalledWith('restore', 2);
    });
  });

  it('should handle backup loading errors', async () => {
    // Mock fetch to return error
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to load backups'));

    render(<RoomStateRecovery {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Error loading backups: Failed to load backups')).toBeInTheDocument();
    });
  });

  it('should handle backup loading network errors', async () => {
    // Mock fetch to return network error
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<RoomStateRecovery {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Error loading backups: 500')).toBeInTheDocument();
    });
  });

  it('should show last saved timestamp', () => {
    render(<RoomStateRecovery {...defaultProps} />);

    expect(screen.getByText(/Last saved: 1\/1\/2023, 10:00:00 AM/)).toBeInTheDocument();
  });

  it('should show no backups message when no versions available', async () => {
    // Mock fetch for empty versions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ versions: [] }),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('No backup versions available')).toBeInTheDocument();
    });
  });

  it('should allow canceling backup selection', async () => {
    // Mock fetch for available versions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ versions: mockAvailableVersions }),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Available Backups')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Available Backups')).not.toBeInTheDocument();
    });
  });

  it('should show current version in backup list', async () => {
    // Mock fetch for available versions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ versions: mockAvailableVersions }),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Available Backups')).toBeInTheDocument();
      expect(screen.getByText('Initial state (Current)')).toBeInTheDocument();
    });
  });

  it('should handle restore errors', async () => {
    const mockRestoreRoomState = jest.fn().mockRejectedValue(new Error('Restore failed'));
    mockUseRoomState.mockReturnValue({
      roomState: mockRoomState,
      loading: false,
      error: null,
      lastSaved: new Date('2023-01-01T10:00:00Z'),
      restoreRoomState: mockRestoreRoomState,
      saveRoomState: jest.fn(),
    });

    // Mock fetch for available versions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ versions: mockAvailableVersions }),
    });

    render(<RoomStateRecovery {...defaultProps} />);

    // Click restore button
    const restoreButton = screen.getByText('Restore from backup');
    fireEvent.click(restoreButton);

    // Wait for versions to load
    await waitFor(() => {
      expect(screen.getByText('Available Backups')).toBeInTheDocument();
    });

    // Select a version
    const versionButton = screen.getByText('After 30 minutes');
    fireEvent.click(versionButton);

    await waitFor(() => {
      expect(screen.getByText('Error restoring room state: Restore failed')).toBeInTheDocument();
    });
  });
});
