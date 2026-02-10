import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { TwoFactorAuthManager } from '@/lib/twoFactorAuth';

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
    const { userId, password } = body;

    if (!userId || !password) {
      return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
    }

    const success = await TwoFactorAuthManager.disableTwoFactor(userId, password);

    // Log the 2FA disable action
    await TwoFactorAuthManager.logTwoFactorEvent(
      session.user.id,
      'DISABLED',
      success,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      { targetUserId: userId }
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    );
  }
}
