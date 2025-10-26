import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoomState } from './useRoomState';

// Mock fetch
global.fetch = jest.fn();

// Mock timers
jest.useFakeTimers();

describe('useRoomState', () => {
  const defaultOptions = {
    roomId: 'room1',
    roomCode: 'ABC123',
    userId: 'user1',
    userName: 'Alice',
    userRole: 'HOST' as const,
    autoSave: true,
    saveInterval: 30000,
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

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockRoomState,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load initial room state', async () => {
    const { result } = renderHook(() => useRoomState(defaultOptions));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.roomState).toEqual(mockRoomState);
    expect(result.current.lastSaved).toBeDefined();
  });

  it('should handle loading errors', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.roomState).toBeNull();
  });

  it('should update grid state', async () => {
    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateGridState('A3', 'T');
    });

    expect(result.current.roomState?.gridState['A3']).toBe('T');
  });

  it('should debounce grid state saves', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 2 }),
    });

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Update grid state multiple times quickly
    act(() => {
      result.current.updateGridState('A1', 'X');
      result.current.updateGridState('A2', 'Y');
      result.current.updateGridState('A3', 'Z');
    });

    // Should not have saved yet
    expect(fetch).toHaveBeenCalledTimes(1); // Only the initial load

    // Fast-forward time to trigger debounced save
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + debounced save
    });
  });

  it('should update participant status', async () => {
    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateParticipantStatus('user1', false);
    });

    expect(result.current.roomState?.participants[0].isOnline).toBe(false);
  });

  it('should add chat messages', async () => {
    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newMessage = {
      id: 'msg1',
      userId: 'user1',
      userName: 'Alice',
      content: 'Hello!',
      type: 'text',
    };

    act(() => {
      result.current.addChatMessage(newMessage);
    });

    expect(result.current.roomState?.chatHistory).toHaveLength(1);
    expect(result.current.roomState?.chatHistory[0].content).toBe('Hello!');
  });

  it('should update session state', async () => {
    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.updateSessionState({ status: 'COMPLETED' });
    });

    expect(result.current.roomState?.sessionState.status).toBe('COMPLETED');
  });

  it('should restore room state from version', async () => {
    const restoredState = {
      ...mockRoomState,
      metadata: { ...mockRoomState.metadata, version: 5 },
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ state: restoredState }),
    });

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.restoreRoomState(5);
    });

    await waitFor(() => {
      expect(result.current.roomState?.metadata.version).toBe(5);
    });
  });

  it('should handle restore errors', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Restore failed'));

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.restoreRoomState(5);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Restore failed');
    });
  });

  it('should auto-save at intervals', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, version: 2 }),
    });

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Fast-forward time to trigger auto-save
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2); // Initial load + auto-save
    });
  });

  it('should not auto-save when disabled', async () => {
    const { result } = renderHook(() => useRoomState({
      ...defaultOptions,
      autoSave: false,
    }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Fast-forward time - should not trigger auto-save
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(fetch).toHaveBeenCalledTimes(1); // Only initial load
  });

  it('should not auto-save when already saving', async () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(true);
    });

    // Trigger a save that will never complete
    act(() => {
      result.current.saveRoomState({});
    });

    // Fast-forward time - should not trigger auto-save while saving
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + manual save
  });

  it('should handle save errors', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockRoomState }) // Initial load
      .mockRejectedValueOnce(new Error('Save failed')); // Save error

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.saveRoomState({});
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Save failed');
    });
  });

  it('should clean up timeouts on unmount', () => {
    const { unmount } = renderHook(() => useRoomState(defaultOptions));

    // This should not cause memory leaks
    unmount();
  });

  it('should handle network errors during save', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockRoomState }) // Initial load
      .mockResolvedValueOnce({ ok: false, status: 500 }); // Save error

    const { result } = renderHook(() => useRoomState(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.saveRoomState({});
    });

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to save room state: 500');
    });
  });
});
