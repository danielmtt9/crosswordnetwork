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
    const period = searchParams.get('period') || '30d';
    const category = searchParams.get('category') || 'all';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get completion rates by category
    const completionRates = await prisma.achievement.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      where: category !== 'all' ? { category: category as any } : undefined
    });

    const completionRatesWithStats = await Promise.all(
      completionRates.map(async (category) => {
        const totalUsers = await prisma.user.count();
        const completedUsers = await prisma.userAchievement.count({
          where: {
            achievement: { category: category.category },
            earned: true
          }
        });

        return {
          category: category.category,
          completionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0,
          totalUsers,
          completedUsers
        };
      })
    );

    // Get engagement metrics
    const totalAchievements = await prisma.achievement.count();
    const totalUserAchievements = await prisma.userAchievement.count({
      where: { earned: true }
    });
    
    const averageCompletionTime = await prisma.userAchievement.aggregate({
      where: { earned: true },
      _avg: { completionTime: true }
    });

    // Get most/least popular achievements
    const achievementStats = await prisma.userAchievement.groupBy({
      by: ['achievementId'],
      _count: { id: true },
      where: { earned: true }
    });

    const achievementPopularity = await Promise.all(
      achievementStats.map(async (stat) => {
        const achievement = await prisma.achievement.findUnique({
          where: { id: stat.achievementId },
          select: { name: true }
        });
        return {
          achievementId: stat.achievementId,
          name: achievement?.name || 'Unknown',
          count: stat._count.id
        };
      })
    );

    const mostPopular = achievementPopularity.reduce((max, current) => 
      current.count > max.count ? current : max, achievementPopularity[0] || { name: 'None', count: 0 }
    );

    const leastPopular = achievementPopularity.reduce((min, current) => 
      current.count < min.count ? current : min, achievementPopularity[0] || { name: 'None', count: 0 }
    );

    // Get active users
    const dailyActiveUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        }
      }
    });

    const weeklyActiveUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const monthlyActiveUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Get difficulty analysis
    const difficultyAnalysis = await prisma.achievement.groupBy({
      by: ['tier'],
      _count: { id: true }
    });

    const difficultyStats = await Promise.all(
      difficultyAnalysis.map(async (tier) => {
        const totalUsers = await prisma.user.count();
        const completedUsers = await prisma.userAchievement.count({
          where: {
            achievement: { tier: tier.tier },
            earned: true
          }
        });

        const averageTime = await prisma.userAchievement.aggregate({
          where: {
            achievement: { tier: tier.tier },
            earned: true
          },
          _avg: { completionTime: true }
        });

        return {
          tier: tier.tier,
          completionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0,
          averageTime: averageTime._avg.completionTime || 0,
          userCount: completedUsers
        };
      })
    );

    // Get user segmentation
    const userSegmentation = await prisma.user.groupBy({
      by: ['role'],
      _count: { id: true }
    });

    const segmentationStats = await Promise.all(
      userSegmentation.map(async (segment) => {
        const averageAchievements = await prisma.userAchievement.aggregate({
          where: {
            user: { role: segment.role },
            earned: true
          },
          _avg: { points: true }
        });

        return {
          segment: segment.role,
          userCount: segment._count.id,
          averageAchievements: averageAchievements._avg.points || 0,
          engagementScore: Math.random() * 100 // Placeholder for engagement score
        };
      })
    );

    // Get trend data (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const achievementsUnlocked = await prisma.userAchievement.count({
        where: {
          earned: true,
          earnedAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      const activeUsers = await prisma.user.count({
        where: {
          lastActiveAt: {
            gte: date,
            lt: nextDate
          }
        }
      });

      trendData.push({
        date: date.toISOString().split('T')[0],
        achievementsUnlocked,
        newUsers,
        activeUsers
      });
    }

    return NextResponse.json({
      completionRates: completionRatesWithStats,
      engagementMetrics: {
        totalAchievements,
        averageCompletionTime: averageCompletionTime._avg.completionTime || 0,
        mostPopularAchievement: mostPopular.name,
        leastPopularAchievement: leastPopular.name,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers
      },
      difficultyAnalysis: difficultyStats,
      userSegmentation: segmentationStats,
      trendData
    });
  } catch (error) {
    console.error("Error fetching achievement analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
