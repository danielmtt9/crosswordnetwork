import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpectatorMode } from './useSpectatorMode';

// Mock fetch
global.fetch = jest.fn();

describe('useSpectatorMode', () => {
  const mockProps = {
    roomId: 'room123',
    currentUserId: 'user123',
    currentUserRole: 'SPECTATOR' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    expect(result.current.isWatching).toBe(false);
    expect(result.current.isSpectator).toBe(true);
    expect(result.current.canUpgrade).toBe(true);
    expect(result.current.activeCollaborators).toBe(0);
    expect(result.current.puzzleProgress).toBe(0);
    expect(result.current.recentActivity).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should identify non-spectators correctly', () => {
    const { result } = renderHook(() => useSpectatorMode({
      ...mockProps,
      currentUserRole: 'PLAYER'
    }));

    expect(result.current.isSpectator).toBe(false);
    expect(result.current.canUpgrade).toBe(false);
  });

  it('should start watching', () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    act(() => {
      result.current.startWatching();
    });

    expect(result.current.isWatching).toBe(true);
  });

  it('should stop watching', () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    act(() => {
      result.current.startWatching();
    });

    expect(result.current.isWatching).toBe(true);

    act(() => {
      result.current.stopWatching();
    });

    expect(result.current.isWatching).toBe(false);
  });

  it('should request upgrade successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useSpectatorMode(mockProps));

    await act(async () => {
      await result.current.requestUpgrade();
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/room123/upgrade-request',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123' })
      })
    );
  });

  it('should handle upgrade request failure', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Upgrade failed' })
    });

    const { result } = renderHook(() => useSpectatorMode(mockProps));

    await act(async () => {
      await result.current.requestUpgrade();
    });

    expect(result.current.error).toBe('Upgrade failed');
  });

  it('should not allow upgrade for non-spectators', async () => {
    const { result } = renderHook(() => useSpectatorMode({
      ...mockProps,
      currentUserRole: 'PLAYER'
    }));

    await act(async () => {
      await result.current.requestUpgrade();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it('should simulate activity updates when watching', async () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    act(() => {
      result.current.startWatching();
    });

    // Wait for simulated activity
    await waitFor(() => {
      expect(result.current.recentActivity.length).toBeGreaterThan(0);
    }, { timeout: 10000 });

    expect(result.current.recentActivity[0]).toHaveProperty('userId');
    expect(result.current.recentActivity[0]).toHaveProperty('userName');
    expect(result.current.recentActivity[0]).toHaveProperty('action');
    expect(result.current.recentActivity[0]).toHaveProperty('timestamp');
    expect(result.current.recentActivity[0]).toHaveProperty('type');
  }, 15000);

  it('should update puzzle progress when watching', async () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    act(() => {
      result.current.startWatching();
    });

    // Wait for progress updates
    await waitFor(() => {
      expect(result.current.puzzleProgress).toBeGreaterThan(0);
    }, { timeout: 5000 });
  });

  it('should update active collaborators count when watching', async () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    act(() => {
      result.current.startWatching();
    });

    // Wait for collaborator count updates
    await waitFor(() => {
      expect(result.current.activeCollaborators).toBeGreaterThan(0);
    }, { timeout: 10000 });
  }, 15000);

  it('should not simulate updates when not watching', async () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    // Don't start watching
    await new Promise(resolve => setTimeout(resolve, 3000));

    expect(result.current.recentActivity).toEqual([]);
    expect(result.current.puzzleProgress).toBe(0);
    expect(result.current.activeCollaborators).toBe(0);
  });

  it('should limit recent activity to 10 items', async () => {
    const { result } = renderHook(() => useSpectatorMode(mockProps));

    act(() => {
      result.current.startWatching();
    });

    // Wait for some activity
    await waitFor(() => {
      expect(result.current.recentActivity.length).toBeGreaterThan(0);
    }, { timeout: 10000 });

    // Should not exceed 10 items
    expect(result.current.recentActivity.length).toBeLessThanOrEqual(10);
  }, 15000);

  it('should handle network errors during upgrade request', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSpectatorMode(mockProps));

    await act(async () => {
      await result.current.requestUpgrade();
    });

    expect(result.current.error).toBe('Network error');
  });
});