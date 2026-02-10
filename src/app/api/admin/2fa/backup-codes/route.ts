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
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const backupCodes = await TwoFactorAuthManager.regenerateBackupCodes(userId);

    // Log the backup codes regeneration
    await TwoFactorAuthManager.logTwoFactorEvent(
      session.user.id,
      'BACKUP_CODES_REGENERATED',
      true,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      { targetUserId: userId }
    );

    return NextResponse.json({
      success: true,
      backupCodes
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}
