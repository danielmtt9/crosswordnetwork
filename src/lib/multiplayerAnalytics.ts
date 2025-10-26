import { prisma } from './prisma';
import { ParticipantRole } from '@prisma/client';

export interface MultiplayerAnalytics {
  // Session Analytics
  totalSessions: number;
  averageSessionDuration: number;
  longestSession: number;
  shortestSession: number;
  
  // Engagement Metrics
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionsPerUser: number;
  
  // Room Analytics
  roomsCreated: number;
  roomsCompleted: number;
  roomsAbandoned: number;
  averageRoomSize: number;
  averageCompletionTime: number;
  
  // User Behavior
  mostActiveHours: Array<{ hour: number; count: number }>;
  mostPopularPuzzles: Array<{ puzzleId: number; title: string; playCount: number }>;
  roleDistribution: Array<{ role: ParticipantRole; count: number; percentage: number }>;
  
  // Performance Metrics
  averageScore: number;
  bestScore: number;
  completionRate: number;
  hintUsageRate: number;
  
  // Social Metrics
  totalUniqueConnections: number;
  averageConnectionsPerUser: number;
  mostSocialUsers: Array<{ userId: string; userName: string; connections: number }>;
  
  // Time-based Trends
  dailyTrends: Array<{ date: string; sessions: number; users: number }>;
  weeklyTrends: Array<{ week: string; sessions: number; users: number }>;
  monthlyTrends: Array<{ month: string; sessions: number; users: number }>;
}

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  puzzleId?: number;
  difficulty?: string;
  userRole?: string;
}

/**
 * Multiplayer analytics manager
 * Provides comprehensive analytics and reporting for multiplayer features
 */
export class MultiplayerAnalyticsManager {
  /**
   * Get comprehensive multiplayer analytics
   */
  static async getAnalytics(filters: AnalyticsFilters = {}): Promise<MultiplayerAnalytics> {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      puzzleId,
      difficulty,
      userRole
    } = filters;

    // Build base where clause
    const baseWhere = {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      ...(puzzleId && { puzzleId }),
      ...(difficulty && { difficulty })
    };

    // Get all analytics data in parallel
    const [
      sessionAnalytics,
      engagementMetrics,
      roomAnalytics,
      userBehavior,
      performanceMetrics,
      socialMetrics,
      timeTrends
    ] = await Promise.all([
      this.getSessionAnalytics(baseWhere),
      this.getEngagementMetrics(startDate, endDate),
      this.getRoomAnalytics(baseWhere),
      this.getUserBehavior(baseWhere),
      this.getPerformanceMetrics(baseWhere),
      this.getSocialMetrics(startDate, endDate),
      this.getTimeTrends(startDate, endDate)
    ]);

