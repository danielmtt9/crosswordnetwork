import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { AdminProvisioningManager } from '@/lib/adminProvisioning';

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
    const { userId, reason, dataRetention } = body;

    if (!userId || !reason) {
      return NextResponse.json({ error: 'User ID and reason are required' }, { status: 400 });
    }

    // Prevent self-deprovisioning
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot deprovision your own account' }, { status: 400 });
    }

    const deprovisioning = await AdminProvisioningManager.deprovisionAdminAccount(
      userId,
      session.user.id,
      reason,
      dataRetention || 'ANONYMIZE'
    );

    return NextResponse.json({
      success: true,
      deprovisioning
    });
  } catch (error) {
    console.error('Error deprovisioning admin account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deprovision admin account' },
      { status: 500 }
    );
  }
}
