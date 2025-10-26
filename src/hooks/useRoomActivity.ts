/**
 * Hook for managing room activity data
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface RoomActivityData {
  activityLevel: number;
  isConnected: boolean;
  latency?: number;
  activeUsers: number;
  totalUsers: number;
  messagesPerMinute: number;
  totalMessages: number;
  puzzleActionsPerMinute: number;
  completionRate: number;
  recentActivity: Array<{
    type: 'message' | 'puzzle' | 'user';
    description: string;
    timestamp: Date;
  }>;
  syncLatency: number;
  uptime: number;
  throughput: number;
  isTyping: boolean;
  hasNewMessages: boolean;
  hasPuzzleUpdates: boolean;
  hasUserChanges: boolean;
}

interface UseRoomActivityProps {
  roomId: string;
  refreshInterval?: number;
}

export function useRoomActivity({ roomId, refreshInterval = 5000 }: UseRoomActivityProps) {
  const [activity, setActivity] = useState<RoomActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/activity`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activity: ${response.statusText}`);
      }

      const data = await response.json();
      setActivity(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching room activity:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchActivity, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchActivity, refreshInterval]);

  return {
    activity,
    isLoading,
    error,
    refresh
  };
}
