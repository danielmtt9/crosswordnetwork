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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.userId;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId },
    });

    // Get user achievements
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });

    // Get recent puzzle activity
    const recentPuzzles = await prisma.userProgress.findMany({
      where: { userId },
      include: {
        puzzle: {
          select: {
            id: true,
            title: true,
            difficulty: true,
          },
        },
      },
      orderBy: { lastPlayedAt: 'desc' },
      take: 10,
    });

    // Get achievement summary
    const achievementSummary = {
      total: userAchievements.length,
      byTier: {
        BRONZE: userAchievements.filter(ua => ua.achievement.tier === 'BRONZE').length,
        SILVER: userAchievements.filter(ua => ua.achievement.tier === 'SILVER').length,
        GOLD: userAchievements.filter(ua => ua.achievement.tier === 'GOLD').length,
        PLATINUM: userAchievements.filter(ua => ua.achievement.tier === 'PLATINUM').length,
        DIAMOND: userAchievements.filter(ua => ua.achievement.tier === 'DIAMOND').length,
      },
      byCategory: {
        COMPLETION: userAchievements.filter(ua => ua.achievement.category === 'COMPLETION').length,
        SPEED: userAchievements.filter(ua => ua.achievement.category === 'SPEED').length,
        STREAK: userAchievements.filter(ua => ua.achievement.category === 'STREAK').length,
        ACCURACY: userAchievements.filter(ua => ua.achievement.category === 'ACCURACY').length,
        SOCIAL: userAchievements.filter(ua => ua.achievement.category === 'SOCIAL').length,
        MASTERY: userAchievements.filter(ua => ua.achievement.category === 'MASTERY').length,
        SPECIAL: userAchievements.filter(ua => ua.achievement.category === 'SPECIAL').length,
      },
    };

    return NextResponse.json({
      user,
      stats: userStats,
      achievements: userAchievements,
      recentPuzzles,
      achievementSummary,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}
