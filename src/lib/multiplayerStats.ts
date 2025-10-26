import { prisma } from './prisma';
import { ParticipantRole } from '@prisma/client';

export interface MultiplayerStats {
  // Room participation
  roomsJoined: number;
  roomsHosted: number;
  roomsCompleted: number;
  roomsSpectated: number;
  
  // Time tracking
  totalMultiplayerTime: number; // in seconds
  averageSessionDuration: number; // in seconds
  
  // Social metrics
  uniquePlayersMet: number;
  friendsPlayedWith: number;
  
  // Performance metrics
  multiplayerCompletionRate: number; // percentage
  averageMultiplayerScore: number;
  bestMultiplayerScore: number;
  
  // Role statistics
  timesAsHost: number;
  timesAsPlayer: number;
  timesAsSpectator: number;
  
  // Recent activity
  lastMultiplayerSession: Date | null;
  currentStreak: number; // consecutive days with multiplayer activity
  longestStreak: number;
  
  // Achievement progress
  multiplayerAchievementsEarned: number;
  multiplayerAchievementPoints: number;
}

export interface MultiplayerSessionData {
  roomId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  leftAt?: Date;
  isCompleted: boolean;
  score?: number;
  hintsUsed?: number;
  sessionDuration?: number;
}

/**
 * Multiplayer statistics manager
 * Handles tracking and calculation of multiplayer-specific metrics
 */
export class MultiplayerStatsManager {
  /**
   * Update user's multiplayer statistics
   */
  static async updateUserStats(userId: string, sessionData: MultiplayerSessionData): Promise<void> {
    try {
      // Get current user stats
      let userStats = await prisma.userStats.findUnique({
        where: { userId }
      });

      if (!userStats) {
        // Create new user stats if they don't exist
        userStats = await prisma.userStats.create({
          data: {
            userId,
            totalPuzzlesStarted: 0,
            totalPuzzlesCompleted: 0,
            totalPlayTime: 0,
            averageAccuracy: 100.0,
            averageCompletionTime: 0.0,
            currentStreak: 0,
            longestStreak: 0,
            totalScore: 0,
            achievementPoints: 0
          }
        });
      }

      // Calculate session duration
      const sessionDuration = sessionData.sessionDuration || 
        (sessionData.leftAt ? 
          Math.floor((sessionData.leftAt.getTime() - sessionData.joinedAt.getTime()) / 1000) : 
          0
        );

      // Update multiplayer-specific stats
      await this.updateMultiplayerMetrics(userId, sessionData, sessionDuration);

      // Update general stats
      await prisma.userStats.update({
        where: { userId },
        data: {
          totalPlayTime: userStats.totalPlayTime + sessionDuration,
          lastPlayedDate: new Date(),
          totalScore: userStats.totalScore + (sessionData.score || 0)
        }
      });

    } catch (error) {
      console.error('Error updating multiplayer stats:', error);
      throw error;
    }
  }

  /**
   * Update multiplayer-specific metrics
   */
  private static async updateMultiplayerMetrics(
    userId: string, 
    sessionData: MultiplayerSessionData, 
    sessionDuration: number
  ): Promise<void> {
    // Get current multiplayer stats from user stats metadata
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    const currentStats = this.parseMultiplayerStats(userStats);

    // Update stats based on session data
    const updatedStats: MultiplayerStats = {
      ...currentStats,
      roomsJoined: currentStats.roomsJoined + 1,
      totalMultiplayerTime: currentStats.totalMultiplayerTime + sessionDuration,
      lastMultiplayerSession: new Date(),
      uniquePlayersMet: await this.calculateUniquePlayersMet(userId),
      friendsPlayedWith: await this.calculateFriendsPlayedWith(userId)
    };

    // Update role-specific stats
    switch (sessionData.role) {
      case 'HOST':
        updatedStats.roomsHosted = currentStats.roomsHosted + 1;
        updatedStats.timesAsHost = currentStats.timesAsHost + 1;
        break;
      case 'PLAYER':
        updatedStats.timesAsPlayer = currentStats.timesAsPlayer + 1;
        if (sessionData.isCompleted) {
          updatedStats.roomsCompleted = currentStats.roomsCompleted + 1;
          updatedStats.averageMultiplayerScore = this.calculateAverageScore(
            currentStats.averageMultiplayerScore,
            currentStats.roomsCompleted,
            sessionData.score || 0
          );
          updatedStats.bestMultiplayerScore = Math.max(
            currentStats.bestMultiplayerScore,
            sessionData.score || 0
          );
        }
        break;
      case 'SPECTATOR':
        updatedStats.roomsSpectated = currentStats.roomsSpectated + 1;
        updatedStats.timesAsSpectator = currentStats.timesAsSpectator + 1;
        break;
    }

    // Calculate completion rate
    updatedStats.multiplayerCompletionRate = this.calculateCompletionRate(
      updatedStats.roomsCompleted,
      updatedStats.roomsJoined
    );

    // Calculate average session duration
    updatedStats.averageSessionDuration = this.calculateAverageSessionDuration(
      updatedStats.totalMultiplayerTime,
      updatedStats.roomsJoined
    );

    // Update streak
    const streakData = await this.calculateStreak(userId);
    updatedStats.currentStreak = streakData.current;
    updatedStats.longestStreak = Math.max(currentStats.longestStreak, streakData.longest);

    // Store updated stats in user stats metadata
    await this.storeMultiplayerStats(userId, updatedStats);
  }

