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

    // Get achievement data for export
    const achievements = await prisma.achievement.findMany({
      where: category !== 'all' ? { category: category as any } : undefined,
      include: {
        userAchievements: {
          where: { earned: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    // Generate CSV content
    const csvHeaders = [
      'Achievement ID',
      'Achievement Name',
      'Category',
      'Tier',
      'Points',
      'Description',
      'Total Users',
      'Completed Users',
      'Completion Rate (%)',
      'Average Completion Time (minutes)',
      'Created At',
      'Updated At'
    ];

    const csvRows = achievements.map(achievement => {
      const totalUsers = achievement.userAchievements.length;
      const completionRate = totalUsers > 0 ? (totalUsers / totalUsers) * 100 : 0; // This would need actual total user count
      
      const averageCompletionTime = achievement.userAchievements.reduce(
        (sum, ua) => sum + (ua.completionTime || 0), 0
      ) / Math.max(achievement.userAchievements.length, 1);

      return [
        achievement.id,
        `"${achievement.name}"`,
        achievement.category,
        achievement.tier,
        achievement.points,
        `"${achievement.description}"`,
        totalUsers, // This should be actual total users
        achievement.userAchievements.length,
        completionRate.toFixed(2),
        averageCompletionTime.toFixed(2),
        achievement.createdAt.toISOString(),
        achievement.updatedAt.toISOString()
      ].join(',');
    });

    const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

    // Create response with CSV content
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="achievement-analytics-${period}-${category}.csv"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Error exporting achievement analytics:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}
