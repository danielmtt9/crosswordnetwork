import { prisma } from '@/lib/prisma';

export interface AchievementEvent {
  type: 'puzzle_completed' | 'daily_activity';
  data: any;
}

export interface UnlockedAchievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  tier: string;
  points: number;
  iconName: string;
}

export async function checkAchievements(
  userId: string, 
  event: AchievementEvent
): Promise<UnlockedAchievement[]> {
  const unlockedAchievements: UnlockedAchievement[] = [];

  try {
    // Get all achievements for the user
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    });

    const userAchievementMap = new Map(
      userAchievements.map(ua => [ua.achievementId, ua])
    );

    // Get all achievements that could be unlocked
    const allAchievements = await prisma.achievement.findMany({
      orderBy: { order: 'asc' },
    });

    for (const achievement of allAchievements) {
      const userAchievement = userAchievementMap.get(achievement.id);
      
      // Skip if already earned
      if (userAchievement?.earnedAt) {
        continue;
      }

      // Check if requirement is met
      const isUnlocked = await evaluateRequirement(achievement, event, userId);
      
      if (isUnlocked) {
        // Unlock the achievement
        await unlockAchievement(userId, achievement.id);
        
        unlockedAchievements.push({
          id: achievement.id,
          key: achievement.key,
          name: achievement.name,
          description: achievement.description,
          category: achievement.category,
          tier: achievement.tier,
          points: achievement.points,
          iconName: achievement.iconName,
        });
      } else if (userAchievement) {
        // Update progress for incremental achievements
        await updateProgress(userId, achievement.id, event);
      }
    }

    return unlockedAchievements;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

async function evaluateRequirement(
  achievement: any,
  event: AchievementEvent,
  userId: string
): Promise<boolean> {
  try {
    const requirement = JSON.parse(achievement.requirement);
    
    switch (requirement.type) {
      case 'puzzles_completed':
        if (event.type !== 'puzzle_completed') return false;
        const completedCount = await getCompletedPuzzlesCount(userId);
        return completedCount >= requirement.threshold;

      case 'completion_time':
        if (event.type !== 'puzzle_completed') return false;
        return event.data.completionTimeSeconds <= requirement.threshold;

      case 'daily_streak':
        if (event.type !== 'daily_activity') return false;
        const streak = await getCurrentStreak(userId);
        return streak >= requirement.threshold;

      case 'accuracy_threshold':
        if (event.type !== 'puzzle_completed') return false;
        return event.data.accuracy >= requirement.threshold;

      case 'difficulty_complete':
        if (event.type !== 'puzzle_completed') return false;
        return event.data.difficulty === requirement.threshold;

      case 'difficulty_completed_count':
        if (event.type !== 'puzzle_completed') return false;
        const difficultyCount = await getDifficultyCompletedCount(userId, requirement.meta.difficulty);
        return difficultyCount >= requirement.threshold;

      default:
        return false;
    }
  } catch (error) {
    console.error('Error evaluating requirement:', error);
    return false;
  }
}

async function unlockAchievement(userId: string, achievementId: string): Promise<void> {
  await prisma.userAchievement.upsert({
    where: {
      userId_achievementId: {
        userId,
        achievementId,
      },
    },
    update: {
      earnedAt: new Date(),
      notified: false,
    },
    create: {
      userId,
      achievementId,
      earnedAt: new Date(),
      notified: false,
    },
  });

  // Update user's achievement points
  const achievement = await prisma.achievement.findUnique({
    where: { id: achievementId },
    select: { points: true },
  });

  if (achievement) {
    await prisma.userStats.upsert({
      where: { userId },
      update: {
        achievementPoints: {
          increment: achievement.points,
        },
      },
      create: {
        userId,
        achievementPoints: achievement.points,
      },
    });
  }
}

async function updateProgress(userId: string, achievementId: string, event: AchievementEvent): Promise<void> {
  // For now, we'll handle progress updates in the main check function
  // This could be expanded for more complex progress tracking
}

// Helper functions
async function getCompletedPuzzlesCount(userId: string): Promise<number> {
  const count = await prisma.userProgress.count({
    where: {
      userId,
      isCompleted: true,
    },
  });
  return count;
}

async function getCurrentStreak(userId: string): Promise<number> {
  const userStats = await prisma.userStats.findUnique({
    where: { userId },
    select: { currentStreak: true },
  });
  return userStats?.currentStreak || 0;
}

async function getDifficultyCompletedCount(userId: string, difficulty: string): Promise<number> {
  const count = await prisma.userProgress.count({
    where: {
      userId,
      isCompleted: true,
      puzzle: {
        difficulty,
      },
    },
  });
  return count;
}

// Update user stats when puzzle is completed
export async function updateUserStats(
  userId: string,
  data: {
    puzzlesCompleted?: number;
    totalScore?: number;
    playTime?: number;
    accuracy?: number;
  }
): Promise<void> {
  const updateData: any = {};

  if (data.puzzlesCompleted) {
    updateData.totalPuzzlesCompleted = { increment: data.puzzlesCompleted };
  }

  if (data.totalScore) {
    updateData.totalScore = { increment: data.totalScore };
  }

  if (data.playTime) {
    updateData.totalPlayTime = { increment: data.playTime };
  }

  if (data.accuracy !== undefined) {
    // Update average accuracy (simplified - in production, you'd want more sophisticated averaging)
    updateData.averageAccuracy = data.accuracy;
  }

  updateData.lastPlayedDate = new Date();

  await prisma.userStats.upsert({
    where: { userId },
    update: updateData,
    create: {
      userId,
      ...updateData,
    },
  });
}
