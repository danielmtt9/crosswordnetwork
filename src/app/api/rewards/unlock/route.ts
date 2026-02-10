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
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: "Reward ID is required" },
        { status: 400 }
      );
    }

    // Get user's available points
    const userAchievements = await prisma.userAchievement.findMany({
      where: {
        userId: session.userId,
        earned: true
      }
    });

    const totalPoints = userAchievements.reduce((sum, ua) => sum + ua.points, 0);
    const spentPoints = 0; // This would be tracked in a separate table
    const availablePoints = totalPoints - spentPoints;

    // Get reward details
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
      include: {
        requirements: {
          include: {
            achievement: true
          }
        }
      }
    });

    if (!reward) {
      return NextResponse.json(
        { error: "Reward not found" },
        { status: 404 }
      );
    }

    // Check if user has enough points
    if (availablePoints < reward.pointsRequired) {
      return NextResponse.json(
        { error: "Insufficient points" },
        { status: 400 }
      );
    }

    // Check if user meets requirements
    const userEarnedAchievements = userAchievements.map(ua => ua.achievementId);
    const meetsRequirements = reward.requirements.every(req => 
      userEarnedAchievements.includes(req.achievementId)
    );

    if (!meetsRequirements) {
      return NextResponse.json(
        { error: "Requirements not met" },
        { status: 400 }
      );
    }

    // Check if reward is already unlocked
    const existingReward = await prisma.achievementReward.findFirst({
      where: {
        userId: session.userId,
        rewardId: rewardId
      }
    });

    if (existingReward) {
      return NextResponse.json(
        { error: "Reward already unlocked" },
        { status: 400 }
      );
    }

    // Unlock the reward
    const unlockedReward = await prisma.achievementReward.create({
      data: {
        userId: session.userId,
        rewardId: rewardId,
        unlocked: true,
        unlockedAt: new Date()
      },
      include: {
        reward: true
      }
    });

    // Apply reward effects based on type
    switch (reward.type) {
      case 'hint_bonus':
        // Add hint bonuses
        const hintAmount = reward.pointsRequired / 100; // Convert points to hints
        await prisma.user.update({
          where: { id: session.userId },
          data: {
            hintBonuses: {
              increment: hintAmount
            }
          }
        });
        break;
      
      case 'special_event':
        // Grant event access
        await prisma.user.update({
          where: { id: session.userId },
          data: {
            specialEvents: {
              push: rewardId
            }
          }
        });
        break;
    }

    return NextResponse.json({
      success: true,
      reward: {
        id: unlockedReward.id,
        type: unlockedReward.reward.type,
        name: unlockedReward.reward.name,
        description: unlockedReward.reward.description,
        icon: unlockedReward.reward.icon,
        value: unlockedReward.reward.pointsRequired,
        rarity: unlockedReward.reward.rarity,
        unlocked: true,
        unlockedAt: unlockedReward.unlockedAt?.toISOString()
      }
    });
  } catch (error) {
    console.error("Error unlocking reward:", error);
    return NextResponse.json(
      { error: "Failed to unlock reward" },
      { status: 500 }
    );
  }
}
