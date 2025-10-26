import React, { useState, useEffect } from 'react';
import { MultiplayerAnalytics } from '../lib/multiplayerAnalytics';
import { cn } from '../lib/utils';

interface MultiplayerAnalyticsDashboardProps {
  userId?: string;
  isAdmin?: boolean;
  className?: string;
}

export function MultiplayerAnalyticsDashboard({
  userId,
  isAdmin = false,
  className
}: MultiplayerAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<MultiplayerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'performance' | 'social'>('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, userId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const startDate = getStartDate(selectedPeriod);
      const endDate = new Date();

      const url = userId 
        ? `/api/multiplayer/analytics?type=user&userId=${userId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        : `/api/multiplayer/analytics?type=overview&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics || data.userAnalytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  if (loading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <div className="text-red-600 text-sm">
          Error loading analytics: {error}
        </div>
        <button
          onClick={fetchAnalytics}
          className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <div className="text-gray-500 text-sm">
          No analytics data available
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {userId ? 'User Analytics' : 'Multiplayer Analytics'}
        </h2>
        
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <div className="flex space-x-1">
            {(['7d', '30d', '90d', '1y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                  selectedPeriod === period
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {isAdmin && (
        <div className="flex space-x-1 border-b border-gray-200">
          {(['overview', 'engagement', 'performance', 'social'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === 'overview' && <OverviewTab analytics={analytics} />}
      {activeTab === 'engagement' && isAdmin && <EngagementTab analytics={analytics} />}
      {activeTab === 'performance' && isAdmin && <PerformanceTab analytics={analytics} />}
      {activeTab === 'social' && isAdmin && <SocialTab analytics={analytics} />}
    </div>
  );
}

interface TabProps {
  analytics: MultiplayerAnalytics;
}

function OverviewTab({ analytics }: TabProps) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sessions"
          value={analytics.totalSessions.toLocaleString()}
          icon="🎮"
          color="blue"
        />
        <MetricCard
          title="Avg Session Duration"
          value={formatDuration(analytics.averageSessionDuration)}
          icon="⏱️"
          color="green"
        />
        <MetricCard
          title="Rooms Completed"
          value={analytics.roomsCompleted.toLocaleString()}
          icon="✅"
          color="purple"
        />
        <MetricCard
          title="Completion Rate"
          value={`${analytics.completionRate.toFixed(1)}%`}
          icon="📊"
          color="orange"
        />
      </div>

      {/* Role Distribution */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
        <div className="space-y-3">
          {analytics.roleDistribution.map((role) => (
            <div key={role.role} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-gray-700">
                  {role.role}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${role.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">
                  {role.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Most Popular Puzzles */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Popular Puzzles</h3>
        <div className="space-y-3">
          {analytics.mostPopularPuzzles.slice(0, 5).map((puzzle, index) => (
            <div key={puzzle.puzzleId} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {puzzle.title}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {puzzle.playCount} plays
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EngagementTab({ analytics }: TabProps) {
  return (
    <div className="space-y-6">
      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Daily Active Users"
          value={analytics.dailyActiveUsers.toLocaleString()}
          icon="👥"
          color="blue"
        />
        <MetricCard
          title="Weekly Active Users"
          value={analytics.weeklyActiveUsers.toLocaleString()}
          icon="📅"
          color="green"
        />
        <MetricCard
          title="Monthly Active Users"
          value={analytics.monthlyActiveUsers.toLocaleString()}
          icon="📊"
          color="purple"
        />
      </div>

      {/* Activity Patterns */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Activity Hours</h3>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {analytics.mostActiveHours.slice(0, 24).map((hour) => (
            <div key={hour.hour} className="text-center">
              <div className="text-xs text-gray-600 mb-1">{hour.hour}:00</div>
              <div
                className="bg-blue-500 rounded-sm"
                style={{ height: `${Math.max(hour.count * 2, 4)}px` }}
                title={`${hour.count} sessions`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ analytics }: TabProps) {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Average Score"
          value={analytics.averageScore.toFixed(0)}
          icon="🎯"
          color="blue"
        />
        <MetricCard
          title="Best Score"
          value={analytics.bestScore.toLocaleString()}
          icon="🏆"
          color="gold"
        />
        <MetricCard
          title="Avg Completion Time"
          value={formatDuration(analytics.averageCompletionTime)}
          icon="⏱️"
          color="green"
        />
        <MetricCard
          title="Hint Usage Rate"
          value={`${analytics.hintUsageRate.toFixed(1)}%`}
          icon="💡"
          color="orange"
        />
      </div>
    </div>
  );
}

function SocialTab({ analytics }: TabProps) {
  return (
    <div className="space-y-6">
      {/* Social Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Total Connections"
          value={analytics.totalUniqueConnections.toLocaleString()}
          icon="🤝"
          color="blue"
        />
        <MetricCard
          title="Avg Connections/User"
          value={analytics.averageConnectionsPerUser.toFixed(1)}
          icon="👥"
          color="green"
        />
      </div>

      {/* Most Social Users */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Social Users</h3>
        <div className="space-y-3">
          {analytics.mostSocialUsers.slice(0, 10).map((user, index) => (
            <div key={user.userId} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                  {index + 1}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user.userName}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {user.connections} connections
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'gold' | 'red';
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    gold: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    red: 'bg-red-50 border-red-200 text-red-800'
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
