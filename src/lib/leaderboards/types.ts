export type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
export type LeaderboardScope = 'GLOBAL' | 'PUZZLE' | 'DIFFICULTY';
export type LeaderboardMetric = 
  | 'fastest_time'
  | 'highest_score'
  | 'most_completed'
  | 'best_accuracy'
  | 'longest_streak'
  | 'most_achievements'
  | 'highest_rank';

export interface LeaderboardEntry {
  id: string;
  period: LeaderboardPeriod;
  scope: LeaderboardScope;
  scopeId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  metric: LeaderboardMetric;
  value: number;
  rank?: number;
  periodStart: Date;
  periodEnd: Date;
  computedAt: Date;
  updatedAt: Date;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userEntry?: LeaderboardEntry;
  total: number;
  period: LeaderboardPeriod;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  puzzle?: {
    id: number;
    title: string;
  };
}

export interface LeaderboardFilters {
  period: LeaderboardPeriod;
  scope: LeaderboardScope;
  metric: LeaderboardMetric;
  scopeId?: string;
  limit?: number;
  offset?: number;
}

export interface LeaderboardStats {
  totalEntries: number;
  userRank?: number;
  userValue?: number;
  topValue: number;
  averageValue: number;
}

// Leaderboard configuration
export const LEADERBOARD_PERIODS: Record<LeaderboardPeriod, {
  name: string;
  description: string;
  icon: string;
}> = {
  DAILY: {
    name: 'Daily',
    description: 'Today\'s top performers',
    icon: 'Calendar',
  },
  WEEKLY: {
    name: 'Weekly',
    description: 'This week\'s leaders',
    icon: 'TrendingUp',
  },
  MONTHLY: {
    name: 'Monthly',
    description: 'This month\'s champions',
    icon: 'Clock',
  },
  ALL_TIME: {
    name: 'All Time',
    description: 'All-time legends',
    icon: 'Trophy',
  },
};

export const LEADERBOARD_SCOPES: Record<LeaderboardScope, {
  name: string;
  description: string;
  icon: string;
}> = {
  GLOBAL: {
    name: 'Global',
    description: 'All puzzles combined',
    icon: 'Globe',
  },
  PUZZLE: {
    name: 'Puzzle',
    description: 'Specific puzzle',
    icon: 'Puzzle',
  },
  DIFFICULTY: {
    name: 'Difficulty',
    description: 'By difficulty level',
    icon: 'Target',
  },
};

export const LEADERBOARD_METRICS: Record<LeaderboardMetric, {
  name: string;
  description: string;
  icon: string;
  format: (value: number) => string;
  sortOrder: 'asc' | 'desc';
}> = {
  fastest_time: {
    name: 'Fastest Time',
    description: 'Quickest puzzle solvers',
    icon: 'Clock',
    format: (value: number) => {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    sortOrder: 'asc',
  },
  highest_score: {
    name: 'Highest Score',
    description: 'Top scorers',
    icon: 'Target',
    format: (value: number) => value.toLocaleString(),
    sortOrder: 'desc',
  },
  most_completed: {
    name: 'Most Completed',
    description: 'Most puzzles solved',
    icon: 'Trophy',
    format: (value: number) => value.toString(),
    sortOrder: 'desc',
  },
  best_accuracy: {
    name: 'Best Accuracy',
    description: 'Most accurate solvers',
    icon: 'Target',
    format: (value: number) => `${value.toFixed(1)}%`,
    sortOrder: 'desc',
  },
  longest_streak: {
    name: 'Longest Streak',
    description: 'Longest daily streaks',
    icon: 'Flame',
    format: (value: number) => `${value} days`,
    sortOrder: 'desc',
  },
  most_achievements: {
    name: 'Most Achievements',
    description: 'Most achievements earned',
    icon: 'Award',
    format: (value: number) => value.toString(),
    sortOrder: 'desc',
  },
  highest_rank: {
    name: 'Highest Rank',
    description: 'Best overall ranking',
    icon: 'Crown',
    format: (value: number) => `#${value}`,
    sortOrder: 'asc',
  },
};

// Helper functions
export function getPeriodDates(period: LeaderboardPeriod): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date = now;

  switch (period) {
    case 'DAILY':
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'WEEKLY':
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - daysToMonday);
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'MONTHLY':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'ALL_TIME':
      periodStart = new Date(0);
      break;
  }

  return { periodStart, periodEnd };
}

export function formatLeaderboardValue(value: number, metric: LeaderboardMetric): string {
  return LEADERBOARD_METRICS[metric].format(value);
}

export function getLeaderboardSortOrder(metric: LeaderboardMetric): 'asc' | 'desc' {
  return LEADERBOARD_METRICS[metric].sortOrder;
}
