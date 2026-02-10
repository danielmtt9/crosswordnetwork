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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (start >= end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    const report = await AdminActivityDashboard.generateActivityReport(start, end);

    return NextResponse.json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error generating admin activity report:', error);
    return NextResponse.json(
      { error: 'Failed to generate admin activity report' },
      { status: 500 }
    );
  }
}
