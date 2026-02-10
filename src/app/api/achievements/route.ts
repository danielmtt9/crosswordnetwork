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

    // Get all achievements
    const achievements = await prisma.achievement.findMany({
      orderBy: { order: 'asc' },
    });

    // Get user's progress on achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: session.userId },
      include: { achievement: true },
    });

    // Create a map for easy lookup
    const userProgressMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    // Combine achievements with user progress
    const achievementsWithProgress = achievements.map(achievement => {
      const userProgress = userProgressMap.get(achievement.id);
      return {
        ...achievement,
        userProgress: userProgress ? {
          progress: userProgress.progress,
          earnedAt: userProgress.earnedAt,
          notified: userProgress.notified,
        } : null,
      };
    });

    return NextResponse.json({
      achievements: achievementsWithProgress,
    });
  } catch (error) {
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
