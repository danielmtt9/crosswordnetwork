import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  metric: string;
  value: number;
  rank: number;
}

interface MultiplayerLeaderboardProps {
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
  limit?: number;
  className?: string;
}

export function MultiplayerLeaderboard({
  period = 'ALL_TIME',
  limit = 10,
  className
}: MultiplayerLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod, limit]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/multiplayer/stats?type=leaderboard&period=${selectedPeriod}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const data = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'DAILY': return 'Today';
      case 'WEEKLY': return 'This Week';
      case 'MONTHLY': return 'This Month';
      case 'ALL_TIME': return 'All Time';
      default: return 'All Time';
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'rooms_completed': return 'Rooms Completed';
      case 'rooms_hosted': return 'Rooms Hosted';
      case 'total_score': return 'Total Score';
      case 'fastest_time': return 'Fastest Time';
      default: return 'Score';
    }
  };

  if (loading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                <div className="w-12 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <div className="text-red-600 text-sm">
          Error loading leaderboard: {error}
        </div>
        <button
          onClick={fetchLeaderboard}
          className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Multiplayer Leaderboard
        </h3>
        <div className="flex space-x-1">
          {(['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                selectedPeriod === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🏆</div>
            <div>No data available for {getPeriodLabel(selectedPeriod).toLowerCase()}</div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {leaderboard.map((entry, index) => (
              <LeaderboardEntry
                key={entry.userId}
                entry={entry}
                index={index}
                metricLabel={getMetricLabel(entry.metric)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Showing top {limit} players by {getMetricLabel(leaderboard[0]?.metric || 'score').toLowerCase()}
      </div>
    </div>
  );
}

interface LeaderboardEntryProps {
  entry: LeaderboardEntry;
  index: number;
  metricLabel: string;
}

function LeaderboardEntry({ entry, index, metricLabel }: LeaderboardEntryProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'text-yellow-600';
      case 2: return 'text-gray-500';
      case 3: return 'text-amber-600';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center p-4 hover:bg-gray-50 transition-colors">
      {/* Rank */}
      <div className={cn(
        "w-8 text-center font-bold text-lg",
        getRankColor(entry.rank)
      )}>
        {getRankIcon(entry.rank)}
      </div>

      {/* Avatar */}
      <div className="w-10 h-10 ml-3">
        {entry.userAvatar ? (
          <img
            src={entry.userAvatar}
            alt={entry.userName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {entry.userName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 ml-3">
        <div className="font-medium text-gray-900">{entry.userName}</div>
        <div className="text-sm text-gray-500">{metricLabel}</div>
      </div>

      {/* Value */}
      <div className="text-right">
        <div className="font-bold text-gray-900">
          {formatValue(entry.value, entry.metric)}
        </div>
        <div className="text-xs text-gray-500">
          {entry.metric === 'rooms_completed' ? 'rooms' : 'points'}
        </div>
      </div>
    </div>
  );
}

function formatValue(value: number, metric: string): string {
  switch (metric) {
    case 'fastest_time':
      return formatDuration(value);
    case 'total_score':
    case 'rooms_completed':
    case 'rooms_hosted':
      return value.toLocaleString();
    default:
      return value.toString();
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
