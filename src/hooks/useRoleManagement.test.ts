import { renderHook, act } from '@testing-library/react';
import { useRoleManagement } from './useRoleManagement';

// Mock fetch
global.fetch = jest.fn();

describe('useRoleManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRoleManagement());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should change role successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.changeRole({
        userId: 'user123',
        newRole: 'MODERATOR',
        reason: 'Promoting to moderator'
      });
    });

    expect(success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/user123/participants/user123/role',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'MODERATOR',
          reason: 'Promoting to moderator'
        })
      })
    );
  });

  it('should handle role change error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Permission denied' })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.changeRole({
        userId: 'user123',
        newRole: 'MODERATOR',
        reason: 'Promoting to moderator'
      });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Permission denied');
  });

  it('should promote user successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.promoteUser('user123', 'Promoting to moderator');
    });

    expect(success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/user123/participants/user123/promote',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Promoting to moderator' })
      })
    );
  });

  it('should handle promotion error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'User not found' })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.promoteUser('user123', 'Promoting to moderator');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('User not found');
  });

  it('should demote user successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.demoteUser('user123', 'SPECTATOR', 'Demoting to spectator');
    });

    expect(success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/user123/participants/user123/demote',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newRole: 'SPECTATOR',
          reason: 'Demoting to spectator'
        })
      })
    );
  });

  it('should handle demotion error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'User is not a moderator' })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.demoteUser('user123', 'SPECTATOR', 'Demoting to spectator');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('User is not a moderator');
  });

  it('should transfer host successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.transferHost('user123', 'Transferring host ownership');
    });

    expect(success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/user123/host/transfer',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newHostUserId: 'user123',
          reason: 'Transferring host ownership'
        })
      })
    );
  });

  it('should handle host transfer error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'New host must be online' })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.transferHost('user123', 'Transferring host ownership');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('New host must be online');
  });

  it('should remove participant successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.removeParticipant('user123', 'Removing participant');
    });

    expect(success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/user123/participants/user123/role',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Removing participant' })
      })
    );
  });

  it('should handle participant removal error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Participant not found' })
    });

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.removeParticipant('user123', 'Removing participant');
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Participant not found');
  });

  it('should get activity logs successfully', async () => {
    const mockLogs = {
      logs: [
        {
          id: 'log1',
          action: 'ROLE_CHANGED',
          details: { oldRole: 'PLAYER', newRole: 'MODERATOR' },
          timestamp: new Date(),
          user: { id: 'user1', name: 'User 1' }
        }
      ],
      pagination: {
        page: 1,
        limit: 50,
        totalCount: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockLogs)
    });

    const { result } = renderHook(() => useRoleManagement());

    let logs = null;
    await act(async () => {
      logs = await result.current.getActivityLogs('room123', {
        page: 1,
        limit: 50,
        action: 'ROLE_CHANGED'
      });
    });

    expect(logs).toEqual(mockLogs);
    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/room123/activity?page=1&limit=50&action=ROLE_CHANGED'
    );
  });

  it('should handle activity logs error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Access denied' })
    });

    const { result } = renderHook(() => useRoleManagement());

    let logs = null;
    await act(async () => {
      logs = await result.current.getActivityLogs('room123');
    });

    expect(logs).toBeNull();
    expect(result.current.error).toBe('Access denied');
  });

  it('should handle network errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useRoleManagement());

    let success = false;
    await act(async () => {
      success = await result.current.changeRole({
        userId: 'user123',
        newRole: 'MODERATOR'
      });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe('Network error');
  });
});