    return {
      ...sessionAnalytics,
      ...engagementMetrics,
      ...roomAnalytics,
      ...userBehavior,
      ...performanceMetrics,
      ...socialMetrics,
      ...timeTrends
    };
  }

  /**
   * Get session analytics
   */
  private static async getSessionAnalytics(whereClause: any) {
    const sessions = await prisma.roomParticipant.findMany({
      where: {
        room: whereClause
      },
      include: {
        room: true
      }
    });

    const sessionDurations = sessions
      .filter(s => s.leftAt)
      .map(s => {
        const duration = s.leftAt!.getTime() - s.joinedAt.getTime();
        return Math.floor(duration / 1000); // Convert to seconds
      });

    return {
      totalSessions: sessions.length,
      averageSessionDuration: sessionDurations.length > 0 
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
        : 0,
      longestSession: sessionDurations.length > 0 ? Math.max(...sessionDurations) : 0,
      shortestSession: sessionDurations.length > 0 ? Math.min(...sessionDurations) : 0
    };
  }

  /**
   * Get engagement metrics
   */
  private static async getEngagementMetrics(startDate: Date, endDate: Date) {
    const dailyUsers = await this.getActiveUsers(startDate, endDate, 1);
    const weeklyUsers = await this.getActiveUsers(startDate, endDate, 7);
    const monthlyUsers = await this.getActiveUsers(startDate, endDate, 30);

    const totalSessions = await prisma.roomParticipant.count({
      where: {
        joinedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    return {
      dailyActiveUsers: dailyUsers,
      weeklyActiveUsers: weeklyUsers,
      monthlyActiveUsers: monthlyUsers,
      averageSessionsPerUser: monthlyUsers > 0 ? totalSessions / monthlyUsers : 0
    };
  }

  /**
   * Get room analytics
   */
  private static async getRoomAnalytics(whereClause: any) {
    const rooms = await prisma.multiplayerRoom.findMany({
      where: whereClause,
      include: {
        participants: true
      }
    });

    const completedRooms = rooms.filter(r => r.status === 'COMPLETED');
    const abandonedRooms = rooms.filter(r => r.status === 'EXPIRED');

    const roomSizes = rooms.map(r => r.participants.length);
    const completionTimes = completedRooms
      .filter(r => r.startedAt && r.completedAt)
      .map(r => {
        const duration = r.completedAt!.getTime() - r.startedAt!.getTime();
        return Math.floor(duration / 1000); // Convert to seconds
      });

    return {
      roomsCreated: rooms.length,
      roomsCompleted: completedRooms.length,
      roomsAbandoned: abandonedRooms.length,
      averageRoomSize: roomSizes.length > 0 
        ? roomSizes.reduce((a, b) => a + b, 0) / roomSizes.length 
        : 0,
      averageCompletionTime: completionTimes.length > 0 
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
        : 0
    };
  }

  /**
   * Get user behavior analytics
   */
  private static async getUserBehavior(whereClause: any) {
    const sessions = await prisma.roomParticipant.findMany({
      where: {
        room: whereClause
      },
      include: {
        room: {
          include: {
            puzzle: true
          }
        }
      }
    });

    // Most active hours
    const hourCounts = new Map<number, number>();
    sessions.forEach(session => {
      const hour = session.joinedAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const mostActiveHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 24);

    // Most popular puzzles
    const puzzleCounts = new Map<number, { title: string; count: number }>();
    sessions.forEach(session => {
      const puzzle = session.room.puzzle;
      const existing = puzzleCounts.get(puzzle.id) || { title: puzzle.title, count: 0 };
      existing.count += 1;
      puzzleCounts.set(puzzle.id, existing);
    });

    const mostPopularPuzzles = Array.from(puzzleCounts.entries())
      .map(([puzzleId, data]) => ({ puzzleId, title: data.title, playCount: data.count }))
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 10);

    // Role distribution
    const roleCounts = new Map<ParticipantRole, number>();
    sessions.forEach(session => {
      roleCounts.set(session.role, (roleCounts.get(session.role) || 0) + 1);
    });

    const totalSessions = sessions.length;
    const roleDistribution = Array.from(roleCounts.entries())
      .map(([role, count]) => ({
        role,
        count,
        percentage: totalSessions > 0 ? (count / totalSessions) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    return {
      mostActiveHours,
      mostPopularPuzzles,
      roleDistribution
    };
  }

  /**
   * Get performance metrics
   */
  private static async getPerformanceMetrics(whereClause: any) {
    // This would need to be implemented based on actual score tracking
    // For now, return default values
    return {
      averageScore: 0,
      bestScore: 0,
      completionRate: 0,
      hintUsageRate: 0
    };
  }

  /**
   * Get social metrics
   */
  private static async getSocialMetrics(startDate: Date, endDate: Date) {
    const uniqueConnections = await prisma.roomParticipant.findMany({
      where: {
        joinedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        userId: true,
        room: {
          select: {
            participants: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    // Calculate unique connections
    const connectionMap = new Map<string, Set<string>>();
    uniqueConnections.forEach(participant => {
      const userId = participant.userId;
      if (!connectionMap.has(userId)) {
        connectionMap.set(userId, new Set());
      }
      
      participant.room.participants.forEach(other => {
        if (other.userId !== userId) {
          connectionMap.get(userId)!.add(other.userId);
        }
      });
    });

    const totalUniqueConnections = Array.from(connectionMap.values())
      .reduce((total, connections) => total + connections.size, 0);

    const averageConnectionsPerUser = connectionMap.size > 0 
      ? totalUniqueConnections / connectionMap.size 
      : 0;

    // Most social users
    const socialUsers = Array.from(connectionMap.entries())
      .map(([userId, connections]) => ({
        userId,
        userName: 'User', // Would need to fetch actual names
        connections: connections.size
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 10);

    return {
      totalUniqueConnections,
      averageConnectionsPerUser,
      mostSocialUsers: socialUsers
    };
  }

  /**
   * Get time-based trends
   */
  private static async getTimeTrends(startDate: Date, endDate: Date) {
    const dailyTrends = await this.getDailyTrends(startDate, endDate);
    const weeklyTrends = await this.getWeeklyTrends(startDate, endDate);
    const monthlyTrends = await this.getMonthlyTrends(startDate, endDate);

    return {
      dailyTrends,
      weeklyTrends,
      monthlyTrends
    };
  }

  /**
   * Get daily trends
   */
  private static async getDailyTrends(startDate: Date, endDate: Date) {
    const trends = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const sessions = await prisma.roomParticipant.count({
        where: {
          joinedAt: {
            gte: dayStart,
            lt: dayEnd
          }
        }
      });

      const users = await this.getActiveUsers(dayStart, dayEnd, 1);

      trends.push({
        date: current.toISOString().split('T')[0],
        sessions,
        users
      });

      current.setDate(current.getDate() + 1);
    }

    return trends;
  }

  /**
   * Get weekly trends
   */
  private static async getWeeklyTrends(startDate: Date, endDate: Date) {
    const trends = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const sessions = await prisma.roomParticipant.count({
        where: {
          joinedAt: {
            gte: weekStart,
            lt: weekEnd
          }
        }
      });

      const users = await this.getActiveUsers(weekStart, weekEnd, 7);

      trends.push({
        week: current.toISOString().split('T')[0],
        sessions,
        users
      });

      current.setDate(current.getDate() + 7);
    }

    return trends;
  }

  /**
   * Get monthly trends
   */
  private static async getMonthlyTrends(startDate: Date, endDate: Date) {
    const trends = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (current <= endDate) {
      const monthStart = new Date(current);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 1);

      const sessions = await prisma.roomParticipant.count({
        where: {
          joinedAt: {
            gte: monthStart,
            lt: monthEnd
          }
        }
      });

      const users = await this.getActiveUsers(monthStart, monthEnd, 30);

      trends.push({
        month: current.toISOString().substring(0, 7), // YYYY-MM format
        sessions,
        users
      });

      current.setMonth(current.getMonth() + 1);
    }

    return trends;
  }

  /**
   * Get active users for a period
   */
  private static async getActiveUsers(startDate: Date, endDate: Date, days: number) {
    const uniqueUsers = await prisma.roomParticipant.findMany({
      where: {
        joinedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    return uniqueUsers.length;
  }

  /**
   * Get user-specific analytics
   */
  static async getUserAnalytics(userId: string, filters: AnalyticsFilters = {}): Promise<{
    totalSessions: number;
    averageSessionDuration: number;
    favoritePuzzles: Array<{ puzzleId: number; title: string; playCount: number }>;
    rolePreference: Array<{ role: ParticipantRole; count: number; percentage: number }>;
    activityPattern: Array<{ hour: number; count: number }>;
    socialConnections: number;
    completionRate: number;
  }> {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date()
    } = filters;

    const sessions = await prisma.roomParticipant.findMany({
      where: {
        userId,
        joinedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        room: {
          include: {
            puzzle: true,
            participants: true
          }
        }
      }
    });

    // Calculate metrics
    const sessionDurations = sessions
      .filter(s => s.leftAt)
      .map(s => Math.floor((s.leftAt!.getTime() - s.joinedAt.getTime()) / 1000));

    const puzzleCounts = new Map<number, { title: string; count: number }>();
    sessions.forEach(session => {
      const puzzle = session.room.puzzle;
      const existing = puzzleCounts.get(puzzle.id) || { title: puzzle.title, count: 0 };
      existing.count += 1;
      puzzleCounts.set(puzzle.id, existing);
    });

    const roleCounts = new Map<ParticipantRole, number>();
    sessions.forEach(session => {
      roleCounts.set(session.role, (roleCounts.get(session.role) || 0) + 1);
    });

    const hourCounts = new Map<number, number>();
    sessions.forEach(session => {
      const hour = session.joinedAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    const uniqueConnections = new Set<string>();
    sessions.forEach(session => {
      session.room.participants.forEach(participant => {
        if (participant.userId !== userId) {
          uniqueConnections.add(participant.userId);
        }
      });
    });

    const completedSessions = sessions.filter(s => s.room.status === 'COMPLETED').length;

    return {
      totalSessions: sessions.length,
      averageSessionDuration: sessionDurations.length > 0 
        ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length 
        : 0,
      favoritePuzzles: Array.from(puzzleCounts.entries())
        .map(([puzzleId, data]) => ({ puzzleId, title: data.title, playCount: data.count }))
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5),
      rolePreference: Array.from(roleCounts.entries())
        .map(([role, count]) => ({
          role,
          count,
          percentage: sessions.length > 0 ? (count / sessions.length) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count),
      activityPattern: Array.from(hourCounts.entries())
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count),
      socialConnections: uniqueConnections.size,
      completionRate: sessions.length > 0 ? (completedSessions / sessions.length) * 100 : 0
    };
  }
}
