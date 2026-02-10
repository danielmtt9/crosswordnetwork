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

    const config = SessionMonitoringManager.getConfig();

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching session config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: 'Config is required' }, { status: 400 });
    }

    SessionMonitoringManager.updateConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session config:', error);
    return NextResponse.json(
      { error: 'Failed to update session config' },
      { status: 500 }
    );
  }
}
