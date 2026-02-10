import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { AdminActivityDashboard } from '@/lib/adminActivityDashboard';

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
    const limit = parseInt(searchParams.get('limit') || '50');

    const feed = await AdminActivityDashboard.getRealTimeActivityFeed(limit);

    return NextResponse.json({
      success: true,
      feed
    });
  } catch (error) {
    console.error('Error fetching admin activity feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin activity feed' },
      { status: 500 }
    );
  }
}
