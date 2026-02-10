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
    const { userId, token } = body;

    if (!userId || !token) {
      return NextResponse.json({ error: 'User ID and token are required' }, { status: 400 });
    }

    // Validate token format
    if (!TwoFactorAuthManager.validateTokenFormat(token)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const isValid = await TwoFactorAuthManager.verifyTwoFactorSetup(userId, token);

    // Log the 2FA verification attempt
    await TwoFactorAuthManager.logTwoFactorEvent(
      session.user.id,
      'SETUP_VERIFIED',
      isValid,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      { targetUserId: userId }
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
