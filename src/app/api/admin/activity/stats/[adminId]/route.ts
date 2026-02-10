import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { AdminActivityDashboard } from '@/lib/adminActivityDashboard';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  const { adminId } = await params;
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { adminId } = await params;
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') as '24h' | '7d' | '30d' || '30d';

    const stats = await AdminActivityDashboard.getAdminActivityStats(adminId, timeRange);

    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching admin activity stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin activity stats' },
      { status: 500 }
    );
  }
}