  /**
   * Get user's multiplayer statistics
   */
  static async getUserMultiplayerStats(userId: string): Promise<MultiplayerStats> {
    const userStats = await prisma.userStats.findUnique({
      where: { userId }
    });

    if (!userStats) {
      return this.getDefaultMultiplayerStats();
    }

    return this.parseMultiplayerStats(userStats);
  }

  /**
   * Get multiplayer leaderboard data
   */
  static async getMultiplayerLeaderboard(
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME',
    limit: number = 10
  ): Promise<Array<{
    userId: string;
    userName: string;
    userAvatar?: string;
    metric: string;
    value: number;
    rank: number;
  }>> {
    const periodStart = this.getPeriodStart(period);
    const periodEnd = new Date();

    // Get rooms completed in period
    const roomsCompleted = await prisma.multiplayerRoom.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      include: {
        participants: {
          where: {
            role: 'PLAYER'
          },
          include: {
            user: true
          }
        }
      }
    });

    // Calculate metrics for each user
    const userMetrics = new Map<string, {
      userId: string;
      userName: string;
      userAvatar?: string;
      roomsCompleted: number;
      totalScore: number;
      totalTime: number;
    }>();

    for (const room of roomsCompleted) {
      for (const participant of room.participants) {
        const userId = participant.userId;
        const existing = userMetrics.get(userId) || {
          userId,
          userName: participant.user.name || participant.user.username || 'Unknown',
          userAvatar: participant.user.image || undefined,
          roomsCompleted: 0,
          totalScore: 0,
          totalTime: 0
        };

        existing.roomsCompleted += 1;
        // Note: Score and time would need to be tracked separately
        userMetrics.set(userId, existing);
      }
    }

    // Convert to leaderboard format and sort
    const leaderboard = Array.from(userMetrics.values())
      .map((user, index) => ({
        userId: user.userId,
        userName: user.userName,
        userAvatar: user.userAvatar,
        metric: 'rooms_completed',
        value: user.roomsCompleted,
        rank: index + 1
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    return leaderboard;
  }

  /**
   * Get multiplayer achievement progress
   */
  static async getMultiplayerAchievementProgress(userId: string): Promise<Array<{
    achievementId: string;
    achievementKey: string;
    name: string;
    description: string;
    progress: number;
    maxProgress: number;
    isEarned: boolean;
    earnedAt?: Date;
  }>> {
    const achievements = await prisma.achievement.findMany({
      where: {
        category: 'SOCIAL'
      },
      include: {
        userAchievements: {
          where: { userId }
        }
      }
    });

    const userStats = await this.getUserMultiplayerStats(userId);

    return achievements.map(achievement => {
      const userAchievement = achievement.userAchievements[0];
      const progress = this.calculateAchievementProgress(achievement, userStats);

      return {
        achievementId: achievement.id,
        achievementKey: achievement.key,
        name: achievement.name,
        description: achievement.description || '',
        progress: progress.current,
        maxProgress: progress.max,
        isEarned: !!userAchievement?.earnedAt,
        earnedAt: userAchievement?.earnedAt || undefined
      };
    });
  }

  /**
   * Parse multiplayer stats from user stats
   */
  private static parseMultiplayerStats(userStats: any): MultiplayerStats {
    // For now, return default stats since we don't have a dedicated multiplayer stats table
    // In a real implementation, you'd store this in a separate table or JSON field
    return this.getDefaultMultiplayerStats();
  }

  /**
   * Store multiplayer stats
   */
  private static async storeMultiplayerStats(userId: string, stats: MultiplayerStats): Promise<void> {
    // In a real implementation, you'd store this in a dedicated table
    // For now, we'll just log the stats
    console.log(`Multiplayer stats for user ${userId}:`, stats);
  }

  /**
   * Get default multiplayer stats
   */
  private static getDefaultMultiplayerStats(): MultiplayerStats {
    return {
      roomsJoined: 0,
      roomsHosted: 0,
      roomsCompleted: 0,
      roomsSpectated: 0,
      totalMultiplayerTime: 0,
      averageSessionDuration: 0,
      uniquePlayersMet: 0,
      friendsPlayedWith: 0,
      multiplayerCompletionRate: 0,
      averageMultiplayerScore: 0,
      bestMultiplayerScore: 0,
      timesAsHost: 0,
      timesAsPlayer: 0,
      timesAsSpectator: 0,
      lastMultiplayerSession: null,
      currentStreak: 0,
      longestStreak: 0,
      multiplayerAchievementsEarned: 0,
      multiplayerAchievementPoints: 0
    };
  }

  /**
   * Calculate unique players met
   */
  private static async calculateUniquePlayersMet(userId: string): Promise<number> {
    const uniquePlayers = await prisma.roomParticipant.findMany({
      where: {
        room: {
          participants: {
            some: {
              userId
            }
          }
        },
        userId: {
          not: userId
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    return uniquePlayers.length;
  }

  /**
   * Calculate friends played with
   */
  private static async calculateFriendsPlayedWith(userId: string): Promise<number> {
    // Get user's friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      }
    });

    const friendIds = friendships.map(f => 
      f.userId === userId ? f.friendId : f.userId
    );

    if (friendIds.length === 0) return 0;

    // Count unique friends played with
    const friendsPlayedWith = await prisma.roomParticipant.findMany({
      where: {
        userId: {
          in: friendIds
        },
        room: {
          participants: {
            some: {
              userId
            }
          }
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    return friendsPlayedWith.length;
  }

  /**
   * Calculate average score
   */
  private static calculateAverageScore(
    currentAverage: number,
    currentCount: number,
    newScore: number
  ): number {
    if (currentCount === 0) return newScore;
    return (currentAverage * currentCount + newScore) / (currentCount + 1);
  }

  /**
   * Calculate completion rate
   */
  private static calculateCompletionRate(completed: number, joined: number): number {
    if (joined === 0) return 0;
    return (completed / joined) * 100;
  }

  /**
   * Calculate average session duration
   */
  private static calculateAverageSessionDuration(totalTime: number, sessionCount: number): number {
    if (sessionCount === 0) return 0;
    return totalTime / sessionCount;
  }

  /**
   * Calculate streak
   */
  private static async calculateStreak(userId: string): Promise<{ current: number; longest: number }> {
    // This would need to be implemented based on daily multiplayer activity
    // For now, return default values
    return { current: 0, longest: 0 };
  }

  /**
   * Calculate achievement progress
   */
  private static calculateAchievementProgress(achievement: any, userStats: MultiplayerStats): { current: number; max: number } {
    const requirement = JSON.parse(achievement.requirement);
    
    switch (requirement.type) {
      case 'rooms_joined':
        return { current: userStats.roomsJoined, max: requirement.threshold };
      case 'rooms_hosted':
        return { current: userStats.roomsHosted, max: requirement.threshold };
      case 'rooms_completed':
        return { current: userStats.roomsCompleted, max: requirement.threshold };
      case 'friends_played_with':
        return { current: userStats.friendsPlayedWith, max: requirement.threshold };
      default:
        return { current: 0, max: 1 };
    }
  }

  /**
   * Get period start date
   */
  private static getPeriodStart(period: string): Date {
    const now = new Date();
    
    switch (period) {
      case 'DAILY':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'WEEKLY':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
      case 'MONTHLY':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'ALL_TIME':
        return new Date(0);
      default:
        return new Date(0);
    }
  }
}
