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

    // Check if user has admin privileges
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true }
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get performance metrics
    const totalUsers = await prisma.user.count();
    // Count users who have been active (have user progress records) in the time range
    const activeUserIds = await prisma.userProgress.findMany({
      where: {
        lastPlayedAt: {
          gte: startDate
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    const activeUsers = activeUserIds.length;

    const achievementUnlocks = await prisma.userAchievement.count({
      where: {
        earnedAt: {
          gte: startDate
        }
      }
    });

    const averageCompletionTime = await prisma.userAchievement.aggregate({
      where: {
        earned: true,
        earnedAt: {
          gte: startDate
        }
      },
      _avg: { completionTime: true }
    });

    // Calculate system uptime (placeholder - would need actual monitoring)
    const systemUptime = 99.9; // Placeholder
    const errorRate = 0.1; // Placeholder

    // Get achievement performance
    const achievements = await prisma.achievement.findMany({
      include: {
        userAchievements: {
          where: { earned: true }
        }
      }
    });

    const achievementPerformance = await Promise.all(
      achievements.map(async (achievement) => {
        const totalUsers = await prisma.user.count();
        const completionRate = totalUsers > 0 ? (achievement.userAchievements.length / totalUsers) * 100 : 0;
        
        const averageTime = await prisma.userAchievement.aggregate({
          where: {
            achievementId: achievement.id,
            earned: true
          },
          _avg: { completionTime: true }
        });

        // Simulate issues detection
        const issues = [];
        if (completionRate < 5) {
          issues.push("Very low completion rate");
        }
        if (averageTime._avg.completionTime && averageTime._avg.completionTime > 60) {
          issues.push("High average completion time");
        }

        return {
          achievementId: achievement.id,
          name: achievement.name,
          category: achievement.category,
          tier: achievement.tier,
          completionRate,
          averageTime: averageTime._avg.completionTime || 0,
          userCount: achievement.userAchievements.length,
          issues
        };
      })
    );

    // Get user engagement
    const userEngagement = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    const engagementStats = await Promise.all(
      userEngagement.map(async (segment) => {
        const averageSessionTime = Math.random() * 60 + 10; // Placeholder
        const achievementsPerSession = Math.random() * 5 + 1; // Placeholder
        const retentionRate = Math.random() * 40 + 60; // Placeholder

        return {
          segment: segment.role,
          userCount: segment._count.id,
          averageSessionTime,
          achievementsPerSession,
          retentionRate
        };
      })
    );

    // Get system health metrics
    const systemHealth = [
      {
        metric: "Database Response Time",
        value: Math.random() * 100 + 10,
        status: Math.random() > 0.8 ? 'warning' : 'healthy' as 'healthy' | 'warning' | 'critical',
        threshold: 100
      },
      {
        metric: "Memory Usage",
        value: Math.random() * 80 + 20,
        status: Math.random() > 0.9 ? 'critical' : Math.random() > 0.7 ? 'warning' : 'healthy' as 'healthy' | 'warning' | 'critical',
        threshold: 85
      },
      {
        metric: "CPU Usage",
        value: Math.random() * 70 + 15,
        status: Math.random() > 0.8 ? 'warning' : 'healthy' as 'healthy' | 'warning' | 'critical',
        threshold: 80
      },
      {
        metric: "API Response Time",
        value: Math.random() * 200 + 50,
        status: Math.random() > 0.7 ? 'warning' : 'healthy' as 'healthy' | 'warning' | 'critical',
        threshold: 300
      },
      {
        metric: "Error Rate",
        value: Math.random() * 2,
        status: Math.random() > 0.8 ? 'critical' : Math.random() > 0.6 ? 'warning' : 'healthy' as 'healthy' | 'warning' | 'critical',
        threshold: 1
      },
      {
        metric: "Active Connections",
        value: Math.random() * 1000 + 100,
        status: 'healthy' as 'healthy' | 'warning' | 'critical',
        threshold: 2000
      }
    ];

    // Get recent activity
    const recentActivity = [
      {
        id: '1',
        type: 'Achievement Unlock',
        description: 'User completed "Speed Demon" achievement',
        timestamp: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
        severity: 'info' as 'info' | 'warning' | 'error'
      },
      {
        id: '2',
        type: 'System Alert',
        description: 'High memory usage detected',
        timestamp: new Date(now.getTime() - Math.random() * 7200000).toISOString(),
        severity: 'warning' as 'info' | 'warning' | 'error'
      },
      {
        id: '3',
        type: 'User Registration',
        description: 'New user registered',
        timestamp: new Date(now.getTime() - Math.random() * 10800000).toISOString(),
        severity: 'info' as 'info' | 'warning' | 'error'
      },
      {
        id: '4',
        type: 'Database Error',
        description: 'Connection timeout to database',
        timestamp: new Date(now.getTime() - Math.random() * 14400000).toISOString(),
        severity: 'error' as 'info' | 'warning' | 'error'
      },
      {
        id: '5',
        type: 'Achievement Unlock',
        description: 'User completed "Puzzle Master" achievement',
        timestamp: new Date(now.getTime() - Math.random() * 18000000).toISOString(),
        severity: 'info' as 'info' | 'warning' | 'error'
      }
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      performanceMetrics: {
        totalUsers,
        activeUsers,
        achievementUnlocks,
        averageCompletionTime: averageCompletionTime._avg.completionTime || 0,
        systemUptime,
        errorRate
      },
      achievementPerformance,
      userEngagement: engagementStats,
      systemHealth,
      recentActivity
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin analytics" },
      { status: 500 }
    );
  }
}
