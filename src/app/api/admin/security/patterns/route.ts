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

    const patterns = SuspiciousActivityDetector.getPatterns();
    return NextResponse.json({ patterns });
  } catch (error) {
    console.error('Error fetching security patterns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security patterns' },
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
    const { patternId, updates } = body;

    if (!patternId || !updates) {
      return NextResponse.json({ error: 'Missing patternId or updates' }, { status: 400 });
    }

    SuspiciousActivityDetector.updatePattern(patternId, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating security pattern:', error);
    return NextResponse.json(
      { error: 'Failed to update security pattern' },
      { status: 500 }
    );
  }
}
