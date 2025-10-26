import { renderHook, act, waitFor } from '@testing-library/react';
import { useParticipantList } from './useParticipantList';

// Mock fetch
global.fetch = jest.fn();

describe('useParticipantList', () => {
  const mockProps = {
    roomId: 'room123',
    currentUserId: 'user123',
    currentUserRole: 'HOST' as const,
    isHost: true,
    isModerator: false
  };

  const mockParticipants = [
    {
      userId: 'user1',
      userName: 'Alice Johnson',
      userEmail: 'alice@example.com',
      avatarUrl: 'https://example.com/avatar1.jpg',
      role: 'HOST' as const,
      subscriptionStatus: 'ACTIVE' as const,
      isOnline: true,
      userStatus: 'online' as const,
      isPremium: true,
      isHost: true,
      isModerator: false,
      joinedAt: '2024-01-01T10:00:00Z',
      lastSeenAt: '2024-01-01T12:00:00Z',
      isActive: true,
      connectionQuality: 'excellent' as const
    },
    {
      userId: 'user2',
      userName: 'Bob Smith',
      userEmail: 'bob@example.com',
      avatarUrl: 'https://example.com/avatar2.jpg',
      role: 'PLAYER' as const,
      subscriptionStatus: 'TRIAL' as const,
      isOnline: true,
      userStatus: 'away' as const,
      isPremium: false,
      isHost: false,
      isModerator: false,
      joinedAt: '2024-01-01T10:30:00Z',
      lastSeenAt: '2024-01-01T11:30:00Z',
      isActive: true,
      connectionQuality: 'good' as const
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  it('should initialize with empty participants', () => {
    const { result } = renderHook(() => useParticipantList(mockProps));

    expect(result.current.participants).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should fetch participants successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.participants).toEqual(mockParticipants);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.participants).toEqual([]);
  });

  it('should calculate participant counts correctly', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.participantCounts).toEqual({
      online: 2,
      total: 2,
      hosts: 1,
      players: 1,
      spectators: 0,
      moderators: 0
    });
  });

  it('should refresh participants', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock second fetch for refresh
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: [...mockParticipants, { ...mockParticipants[0], userId: 'user3' }] })
    });

    await act(async () => {
      await result.current.refreshParticipants();
    });

    expect(result.current.participants).toHaveLength(3);
  });

  it('should kick user successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock kick user API call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await act(async () => {
      await result.current.kickUser('user2');
    });

    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].userId).toBe('user1');
  });

  it('should promote user to moderator', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock promote API call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await act(async () => {
      await result.current.promoteToModerator('user2');
    });

    const promotedUser = result.current.participants.find(p => p.userId === 'user2');
    expect(promotedUser?.role).toBe('MODERATOR');
    expect(promotedUser?.isModerator).toBe(true);
  });

  it('should demote moderator', async () => {
    const participantsWithModerator = [
      ...mockParticipants,
      {
        ...mockParticipants[0],
        userId: 'user3',
        role: 'MODERATOR' as const,
        isModerator: true
      }
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: participantsWithModerator })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock demote API call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await act(async () => {
      await result.current.demoteFromModerator('user3');
    });

    const demotedUser = result.current.participants.find(p => p.userId === 'user3');
    expect(demotedUser?.role).toBe('SPECTATOR');
    expect(demotedUser?.isModerator).toBe(false);
  });

  it('should mute user', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock mute API call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await act(async () => {
      await result.current.muteUser('user2');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/room123/participants/user2/mute',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('should unmute user', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock unmute API call
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    await act(async () => {
      await result.current.unmuteUser('user2');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/multiplayer/rooms/room123/participants/user2/unmute',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('should handle kick user error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Mock kick user API error
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'User not found' })
    });

    await expect(async () => {
      await act(async () => {
        await result.current.kickUser('user2');
      });
    }).rejects.toThrow('User not found');
  });

  it('should handle insufficient permissions for kick', async () => {
    const nonHostProps = {
      ...mockProps,
      isHost: false,
      isModerator: false
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(nonHostProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.kickUser('user2');
      });
    }).rejects.toThrow('Insufficient permissions');
  });

  it('should handle send private message', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    act(() => {
      result.current.sendPrivateMessage('user2');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Opening private chat with user user2');
    
    consoleSpy.mockRestore();
  });

  it('should handle view profile', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ participants: mockParticipants })
    });

    const { result } = renderHook(() => useParticipantList(mockProps));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    act(() => {
      result.current.viewProfile('user2');
    });

    expect(consoleSpy).toHaveBeenCalledWith('Viewing profile for user user2');
    
    consoleSpy.mockRestore();
  });
});
