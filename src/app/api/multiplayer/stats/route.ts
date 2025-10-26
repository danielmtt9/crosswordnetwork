import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { MultiplayerStatsManager } from '../../../../lib/multiplayerStats';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const type = searchParams.get('type') || 'user';

    switch (type) {
      case 'user':
        // Get user's multiplayer statistics
        const userStats = await MultiplayerStatsManager.getUserMultiplayerStats(userId);
        return NextResponse.json({ stats: userStats });

      case 'leaderboard':
        // Get multiplayer leaderboard
        const period = searchParams.get('period') as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' || 'ALL_TIME';
        const limit = parseInt(searchParams.get('limit') || '10');
        
        const leaderboard = await MultiplayerStatsManager.getMultiplayerLeaderboard(period, limit);
        return NextResponse.json({ leaderboard });

      case 'achievements':
        // Get multiplayer achievement progress
        const achievements = await MultiplayerStatsManager.getMultiplayerAchievementProgress(userId);
        return NextResponse.json({ achievements });

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error fetching multiplayer stats:', error);
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
      case 'update_session':
        // Update user's multiplayer session statistics
        await MultiplayerStatsManager.updateUserStats(session.user.id, data);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error updating multiplayer stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
