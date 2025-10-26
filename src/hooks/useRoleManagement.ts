import { useState, useCallback } from 'react';

interface RoleChangeRequest {
  userId: string;
  newRole: 'HOST' | 'MODERATOR' | 'PLAYER' | 'SPECTATOR';
  reason?: string;
}

interface RoleManagementReturn {
  isLoading: boolean;
  error: string | null;
  changeRole: (request: RoleChangeRequest) => Promise<boolean>;
  promoteUser: (userId: string, reason?: string) => Promise<boolean>;
  demoteUser: (userId: string, newRole: 'PLAYER' | 'SPECTATOR', reason?: string) => Promise<boolean>;
  transferHost: (newHostUserId: string, reason?: string) => Promise<boolean>;
  removeParticipant: (userId: string, reason?: string) => Promise<boolean>;
  getActivityLogs: (roomId: string, filters?: {
    page?: number;
    limit?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<any>;
}

export function useRoleManagement(): RoleManagementReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeRole = useCallback(async (request: RoleChangeRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${request.userId}/participants/${request.userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: request.newRole,
          reason: request.reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to change role');
      }

      return true;
    } catch (err) {
      console.error('Error changing role:', err);
      setError(err instanceof Error ? err.message : 'Failed to change role');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const promoteUser = useCallback(async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${userId}/participants/${userId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote user');
      }

      return true;
    } catch (err) {
      console.error('Error promoting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to promote user');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const demoteUser = useCallback(async (userId: string, newRole: 'PLAYER' | 'SPECTATOR', reason?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${userId}/participants/${userId}/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newRole,
          reason 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to demote user');
      }

      return true;
    } catch (err) {
      console.error('Error demoting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to demote user');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const transferHost = useCallback(async (newHostUserId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${newHostUserId}/host/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newHostUserId,
          reason 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transfer host ownership');
      }

      return true;
    } catch (err) {
      console.error('Error transferring host ownership:', err);
      setError(err instanceof Error ? err.message : 'Failed to transfer host ownership');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeParticipant = useCallback(async (userId: string, reason?: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${userId}/participants/${userId}/role`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove participant');
      }

      return true;
    } catch (err) {
      console.error('Error removing participant:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove participant');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActivityLogs = useCallback(async (roomId: string, filters?: {
    page?: number;
    limit?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (filters?.page) searchParams.set('page', filters.page.toString());
      if (filters?.limit) searchParams.set('limit', filters.limit.toString());
      if (filters?.action) searchParams.set('action', filters.action);
      if (filters?.startDate) searchParams.set('startDate', filters.startDate);
      if (filters?.endDate) searchParams.set('endDate', filters.endDate);

      const response = await fetch(`/api/multiplayer/rooms/${roomId}/activity?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch activity logs');
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activity logs');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    changeRole,
    promoteUser,
    demoteUser,
    transferHost,
    removeParticipant,
    getActivityLogs
  };
}