import { renderHook, act, waitFor } from '@testing-library/react';
import { useRoomSettings } from './useRoomSettings';

// Mock fetch
global.fetch = jest.fn();

describe('useRoomSettings', () => {
  const mockProps = {
    roomId: 'room123',
    isHost: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useRoomSettings(mockProps));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should load room settings and collaborator count', async () => {
    const mockSettings = {
      maxCollaborators: 5,
      allowSpectators: true,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'SPECTATOR'
    };

    const mockCollaboratorCount = { count: 3 };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCollaboratorCount)
      });

    const { result } = renderHook(() => useRoomSettings(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.currentCollaboratorCount).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useRoomSettings(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toMatch(/Failed to load/);
  });

  it('should update settings successfully', async () => {
    const mockSettings = {
      maxCollaborators: 5,
      allowSpectators: true,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'SPECTATOR'
    };

    const updatedSettings = {
      maxCollaborators: 8,
      allowSpectators: false,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'PLAYER'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedSettings)
      });

    const { result } = renderHook(() => useRoomSettings(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.updateSettings(updatedSettings);
    });

    expect(success).toBe(true);
    expect(result.current.settings).toEqual(updatedSettings);
  });

  it('should deny settings update for non-host', async () => {
    const mockSettings = {
      maxCollaborators: 5,
      allowSpectators: true,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'SPECTATOR'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      });

    const { result } = renderHook(() => useRoomSettings({
      ...mockProps,
      isHost: false
    }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.updateSettings(mockSettings);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Only room host can modify settings');
  });

  it('should handle settings update failure', async () => {
    const mockSettings = {
      maxCollaborators: 5,
      allowSpectators: true,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'SPECTATOR'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid settings' })
      });

    const { result } = renderHook(() => useRoomSettings(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let success: boolean;
    await act(async () => {
      success = await result.current.updateSettings(mockSettings);
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Invalid settings');
  });

  it('should refresh settings', async () => {
    const mockSettings = {
      maxCollaborators: 5,
      allowSpectators: true,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'SPECTATOR'
    };

    const updatedSettings = {
      maxCollaborators: 8,
      allowSpectators: false,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'PLAYER'
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 3 })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedSettings)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ count: 5 })
      });

    const { result } = renderHook(() => useRoomSettings(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshSettings();
    });

    expect(result.current.settings).toEqual(updatedSettings);
    expect(result.current.currentCollaboratorCount).toBe(5);
  });
});
