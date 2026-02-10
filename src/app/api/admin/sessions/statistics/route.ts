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

    const statistics = await SessionMonitoringManager.getSessionStatistics();

    return NextResponse.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error fetching session statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session statistics' },
      { status: 500 }
    );
  }
}
