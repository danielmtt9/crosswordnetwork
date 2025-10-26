/**
 * Hook for managing room persistence
 */

import { useState, useEffect, useCallback } from 'react';

interface RoomPersistenceStatus {
  isPersistent: boolean;
  persistenceDays: number;
  autoCleanup: boolean;
  expiresAt: Date | null;
  lastActivityAt: Date;
  isExpired: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
}

interface RoomAnalytics {
  roomId: string;
  totalParticipants: number;
  activeParticipants: number;
  sessionDuration: number;
  completionRate: number;
  messageCount: number;
  lastActivityAt: Date;
  createdAt: Date;
}

interface UseRoomPersistenceOptions {
  roomId: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useRoomPersistence({
  roomId,
  autoRefresh = true,
  refreshInterval = 60000 // 1 minute
}: UseRoomPersistenceOptions) {
  const [persistence, setPersistence] = useState<RoomPersistenceStatus | null>(null);
  const [analytics, setAnalytics] = useState<RoomAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPersistenceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/multiplayer/rooms/${roomId}/persistence`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch persistence data: ${response.statusText}`);
      }

      const data = await response.json();
      setPersistence(data.persistence);
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const extendPersistence = useCallback(async (additionalDays: number = 7) => {
    try {
      setError(null);

      const response = await fetch(`/api/multiplayer/rooms/${roomId}/persistence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'extend',
          additionalDays
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to extend persistence: ${response.statusText}`);
      }

      // Refresh data after successful extension
      await fetchPersistenceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [roomId, fetchPersistenceData]);

  const updatePersistenceSettings = useCallback(async (settings: {
    isPersistent: boolean;
    persistenceDays: number;
    autoCleanup: boolean;
  }) => {
    try {
      setError(null);

      const response = await fetch(`/api/multiplayer/rooms/${roomId}/persistence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_settings',
          ...settings
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update persistence settings: ${response.statusText}`);
      }

      // Refresh data after successful update
      await fetchPersistenceData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [roomId, fetchPersistenceData]);

  const updateActivity = useCallback(async (activityType: string, metadata?: Record<string, any>) => {
    try {
      // Update activity timestamp locally for immediate UI feedback
      if (persistence) {
        setPersistence(prev => prev ? {
          ...prev,
          lastActivityAt: new Date(),
          minutesRemaining: Math.max(0, prev.minutesRemaining)
        } : null);
      }

      // Send activity update to server
      await fetch(`/api/multiplayer/rooms/${roomId}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activityType,
          metadata
        })
      });
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  }, [roomId, persistence]);

  // Initial fetch
  useEffect(() => {
    if (roomId) {
      fetchPersistenceData();
    }
  }, [roomId, fetchPersistenceData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !roomId) return;

    const interval = setInterval(fetchPersistenceData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, roomId, refreshInterval, fetchPersistenceData]);

  // Check if room is expiring soon (within 24 hours)
  const isExpiringSoon = persistence ? persistence.hoursRemaining <= 24 : false;
  const isExpired = persistence ? persistence.isExpired : false;
  const isActive = persistence ? !isExpired && persistence.daysRemaining > 0 : false;

  return {
    persistence,
    analytics,
    isLoading,
    error,
    isExpiringSoon,
    isExpired,
    isActive,
    extendPersistence,
    updatePersistenceSettings,
    updateActivity,
    refresh: fetchPersistenceData
  };
}

export default useRoomPersistence;
