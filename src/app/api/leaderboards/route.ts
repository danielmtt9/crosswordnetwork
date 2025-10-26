import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { computeGlobalLeaderboard } from "@/lib/leaderboards/compute";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    let entries = await prisma.leaderboardEntry.findMany({
      where: {
        period: period as any,
        scope: scope as any,
        scopeId: null, // For global leaderboards
        metric: metric as any,
      },
      orderBy: {
        rank: 'asc',
      },
      take: limit,
    });

    // If no entries found, compute them
    if (entries.length === 0 && scope === 'GLOBAL') {
      const computedEntries = await computeGlobalLeaderboard(
        period as any,
        metric as any,
        limit
      );
      entries = await prisma.leaderboardEntry.findMany({
        where: {
          period: period as any,
          scope: scope as any,
          scopeId: null,
          metric: metric as any,
        },
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
