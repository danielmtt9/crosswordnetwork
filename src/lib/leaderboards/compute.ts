import { prisma } from '@/lib/prisma';

export type LeaderboardPeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME';
export type LeaderboardScope = 'GLOBAL' | 'PUZZLE' | 'DIFFICULTY';
export type LeaderboardMetric = 'fastest_time' | 'highest_score' | 'most_completed' | 'best_accuracy' | 'longest_streak';

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

export async function computeGlobalLeaderboard(
  period: LeaderboardPeriod,
  metric: LeaderboardMetric,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const { periodStart, periodEnd } = getPeriodDates(period);

  let entries: LeaderboardEntry[] = [];

  switch (metric) {
    case 'fastest_time':
      entries = await computeFastestTimeLeaderboard(periodStart, periodEnd, limit);
      break;
    case 'highest_score':
      entries = await computeHighestScoreLeaderboard(periodStart, periodEnd, limit);
      break;
    case 'most_completed':
      entries = await computeMostCompletedLeaderboard(periodStart, periodEnd, limit);
      break;
    case 'best_accuracy':
      entries = await computeBestAccuracyLeaderboard(periodStart, periodEnd, limit);
      break;
    case 'longest_streak':
      entries = await computeLongestStreakLeaderboard(periodStart, periodEnd, limit);
      break;
  }

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Store in database
  await storeLeaderboardEntries(entries, period, 'GLOBAL', metric);

  return entries;
}

export async function computePuzzleLeaderboard(
  puzzleId: number,
  metric: LeaderboardMetric,
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const periodStart = new Date(0); // All time for puzzle-specific
  const periodEnd = new Date();

  let entries: LeaderboardEntry[] = [];

  switch (metric) {
    case 'fastest_time':
      entries = await computePuzzleFastestTime(puzzleId, limit);
      break;
    case 'highest_score':
      entries = await computePuzzleHighestScore(puzzleId, limit);
      break;
    case 'most_completed':
      // Not applicable for puzzle-specific
      break;
    case 'best_accuracy':
      entries = await computePuzzleBestAccuracy(puzzleId, limit);
      break;
    case 'longest_streak':
      // Not applicable for puzzle-specific
      break;
  }

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Store in database
  await storeLeaderboardEntries(entries, 'ALL_TIME', 'PUZZLE', metric, puzzleId.toString());

  return entries;
}

