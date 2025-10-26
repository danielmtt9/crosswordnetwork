/**
 * Hook for managing room analytics data
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface RoomAnalyticsData {
  totalParticipants: number;
  activeParticipants: number;
  sessionDuration: number;
  completionRate: number;
  totalMessages: number;
  totalPuzzleEdits: number;
  messagesPerHour: number;
  puzzleEditsPerHour: number;
  mostActiveUser: string;
  performanceScore: number;
  avgResponseTime: number;
  accuracy: number;
  uptime: number;
  engagementData: Array<{
    time: string;
    messages: number;
    puzzleEdits: number;
  }>;
  participantData: Array<{
    name: string;
    messages: number;
    puzzleEdits: number;
  }>;
  roleDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  activityTimeline: Array<{
    time: string;
    activity: number;
  }>;
  performanceData: Array<{
    time: string;
    responseTime: number;
    accuracy: number;
  }>;
}

interface UseRoomAnalyticsProps {
  roomId: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

export function useRoomAnalytics({ roomId, timeRange = '24h' }: UseRoomAnalyticsProps) {
  const [analytics, setAnalytics] = useState<RoomAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/analytics?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching room analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, timeRange]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportData = useCallback(async () => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/analytics/export?timeRange=${timeRange}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-analytics-${roomId}-${timeRange}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Analytics data exported successfully!');
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  }, [roomId, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    isLoading,
    error,
    refresh,
    exportData
  };
}
