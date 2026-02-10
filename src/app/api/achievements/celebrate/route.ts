import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        earnedAt: { not: null }
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

    // Create celebration record (commented out - table doesn't exist in schema)
    // const celebration = await prisma.achievementCelebration.create({
    //   data: {
    //     userId: session.userId,
    //     achievementId: achievementId,
    //     type: celebrationType || 'unlock',
    //     timestamp: new Date()
    //   }
    // });

    // Get user's recent achievements for context
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earnedAt: { not: null }
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
        earnedAt: { not: null }
      }
    });

    // Calculate total points by joining with Achievement model
    const earnedAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earnedAt: { not: null }
      },
      include: {
        achievement: {
          select: {
            points: true
          }
        }
      }
    });
    
    const totalPoints = earnedAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0);

    // Calculate tier counts by joining with Achievement model
    const tierCounts = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earnedAt: { not: null }
      },
      include: {
        achievement: {
          select: {
            tier: true
          }
        }
      }
    });
    
    const tierCountMap = tierCounts.reduce((acc, ua) => {
      const tier = ua.achievement.tier;
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      celebration: {
        id: 'temp-id',
        type: celebrationType || 'unlock',
        timestamp: new Date().toISOString()
      },
      achievement: {
        id: userAchievement.achievement.id,
        name: userAchievement.achievement.name,
        description: userAchievement.achievement.description,
        icon: userAchievement.achievement.iconName,
        points: userAchievement.achievement.points,
        tier: userAchievement.achievement.tier,
        category: userAchievement.achievement.category,
        earnedAt: userAchievement.earnedAt
      },
      context: {
        recentAchievements: recentAchievements.map(ua => ({
          id: ua.achievement.id,
          name: ua.achievement.name,
          icon: ua.achievement.iconName,
          tier: ua.achievement.tier,
          earnedAt: ua.earnedAt
        })),
        stats: {
          totalAchievements,
          totalPoints,
          tierCounts: tierCountMap
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