async function computeFastestTimeLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.groupBy({
    by: ['userId'],
    where: {
      isCompleted: true,
      completedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    _avg: {
      completionTimeSeconds: true,
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gte: 3, // Minimum 3 completed puzzles for average
        },
      },
    },
    orderBy: {
      _avg: {
        completionTimeSeconds: 'asc',
      },
    },
    take: limit,
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { name: true, image: true },
    });

    if (user && result._avg.completionTimeSeconds) {
      entries.push({
        id: '',
        period: 'ALL_TIME',
        scope: 'GLOBAL',
        userId: result.userId,
        userName: user.name || 'Anonymous',
        userAvatar: user.image || undefined,
        metric: 'fastest_time',
        value: Math.round(result._avg.completionTimeSeconds),
        periodStart,
        periodEnd,
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return entries;
}

async function computeHighestScoreLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.groupBy({
    by: ['userId'],
    where: {
      isCompleted: true,
      completedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    _sum: {
      score: true,
    },
    orderBy: {
      _sum: {
        score: 'desc',
      },
    },
    take: limit,
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { name: true, image: true },
    });

    if (user && result._sum.score) {
      entries.push({
        id: '',
        period: 'ALL_TIME',
        scope: 'GLOBAL',
        userId: result.userId,
        userName: user.name || 'Anonymous',
        userAvatar: user.image || undefined,
        metric: 'highest_score',
        value: result._sum.score,
        periodStart,
        periodEnd,
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return entries;
}

async function computeMostCompletedLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.groupBy({
    by: ['userId'],
    where: {
      isCompleted: true,
      completedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { name: true, image: true },
    });

    if (user) {
      entries.push({
        id: '',
        period: 'ALL_TIME',
        scope: 'GLOBAL',
        userId: result.userId,
        userName: user.name || 'Anonymous',
        userAvatar: user.image || undefined,
        metric: 'most_completed',
        value: result._count.id,
        periodStart,
        periodEnd,
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return entries;
}

async function computeBestAccuracyLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.groupBy({
    by: ['userId'],
    where: {
      isCompleted: true,
      completedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    _avg: {
      totalAccuracy: true,
    },
    _count: {
      id: true,
    },
    having: {
      id: {
        _count: {
          gte: 3, // Minimum 3 completed puzzles for average
        },
      },
    },
    orderBy: {
      _avg: {
        totalAccuracy: 'desc',
      },
    },
    take: limit,
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { name: true, image: true },
    });

    if (user && result._avg.totalAccuracy) {
      entries.push({
        id: '',
        period: 'ALL_TIME',
        scope: 'GLOBAL',
        userId: result.userId,
        userName: user.name || 'Anonymous',
        userAvatar: user.image || undefined,
        metric: 'best_accuracy',
        value: Math.round(result._avg.totalAccuracy * 100) / 100,
        periodStart,
        periodEnd,
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return entries;
}

async function computeLongestStreakLeaderboard(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<LeaderboardEntry[]> {
  const results = await prisma.userStats.findMany({
    where: {
      longestStreak: {
        gt: 0,
      },
    },
    orderBy: {
      longestStreak: 'desc',
    },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    entries.push({
      id: '',
      period: 'ALL_TIME',
      scope: 'GLOBAL',
      userId: result.userId,
      userName: result.user.name || 'Anonymous',
      userAvatar: result.user.image || undefined,
      metric: 'longest_streak',
      value: result.longestStreak,
      periodStart,
      periodEnd,
      computedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return entries;
}

async function computePuzzleFastestTime(puzzleId: number, limit: number): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.findMany({
    where: {
      puzzleId,
      isCompleted: true,
      completionTimeSeconds: {
        not: null,
      },
    },
    orderBy: {
      completionTimeSeconds: 'asc',
    },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    if (result.completionTimeSeconds) {
      entries.push({
        id: '',
        period: 'ALL_TIME',
        scope: 'PUZZLE',
        scopeId: puzzleId.toString(),
        userId: result.userId,
        userName: result.user.name || 'Anonymous',
        userAvatar: result.user.image || undefined,
        metric: 'fastest_time',
        value: result.completionTimeSeconds,
        periodStart: new Date(0),
        periodEnd: new Date(),
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return entries;
}

async function computePuzzleHighestScore(puzzleId: number, limit: number): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.findMany({
    where: {
      puzzleId,
      isCompleted: true,
    },
    orderBy: {
      score: 'desc',
    },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    entries.push({
      id: '',
      period: 'ALL_TIME',
      scope: 'PUZZLE',
      scopeId: puzzleId.toString(),
      userId: result.userId,
      userName: result.user.name || 'Anonymous',
      userAvatar: result.user.image || undefined,
      metric: 'highest_score',
      value: result.score,
      periodStart: new Date(0),
      periodEnd: new Date(),
      computedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return entries;
}

async function computePuzzleBestAccuracy(puzzleId: number, limit: number): Promise<LeaderboardEntry[]> {
  const results = await prisma.userProgress.findMany({
    where: {
      puzzleId,
      isCompleted: true,
      totalAccuracy: {
        not: null,
      },
    },
    orderBy: {
      totalAccuracy: 'desc',
    },
    take: limit,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  const entries: LeaderboardEntry[] = [];

  for (const result of results) {
    if (result.totalAccuracy) {
      entries.push({
        id: '',
        period: 'ALL_TIME',
        scope: 'PUZZLE',
        scopeId: puzzleId.toString(),
        userId: result.userId,
        userName: result.user.name || 'Anonymous',
        userAvatar: result.user.image || undefined,
        metric: 'best_accuracy',
        value: result.totalAccuracy,
        periodStart: new Date(0),
        periodEnd: new Date(),
        computedAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return entries;
}

async function storeLeaderboardEntries(
  entries: LeaderboardEntry[],
  period: LeaderboardPeriod,
  scope: LeaderboardScope,
  metric: LeaderboardMetric,
  scopeId?: string
): Promise<void> {
  // Clear existing entries for this period/scope/metric
  await prisma.leaderboardEntry.deleteMany({
    where: {
      period,
      scope,
      scopeId: scopeId || null,
      metric,
    },
  });

  // Insert new entries
  for (const entry of entries) {
    await prisma.leaderboardEntry.create({
      data: {
        period: entry.period,
        scope: entry.scope,
        scopeId: entry.scopeId,
        userId: entry.userId,
        userName: entry.userName,
        userAvatar: entry.userAvatar,
        metric: entry.metric,
        value: entry.value,
        rank: entry.rank,
        periodStart: entry.periodStart,
        periodEnd: entry.periodEnd,
        computedAt: entry.computedAt,
        updatedAt: entry.updatedAt,
      },
    });
  }
}

function getPeriodDates(period: LeaderboardPeriod): { periodStart: Date; periodEnd: Date } {
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

export async function updateLeaderboardEntry(
  userId: string,
  puzzleId: number,
  metric: LeaderboardMetric,
  value: number
): Promise<void> {
  // This is a simplified version - in production, you'd want more sophisticated logic
  // For now, we'll just trigger a recomputation of the relevant leaderboards
  
  // Update ALL_TIME leaderboards immediately for puzzle-specific metrics
  if (metric === 'fastest_time' || metric === 'highest_score') {
    await computePuzzleLeaderboard(puzzleId, metric, 50);
  }
  
  // For global leaderboards, you might want to batch these updates
  // or run them on a schedule to avoid performance issues
}
