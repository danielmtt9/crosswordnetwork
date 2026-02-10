import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { SessionMonitoringManager } from '@/lib/sessionMonitoring';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const activeSessions = await SessionMonitoringManager.getActiveAdminSessions();

    return NextResponse.json({
      success: true,
      sessions: activeSessions
    });
  } catch (error) {
    console.error('Error fetching admin sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, sessionId, userId, reason, minutes } = body;

    switch (action) {
      case 'force_logout':
        if (!sessionId || !userId || !reason) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        await SessionMonitoringManager.forceLogout(userId, sessionId, reason);
        break;
      
      case 'extend_session':
        if (!sessionId || !userId || !minutes) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }
        await SessionMonitoringManager.extendSession(userId, sessionId, minutes);
        break;
      
      case 'cleanup_expired':
        const deletedCount = await SessionMonitoringManager.cleanupExpiredSessions();
        return NextResponse.json({ success: true, deletedCount });
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing session action:', error);
    return NextResponse.json(
      { error: 'Failed to process session action' },
      { status: 500 }
    );
  }
}
