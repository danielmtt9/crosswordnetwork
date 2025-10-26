import React, { useState, useEffect } from 'react';
import { MultiplayerStats } from '../lib/multiplayerStats';
import { cn } from '../lib/utils';

interface MultiplayerStatsDisplayProps {
  userId: string;
  className?: string;
}

export function MultiplayerStatsDisplay({
  userId,
  className
}: MultiplayerStatsDisplayProps) {
  const [stats, setStats] = useState<MultiplayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/multiplayer/stats?userId=${userId}&type=user`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse space-y-4" data-testid="loading-skeleton">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <div className="text-red-600 text-sm">
          Error loading stats: {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <div className="text-gray-500 text-sm">
          No multiplayer stats available
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Rooms Joined"
          value={stats.roomsJoined}
          icon="🏠"
          color="blue"
        />
        <StatCard
          title="Rooms Hosted"
          value={stats.roomsHosted}
          icon="👑"
          color="purple"
        />
        <StatCard
          title="Rooms Completed"
          value={stats.roomsCompleted}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.multiplayerCompletionRate.toFixed(1)}%`}
          icon="📊"
          color="orange"
        />
      </div>

      {/* Role Statistics */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Statistics</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.timesAsHost}</div>
            <div className="text-sm text-gray-600">Times as Host</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.timesAsPlayer}</div>
            <div className="text-sm text-gray-600">Times as Player</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.timesAsSpectator}</div>
            <div className="text-sm text-gray-600">Times as Spectator</div>
          </div>
        </div>
      </div>

      {/* Social Metrics */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Metrics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.uniquePlayersMet}</div>
            <div className="text-sm text-gray-600">Unique Players Met</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">{stats.friendsPlayedWith}</div>
            <div className="text-sm text-gray-600">Friends Played With</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.averageMultiplayerScore.toFixed(0)}</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.bestMultiplayerScore}</div>
            <div className="text-sm text-gray-600">Best Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">{formatDuration(stats.averageSessionDuration)}</div>
            <div className="text-sm text-gray-600">Avg Session</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-600">{formatDuration(stats.totalMultiplayerTime)}</div>
            <div className="text-sm text-gray-600">Total Time</div>
          </div>
        </div>
      </div>

      {/* Streak Information */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Streak</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.currentStreak}</div>
            <div className="text-sm text-gray-600">Current Streak (days)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.longestStreak}</div>
            <div className="text-sm text-gray-600">Longest Streak (days)</div>
          </div>
        </div>
        {stats.lastMultiplayerSession && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Last multiplayer session: {stats.lastMultiplayerSession.toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Achievement Summary */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gold-600">{stats.multiplayerAchievementsEarned}</div>
            <div className="text-sm text-gray-600">Achievements Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.multiplayerAchievementPoints}</div>
            <div className="text-sm text-gray-600">Achievement Points</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800'
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border",
      colorClasses[color]
    )}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm opacity-80">{title}</div>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
