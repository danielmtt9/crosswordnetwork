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

    // Get user's achievement statistics
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
    const achievementCount = userAchievements.length;

    // Get user's streak information
    const userStats = await prisma.userStats.findUnique({
      where: { userId: session.userId }
    });

    const currentStreak = userStats?.currentStreak || 0;
    const longestStreak = userStats?.longestStreak || 0;

    // Get puzzles completed count
    const puzzlesCompleted = await prisma.puzzleCompletion.count({
      where: { userId: session.userId }
    });

    // Define milestones
    const milestones = [
      // Achievement count milestones
      {
        id: 'achievements_10',
        type: 'achievement_count' as const,
        name: 'Achievement Collector',
        description: 'Unlock 10 achievements',
        icon: '🏆',
        target: 10,
        current: achievementCount,
        reward: {
          type: 'points' as const,
          value: 500,
          name: '500 Achievement Points'
        },
        unlocked: achievementCount >= 10,
        rarity: 'common' as const
      },
      {
        id: 'achievements_25',
        type: 'achievement_count' as const,
        name: 'Achievement Enthusiast',
        description: 'Unlock 25 achievements',
        icon: '🥇',
        target: 25,
        current: achievementCount,
        reward: {
          type: 'badge' as const,
          value: 1000,
          name: 'Achievement Enthusiast Badge'
        },
        unlocked: achievementCount >= 25,
        rarity: 'rare' as const
      },
      {
        id: 'achievements_50',
        type: 'achievement_count' as const,
        name: 'Achievement Master',
        description: 'Unlock 50 achievements',
        icon: '👑',
        target: 50,
        current: achievementCount,
        reward: {
          type: 'badge' as const,
          value: 2500,
          name: 'Achievement Master Badge'
        },
        unlocked: achievementCount >= 50,
        rarity: 'epic' as const
      },
      {
        id: 'achievements_100',
        type: 'achievement_count' as const,
        name: 'Achievement Legend',
        description: 'Unlock 100 achievements',
        icon: '🌟',
        target: 100,
        current: achievementCount,
        reward: {
          type: 'special_title' as const,
          value: 5000,
          name: 'Legendary Title'
        },
        unlocked: achievementCount >= 100,
        rarity: 'legendary' as const
      },

      // Points milestones
      {
        id: 'points_1000',
        type: 'points_total' as const,
        name: 'Point Collector',
        description: 'Earn 1,000 achievement points',
        icon: '⭐',
        target: 1000,
        current: totalPoints,
        reward: {
          type: 'hint_bonus' as const,
          value: 10,
          name: '10 Free Hints'
        },
        unlocked: totalPoints >= 1000,
        rarity: 'common' as const
      },
      {
        id: 'points_5000',
        type: 'points_total' as const,
        name: 'Point Accumulator',
        description: 'Earn 5,000 achievement points',
        icon: '💎',
        target: 5000,
        current: totalPoints,
        reward: {
          type: 'badge' as const,
          value: 1,
          name: 'Point Accumulator Badge'
        },
        unlocked: totalPoints >= 5000,
        rarity: 'rare' as const
      },
      {
        id: 'points_10000',
        type: 'points_total' as const,
        name: 'Point Master',
        description: 'Earn 10,000 achievement points',
        icon: '🏆',
        target: 10000,
        current: totalPoints,
        reward: {
          type: 'special_title' as const,
          value: 1,
          name: 'Point Master Title'
        },
        unlocked: totalPoints >= 10000,
        rarity: 'epic' as const
      },
      {
        id: 'points_25000',
        type: 'points_total' as const,
        name: 'Point Legend',
        description: 'Earn 25,000 achievement points',
        icon: '👑',
        target: 25000,
        current: totalPoints,
        reward: {
          type: 'badge' as const,
          value: 1,
          name: 'Point Legend Badge'
        },
        unlocked: totalPoints >= 25000,
        rarity: 'legendary' as const
      },

      // Streak milestones
      {
        id: 'streak_7',
        type: 'streak_days' as const,
        name: 'Week Warrior',
        description: 'Maintain a 7-day solving streak',
        icon: '🔥',
        target: 7,
        current: currentStreak,
        reward: {
          type: 'points' as const,
          value: 200,
          name: '200 Achievement Points'
        },
        unlocked: currentStreak >= 7,
        rarity: 'common' as const
      },
      {
        id: 'streak_30',
        type: 'streak_days' as const,
        name: 'Monthly Master',
        description: 'Maintain a 30-day solving streak',
        icon: '⚡',
        target: 30,
        current: currentStreak,
        reward: {
          type: 'badge' as const,
          value: 1,
          name: 'Streak Master Badge'
        },
        unlocked: currentStreak >= 30,
        rarity: 'rare' as const
      },
      {
        id: 'streak_100',
        type: 'streak_days' as const,
        name: 'Century Streak',
        description: 'Maintain a 100-day solving streak',
        icon: '💯',
        target: 100,
        current: currentStreak,
        reward: {
          type: 'special_title' as const,
          value: 1,
          name: 'Streak Legend Title'
        },
        unlocked: currentStreak >= 100,
        rarity: 'epic' as const
      },

      // Puzzle completion milestones
      {
        id: 'puzzles_50',
        type: 'puzzles_completed' as const,
        name: 'Puzzle Solver',
        description: 'Complete 50 puzzles',
        icon: '🧩',
        target: 50,
        current: puzzlesCompleted,
        reward: {
          type: 'points' as const,
          value: 300,
          name: '300 Achievement Points'
        },
        unlocked: puzzlesCompleted >= 50,
        rarity: 'common' as const
      },
      {
        id: 'puzzles_100',
        type: 'puzzles_completed' as const,
        name: 'Puzzle Enthusiast',
        description: 'Complete 100 puzzles',
        icon: '🎯',
        target: 100,
        current: puzzlesCompleted,
        reward: {
          type: 'badge' as const,
          value: 1,
          name: 'Puzzle Enthusiast Badge'
        },
        unlocked: puzzlesCompleted >= 100,
        rarity: 'rare' as const
      },
      {
        id: 'puzzles_500',
        type: 'puzzles_completed' as const,
        name: 'Puzzle Master',
        description: 'Complete 500 puzzles',
        icon: '🏅',
        target: 500,
        current: puzzlesCompleted,
        reward: {
          type: 'badge' as const,
          value: 1,
          name: 'Puzzle Master Badge'
        },
        unlocked: puzzlesCompleted >= 500,
        rarity: 'epic' as const
      },
      {
        id: 'puzzles_1000',
        type: 'puzzles_completed' as const,
        name: 'Puzzle Legend',
        description: 'Complete 1,000 puzzles',
        icon: '🌟',
        target: 1000,
        current: puzzlesCompleted,
        reward: {
          type: 'special_title' as const,
          value: 1,
          name: 'Puzzle Legend Title'
        },
        unlocked: puzzlesCompleted >= 1000,
        rarity: 'legendary' as const
      }
    ];

    // Check for newly unlocked milestones
    const newlyUnlocked = milestones.filter(milestone => 
      milestone.unlocked && !milestone.unlockedAt
    );

    // Update milestone unlock status in database
    if (newlyUnlocked.length > 0) {
      for (const milestone of newlyUnlocked) {
        await prisma.milestoneUnlock.upsert({
          where: {
            userId_milestoneId: {
              userId: session.userId,
              milestoneId: milestone.id
            }
          },
          update: {
            unlockedAt: new Date()
          },
          create: {
            userId: session.userId,
            milestoneId: milestone.id,
            unlockedAt: new Date()
          }
        });
      }
    }

    // Get unlock timestamps from database
    const milestoneUnlocks = await prisma.milestoneUnlock.findMany({
      where: { userId: session.userId }
    });

    const milestonesWithTimestamps = milestones.map(milestone => {
      const unlock = milestoneUnlocks.find(u => u.milestoneId === milestone.id);
      return {
        ...milestone,
        unlockedAt: unlock?.unlockedAt?.toISOString()
      };
    });

    return NextResponse.json({
      milestones: milestonesWithTimestamps
    });
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}
