import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { SuspiciousActivityDetector } from '@/lib/suspiciousActivity';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await SuspiciousActivityDetector.getAlerts({
      status: status || undefined,
      severity: severity || undefined,
      userId: userId || undefined,
      limit,
      offset
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security alerts' },
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
    const { action, alertId, resolution } = body;

    switch (action) {
      case 'acknowledge':
        await SuspiciousActivityDetector.acknowledgeAlert(alertId, session.user.id);
        break;
      
      case 'resolve':
        await SuspiciousActivityDetector.resolveAlert(alertId, session.user.id, resolution);
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing security alert action:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}
