import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computePuzzleLeaderboard } from "@/lib/leaderboards/compute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ puzzleId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const puzzleId = parseInt(resolvedParams.puzzleId);
    
    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'fastest_time';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Validate parameters
    const validMetrics = ['fastest_time', 'highest_score', 'best_accuracy'];

    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: "Invalid metric" },
        { status: 400 }
      );
    }

    // Check if puzzle exists
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, title: true },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Get leaderboard entries from database
    let entries = await prisma.leaderboardEntry.findMany({
      where: {
        period: 'ALL_TIME',
        scope: 'PUZZLE',
        scopeId: puzzleId.toString(),
        metric: metric as any,
      },
      orderBy: {
        rank: 'asc',
      },
      take: limit,
    });

    // If no entries found, compute them
    if (entries.length === 0) {
      const computedEntries = await computePuzzleLeaderboard(
        puzzleId,
        metric as any,
        limit
      );
      entries = await prisma.leaderboardEntry.findMany({
        where: {
          period: 'ALL_TIME',
          scope: 'PUZZLE',
          scopeId: puzzleId.toString(),
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
        period: 'ALL_TIME',
        scope: 'PUZZLE',
        scopeId: puzzleId.toString(),
        metric: metric as any,
      },
    });

    return NextResponse.json({
      entries,
      userEntry,
      total,
      puzzle: {
        id: puzzle.id,
        title: puzzle.title,
      },
      period: 'ALL_TIME',
      scope: 'PUZZLE',
      metric,
    });
  } catch (error) {
    console.error("Error fetching puzzle leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle leaderboard" },
      { status: 500 }
    );
  }
}