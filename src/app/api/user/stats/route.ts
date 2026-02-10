import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get or create user stats
    let userStats = await prisma.userStats.findUnique({
      where: { userId: session.userId },
    });

    if (!userStats) {
      // Create initial stats if they don't exist
      userStats = await prisma.userStats.create({
        data: {
          userId: session.userId,
          totalPuzzlesStarted: 0,
          totalPuzzlesCompleted: 0,
          totalPlayTime: 0,
          averageAccuracy: 100.0,
          averageCompletionTime: 0.0,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 0,
          achievementPoints: 0,
        },
      });
    }

    // Calculate global rank based on total score
    const rankResult = await prisma.userStats.findMany({
      where: {
        totalScore: {
          gt: userStats.totalScore,
        },
      },
      select: {
        userId: true,
      },
    });

    const globalRank = rankResult.length + 1;

    // Update rank if it has changed
    if (userStats.globalRank !== globalRank) {
      userStats = await prisma.userStats.update({
        where: { userId: session.userId },
        data: { globalRank },
      });
    }

    return NextResponse.json({
      ...userStats,
      globalRank,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      puzzlesCompleted,
      totalScore,
      playTime,
      accuracy,
      completionTime,
    } = body;

    // Update user stats
    const updateData: any = {};

    if (puzzlesCompleted !== undefined) {
      updateData.totalPuzzlesCompleted = { increment: puzzlesCompleted };
    }

    if (totalScore !== undefined) {
      updateData.totalScore = { increment: totalScore };
    }

    if (playTime !== undefined) {
      updateData.totalPlayTime = { increment: playTime };
    }

    if (accuracy !== undefined) {
      // Update average accuracy (simplified - in production, you'd want more sophisticated averaging)
      updateData.averageAccuracy = accuracy;
    }

    if (completionTime !== undefined) {
      // Update average completion time (simplified)
      updateData.averageCompletionTime = completionTime;
    }

    updateData.lastPlayedDate = new Date();

    const userStats = await prisma.userStats.upsert({
      where: { userId: session.userId },
      update: updateData,
      create: {
        userId: session.userId,
        totalPuzzlesStarted: 0,
        totalPuzzlesCompleted: puzzlesCompleted || 0,
        totalPlayTime: playTime || 0,
        averageAccuracy: accuracy || 100.0,
        averageCompletionTime: completionTime || 0.0,
        currentStreak: 0,
        longestStreak: 0,
        totalScore: totalScore || 0,
        achievementPoints: 0,
        lastPlayedDate: new Date(),
      },
    });

    return NextResponse.json(userStats);
  } catch (error) {
    console.error("Error updating user stats:", error);
    return NextResponse.json(
      { error: "Failed to update user stats" },
      { status: 500 }
    );
  }
}
