import { renderHook, act } from '@testing-library/react';
import { useSocket } from './useSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

// Mock the prediction system
jest.mock('@/lib/prediction', () => ({
  clientPrediction: {
    predictUpdate: jest.fn(),
    confirmPrediction: jest.fn(),
    rollbackPrediction: jest.fn(),
    getPredictions: jest.fn(() => new Map()),
    getRollbacks: jest.fn(() => []),
    clearOldRollbacks: jest.fn(),
    getStats: jest.fn(() => ({
      activePredictions: 0,
      totalRollbacks: 0,
      averagePredictionTime: 0
    }))
  }
}));

describe('useSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock socket
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      join: jest.fn(),
      leave: jest.fn()
    };
    
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize socket connection with correct options', () => {
    renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER'
    }));

    expect(mockIo).toHaveBeenCalledWith('', {
      path: '/socket.io/',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });
  });

  it('should emit join_room when connected', () => {
    renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER'
    }));

    // Simulate connection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    act(() => {
      connectHandler();
    });

    // Should emit join_room after delay
    setTimeout(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('join_room', {
        roomCode: 'TEST123',
        userId: 'user1',
        userName: 'Test User',
        role: 'PLAYER'
      });
    }, 150);
  });

  it('should handle cell updates with prediction', () => {
    const onCellUpdated = jest.fn();
    const { result } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER',
      onCellUpdated
    }));

    act(() => {
      result.current.updateCell({
        roomCode: 'TEST123',
        cellId: 'A1',
        value: 'X',
        currentValue: ''
      });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('cell_update', expect.objectContaining({
      roomCode: 'TEST123',
      cellId: 'A1',
      value: 'X',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER',
      clientId: expect.any(String),
      timestamp: expect.any(Number)
    }));
  });

  it('should handle cursor movement with throttling', () => {
    const { result } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER'
    }));

    act(() => {
      result.current.moveCursor('A1', 100, 200);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('cursor_move', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user1',
      userName: 'Test User',
      timestamp: expect.any(Number)
    });
  });

  it('should queue updates during disconnection', () => {
    const { result } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER'
    }));

    // Simulate disconnection
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    act(() => {
      disconnectHandler('network error');
    });

    // Try to update cell while disconnected
    act(() => {
      result.current.updateCell({
        roomCode: 'TEST123',
        cellId: 'A1',
        value: 'X'
      });
    });

    // Should not emit immediately
    expect(mockSocket.emit).not.toHaveBeenCalledWith('cell_update', expect.any(Object));
  });

  it('should replay queued updates on reconnection', () => {
    const { result } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER'
    }));

    // Simulate disconnection
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    act(() => {
      disconnectHandler('network error');
    });

    // Queue some updates
    act(() => {
      result.current.updateCell({
        roomCode: 'TEST123',
        cellId: 'A1',
        value: 'X'
      });
      result.current.updateCell({
        roomCode: 'TEST123',
        cellId: 'A2',
        value: 'Y'
      });
    });

    // Simulate reconnection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    act(() => {
      connectHandler();
    });

    // Should replay queued updates
    setTimeout(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('cell_update', expect.objectContaining({
        cellId: 'A1',
        value: 'X'
      }));
      expect(mockSocket.emit).toHaveBeenCalledWith('cell_update', expect.objectContaining({
        cellId: 'A2',
        value: 'Y'
      }));
    }, 150);
  });

  it('should handle room state updates', () => {
    const onPlayerJoined = jest.fn();
    const { result } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER',
      onPlayerJoined
    }));

    // Simulate room state update
    const roomStateHandler = mockSocket.on.mock.calls.find(call => call[0] === 'room_state')[1];
    act(() => {
      roomStateHandler({
        participants: [
          { userId: 'user1', displayName: 'Test User', role: 'PLAYER' },
          { userId: 'user2', displayName: 'Other User', role: 'SPECTATOR' }
        ],
        gridState: { 'A1': 'X', 'A2': 'Y' }
      });
    });

    expect(result.current.participants).toEqual([
      { userId: 'user1', displayName: 'Test User', role: 'PLAYER' },
      { userId: 'user2', displayName: 'Other User', role: 'SPECTATOR' }
    ]);
  });

  it('should handle cursor position updates', () => {
    const onCursorMoved = jest.fn();
    const { result } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER',
      onCursorMoved
    }));

    // Simulate cursor movement
    const cursorMoveHandler = mockSocket.on.mock.calls.find(call => call[0] === 'cursor_moved')[1];
    act(() => {
      cursorMoveHandler({
        cellId: 'A1',
        x: 100,
        y: 200,
        userId: 'user2',
        userName: 'Other User',
        timestamp: Date.now()
      });
    });

    expect(result.current.cursorPositions.has('user2')).toBe(true);
    expect(onCursorMoved).toHaveBeenCalledWith({
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'Other User',
      timestamp: expect.any(Number)
    });
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useSocket({
      roomCode: 'TEST123',
      userId: 'user1',
      userName: 'Test User',
      role: 'PLAYER'
    }));

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('leave_room', {
      roomCode: 'TEST123',
      userId: 'user1'
    });
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
