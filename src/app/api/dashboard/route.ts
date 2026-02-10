import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Basic user info
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        image: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Aggregate stats
    const [completedCount, totalHintsUsed] = await Promise.all([
      prisma.userProgress.count({
        where: { userId: user.id, isCompleted: true },
      }),
      prisma.userProgress.aggregate({
        _sum: { hintsUsed: true },
        where: { userId: user.id },
      }).then((r) => r._sum.hintsUsed || 0),
    ]);

    // Recent puzzles played
    const recentProgress = await prisma.userProgress.findMany({
      where: { userId: user.id },
      orderBy: { lastPlayedAt: "desc" },
      take: 5,
      select: {
        puzzleId: true,
        lastPlayedAt: true,
        completionTimeSeconds: true,
        score: true,
        isCompleted: true,
        hintsUsed: true,
      },
    });

    const puzzleIds = Array.from(new Set(recentProgress.map((p) => p.puzzleId)));
    const puzzles = puzzleIds.length
      ? await prisma.puzzle.findMany({
          where: { id: { in: puzzleIds } },
          select: { id: true, title: true, difficulty: true },
        })
      : [];
    const idToPuzzle = new Map(puzzles.map((pz) => [pz.id, pz]));

    const recentPuzzles = recentProgress.map((p) => {
      const meta = idToPuzzle.get(p.puzzleId);
      const difficulty = (meta?.difficulty || "MEDIUM").toString().toUpperCase();
      return {
        id: p.puzzleId,
        title: meta?.title || `Puzzle #${p.puzzleId}`,
        completedAt: p.isCompleted && p.lastPlayedAt ? p.lastPlayedAt.toISOString() : null,
        timeSpent: p.completionTimeSeconds != null ? `${Math.floor(p.completionTimeSeconds / 60)}m ${p.completionTimeSeconds % 60}s` : null,
        rating: null as number | null,
        difficulty,
      };
    });

    // Simple achievements derived from stats (placeholder logic)
    const achievements = [
      completedCount >= 1 && { id: "first", name: "First Puzzle", description: "Complete your first crossword", rarity: "common", earnedAt: user.createdAt.toISOString() },
      completedCount >= 7 && { id: "streak7", name: "Weekly Solver", description: "Complete 7 puzzles", rarity: "rare", earnedAt: new Date().toISOString() },
      totalHintsUsed >= 50 && { id: "curious", name: "Curious", description: "Use 50 hints", rarity: "common", earnedAt: new Date().toISOString() },
    ].filter(Boolean);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        joinDate: user.createdAt,
        avatar: user.image,
      },
      stats: {
        puzzlesCompleted: completedCount,
        totalTimeSpent: null as string | null, // future: compute from completionTimeSeconds
        currentStreak: 0, // future: compute streak from userProgress by dates
        longestStreak: 0,
        hintsUsed: totalHintsUsed,
        averageRating: null as number | null,
        rank: null as number | null,
      },
      recentPuzzles,
      achievements,
    });
  } catch (error) {
    console.error("/api/dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
