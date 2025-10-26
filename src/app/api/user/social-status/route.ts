import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's achievement stats
    const achievementStats = await prisma.userAchievement.aggregate({
      where: {
        userId: session.userId,
        earned: true
      },
      _count: {
        id: true
      },
      _sum: {
        points: true
      }
    });

    // Get tier distribution
    const tierCounts = await prisma.userAchievement.groupBy({
      by: ['tier'],
      where: {
        userId: session.userId,
        earned: true
      },
      _count: {
        tier: true
      }
    });

    // Get recent achievements
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earned: true
      },
      include: {
        achievement: true
      },
      orderBy: {
        earnedAt: 'desc'
      },
      take: 3
    });

    // Get user's global rank
    const userStats = await prisma.userStats.findUnique({
      where: { userId: session.userId }
    });

    // Get user's leaderboard position
    const leaderboardEntry = await prisma.leaderboardEntry.findFirst({
      where: {
        userId: session.userId,
        period: 'all_time',
        scope: 'global'
      },
      orderBy: {
        rank: 'asc'
      }
    });

    // Calculate social status
    const totalAchievements = achievementStats._count.id || 0;
    const totalPoints = achievementStats._sum.points || 0;
    
    let statusLevel = 'beginner';
    let statusTitle = 'Puzzle Novice';
    let statusColor = 'text-gray-500';
    let statusIcon = '🌱';

    if (totalAchievements >= 50) {
      statusLevel = 'master';
      statusTitle = 'Puzzle Master';
      statusColor = 'text-purple-600';
      statusIcon = '👑';
    } else if (totalAchievements >= 25) {
      statusLevel = 'expert';
      statusTitle = 'Puzzle Expert';
      statusColor = 'text-blue-600';
      statusIcon = '⭐';
    } else if (totalAchievements >= 10) {
      statusLevel = 'intermediate';
      statusTitle = 'Puzzle Enthusiast';
      statusColor = 'text-green-600';
      statusIcon = '🔥';
    }

    // Get special badges
    const specialBadges = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earned: true,
        achievement: {
          tier: 'legendary'
        }
      },
      include: {
        achievement: true
      },
      take: 3
    });

    // Get streak info
    const currentStreak = userStats?.currentStreak || 0;
    const longestStreak = userStats?.longestStreak || 0;

    return NextResponse.json({
      status: {
        level: statusLevel,
        title: statusTitle,
        color: statusColor,
        icon: statusIcon,
        totalAchievements,
        totalPoints,
        globalRank: leaderboardEntry?.rank || 0,
        currentStreak,
        longestStreak
      },
      recentAchievements: recentAchievements.map(ua => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        tier: ua.achievement.tier,
        earnedAt: ua.earnedAt
      })),
      specialBadges: specialBadges.map(ua => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        icon: ua.achievement.icon,
        description: ua.achievement.description,
        earnedAt: ua.earnedAt
      })),
      tierCounts: tierCounts.reduce((acc, tier) => {
        acc[tier.tier] = tier._count.tier;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error("Error fetching social status:", error);
    return NextResponse.json(
      { error: "Failed to fetch social status" },
      { status: 500 }
    );
  }
}
