import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { achievementId, celebrationType } = body;

    if (!achievementId) {
      return NextResponse.json(
        { error: "Achievement ID is required" },
        { status: 400 }
      );
    }

    // Check if user has this achievement
    const userAchievement = await prisma.userAchievement.findFirst({
      where: {
        userId: session.userId,
        achievementId: achievementId,
        earned: true
      },
      include: {
        achievement: true
      }
    });

    if (!userAchievement) {
      return NextResponse.json(
        { error: "Achievement not found or not earned" },
        { status: 404 }
      );
    }

    // Create celebration record
    const celebration = await prisma.achievementCelebration.create({
      data: {
        userId: session.userId,
        achievementId: achievementId,
        type: celebrationType || 'unlock',
        timestamp: new Date()
      }
    });

    // Get user's recent achievements for context
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
      take: 5
    });

    // Get user's achievement stats
    const totalAchievements = await prisma.userAchievement.count({
      where: {
        userId: session.userId,
        earned: true
      }
    });

    const totalPoints = await prisma.userAchievement.aggregate({
      where: {
        userId: session.userId,
        earned: true
      },
      _sum: {
        points: true
      }
    });

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

    return NextResponse.json({
      success: true,
      celebration: {
        id: celebration.id,
        type: celebration.type,
        timestamp: celebration.timestamp
      },
      achievement: {
        id: userAchievement.achievement.id,
        name: userAchievement.achievement.name,
        description: userAchievement.achievement.description,
        icon: userAchievement.achievement.icon,
        points: userAchievement.achievement.points,
        tier: userAchievement.achievement.tier,
        category: userAchievement.achievement.category,
        earnedAt: userAchievement.earnedAt
      },
      context: {
        recentAchievements: recentAchievements.map(ua => ({
          id: ua.achievement.id,
          name: ua.achievement.name,
          icon: ua.achievement.icon,
          tier: ua.achievement.tier,
          earnedAt: ua.earnedAt
        })),
        stats: {
          totalAchievements,
          totalPoints: totalPoints._sum.points || 0,
          tierCounts: tierCounts.reduce((acc, tier) => {
            acc[tier.tier] = tier._count.tier;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });
  } catch (error) {
    console.error("Error creating achievement celebration:", error);
    return NextResponse.json(
      { error: "Failed to create achievement celebration" },
      { status: 500 }
    );
  }
}
