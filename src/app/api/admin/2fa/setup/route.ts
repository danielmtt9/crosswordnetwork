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

    // Check if user is admin
    const { prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true, twoFactorEnabled: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: '2FA is only available for admin users' }, { status: 403 });
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: '2FA is already enabled for this user' }, { status: 400 });
    }

    const setup = await TwoFactorAuthManager.setupTwoFactor(userId, user.email || '');

    // Log the 2FA setup initiation
    await TwoFactorAuthManager.logTwoFactorEvent(
      session.user.id,
      'SETUP_INITIATED',
      true,
      request.headers.get('x-forwarded-for') || 'unknown',
      request.headers.get('user-agent') || 'unknown',
      { targetUserId: userId }
    );

    return NextResponse.json({
      success: true,
      setup: {
        qrCodeUrl: setup.qrCodeUrl,
        backupCodes: setup.backupCodes
      }
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    );
  }
}
