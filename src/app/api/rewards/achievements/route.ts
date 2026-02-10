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

    // Get user's achievement points
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earned: true
      },
      include: {
        achievement: true
      }
    });

    const totalPoints = userAchievements.reduce((sum, ua) => sum + ua.points, 0);
    const spentPoints = 0; // This would be tracked in a separate table
    const availablePoints = totalPoints - spentPoints;

    // Get unlocked rewards
    const unlockedRewards = await prisma.achievementReward.findMany({
      where: {
        userId: session.userId,
        unlocked: true
      },
      include: {
        reward: true
      }
    });

    // Get available rewards
    const availableRewards = await prisma.reward.findMany({
      where: {
        unlocked: false
      },
      include: {
        requirements: {
          include: {
            achievement: true
          }
        }
      }
    });

    // Filter available rewards based on user's achievements
    const userEarnedAchievements = userAchievements.map(ua => ua.achievementId);
    const filteredAvailableRewards = availableRewards.filter(reward => {
      return reward.requirements.every(req => 
        userEarnedAchievements.includes(req.achievementId)
      );
    });

    // Get hint bonuses
    const hintBonuses = [
      {
        id: 'hint_pack_1',
        name: 'Hint Pack (5)',
        description: 'Get 5 extra hints for puzzles',
        bonusAmount: 5,
        unlocked: false,
        requiredPoints: 500
      },
      {
        id: 'hint_pack_2',
        name: 'Hint Pack (10)',
        description: 'Get 10 extra hints for puzzles',
        bonusAmount: 10,
        unlocked: false,
        requiredPoints: 1000
      },
      {
        id: 'hint_pack_3',
        name: 'Hint Pack (25)',
        description: 'Get 25 extra hints for puzzles',
        bonusAmount: 25,
        unlocked: false,
        requiredPoints: 2500
      },
      {
        id: 'unlimited_hints',
        name: 'Unlimited Hints',
        description: 'Unlimited hints for all puzzles',
        bonusAmount: -1,
        unlocked: false,
        requiredPoints: 15000
      }
    ];

    // Get special events
    const specialEvents = [
      {
        id: 'weekly_challenge',
        name: 'Weekly Challenge Access',
        description: 'Participate in exclusive weekly challenges',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        unlocked: false,
        requiredPoints: 3000
      },
      {
        id: 'monthly_tournament',
        name: 'Monthly Tournament',
        description: 'Compete in monthly achievement tournaments',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        unlocked: false,
        requiredPoints: 8000
      },
      {
        id: 'seasonal_event',
        name: 'Seasonal Event',
        description: 'Access to seasonal achievement events',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        unlocked: false,
        requiredPoints: 12000
      }
    ];

    return NextResponse.json({
      totalPoints,
      availablePoints,
      spentPoints,
      unlockedRewards: unlockedRewards.map(ur => ({
        id: ur.id,
        type: ur.reward.type,
        name: ur.reward.name,
        description: ur.reward.description,
        icon: ur.reward.icon,
        value: ur.reward.pointsRequired,
        rarity: ur.reward.rarity,
        unlocked: true,
        unlockedAt: ur.unlockedAt?.toISOString(),
        requirements: []
      })),
      availableRewards: filteredAvailableRewards.map(reward => ({
        id: reward.id,
        type: reward.type,
        name: reward.name,
        description: reward.description,
        icon: reward.icon,
        value: reward.pointsRequired,
        rarity: reward.rarity,
        unlocked: false,
        requirements: reward.requirements.map(req => ({
          achievementId: req.achievementId,
          achievementName: req.achievement.name,
          pointsRequired: req.achievement.points
        }))
      })),
      hintBonuses,
      specialEvents
    });
  } catch (error) {
    console.error("Error fetching achievement rewards:", error);
    return NextResponse.json(
      { error: "Failed to fetch rewards" },
      { status: 500 }
    );
  }
}
