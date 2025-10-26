import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { MultiplayerAnalyticsManager } from '../../../../lib/multiplayerAnalytics';
import { isSuperAdmin } from '../../../../lib/superAdmin';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const puzzleId = searchParams.get('puzzleId');
    const difficulty = searchParams.get('difficulty');
    const userRole = searchParams.get('userRole');

    // Build filters
    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      puzzleId: puzzleId ? parseInt(puzzleId) : undefined,
      difficulty: difficulty || undefined,
      userRole: userRole || undefined
    };

    switch (type) {
      case 'overview':
        // Check if user is admin for global analytics
        if (userId && userId !== session.user.id) {
          const isAdmin = await isSuperAdmin(session.user.id);
          if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        const analytics = await MultiplayerAnalyticsManager.getAnalytics(filters);
        return NextResponse.json({ analytics });

      case 'user':
        const targetUserId = userId || session.user.id;
        
        // Users can only view their own analytics unless they're admin
        if (targetUserId !== session.user.id) {
          const isAdmin = await isSuperAdmin(session.user.id);
          if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }
        }

        const userAnalytics = await MultiplayerAnalyticsManager.getUserAnalytics(targetUserId, filters);
        return NextResponse.json({ userAnalytics });

      case 'trends':
        // Only admins can view trend analytics
        const isAdmin = await isSuperAdmin(session.user.id);
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const trends = await MultiplayerAnalyticsManager.getAnalytics(filters);
        return NextResponse.json({ 
          dailyTrends: trends.dailyTrends,
          weeklyTrends: trends.weeklyTrends,
          monthlyTrends: trends.monthlyTrends
        });

      case 'engagement':
        // Only admins can view engagement analytics
        const isAdminForEngagement = await isSuperAdmin(session.user.id);
        if (!isAdminForEngagement) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const engagement = await MultiplayerAnalyticsManager.getAnalytics(filters);
        return NextResponse.json({
          dailyActiveUsers: engagement.dailyActiveUsers,
          weeklyActiveUsers: engagement.weeklyActiveUsers,
          monthlyActiveUsers: engagement.monthlyActiveUsers,
          averageSessionsPerUser: engagement.averageSessionsPerUser
        });

      case 'performance':
        // Only admins can view performance analytics
        const isAdminForPerformance = await isSuperAdmin(session.user.id);
        if (!isAdminForPerformance) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const performance = await MultiplayerAnalyticsManager.getAnalytics(filters);
        return NextResponse.json({
          averageScore: performance.averageScore,
          bestScore: performance.bestScore,
          completionRate: performance.completionRate,
          hintUsageRate: performance.hintUsageRate,
          averageCompletionTime: performance.averageCompletionTime
        });

      case 'social':
        // Only admins can view social analytics
        const isAdminForSocial = await isSuperAdmin(session.user.id);
        if (!isAdminForSocial) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const social = await MultiplayerAnalyticsManager.getAnalytics(filters);
        return NextResponse.json({
          totalUniqueConnections: social.totalUniqueConnections,
          averageConnectionsPerUser: social.averageConnectionsPerUser,
          mostSocialUsers: social.mostSocialUsers
        });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error fetching multiplayer analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'track_session':
        // Track a multiplayer session
        // This would be called when a user joins/leaves a room
        // Implementation would depend on your specific tracking needs
        return NextResponse.json({ success: true });

      case 'track_achievement':
        // Track achievement progress
        // This would be called when a user makes progress toward an achievement
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing analytics request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
