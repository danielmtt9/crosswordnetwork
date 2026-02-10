import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeGlobalLeaderboard } from "@/lib/leaderboards/compute";
import type { LeaderboardPeriod, LeaderboardScope, LeaderboardMetric } from "@/lib/leaderboards/types";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'ALL_TIME';
    const scope = searchParams.get('scope') || 'GLOBAL';
    const metric = searchParams.get('metric') || 'highest_score';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validate parameters
    const validPeriods = ['DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME'];
    const validScopes = ['GLOBAL', 'PUZZLE', 'DIFFICULTY'];
    const validMetrics = ['fastest_time', 'highest_score', 'most_completed', 'best_accuracy', 'longest_streak'];

    if (!validPeriods.includes(period) || !validScopes.includes(scope) || !validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    // Get leaderboard entries from database
    // Type-safe where clause using Prisma types
    const whereClause: Prisma.LeaderboardEntryWhereInput = {
      period: period as LeaderboardPeriod,
      scope: scope as LeaderboardScope,
      scopeId: null, // For global leaderboards
      metric: metric as LeaderboardMetric,
    };

    let entries = await prisma.leaderboardEntry.findMany({
      where: whereClause,
      orderBy: {
        rank: 'asc',
      },
      take: limit,
    });

    // If no entries found, compute them
    if (entries.length === 0 && scope === 'GLOBAL') {
      const computedEntries = await computeGlobalLeaderboard(
        period as LeaderboardPeriod,
        metric as LeaderboardMetric,
        limit
      );
      entries = await prisma.leaderboardEntry.findMany({
        where: whereClause,
        orderBy: {
          rank: 'asc',
        },
        take: limit,
      });
    }

    // Find current user's entry
    const userEntry = entries.find(entry => entry.userId === session.userId);

    // Get total count for pagination
    const total = await prisma.leaderboardEntry.count({
      where: {
        period: period as any,
        scope: scope as any,
        scopeId: null,
        metric: metric as any,
      },
    });

    return NextResponse.json({
      entries,
      userEntry,
      total,
      period,
      scope,
      metric,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
