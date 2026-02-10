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
    const { requestId, temporaryPassword } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const result = await AdminProvisioningManager.provisionAdminAccount(
      requestId,
      session.user.id,
      temporaryPassword
    );

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
        role: result.user.role
      },
      provisioning: result.provisioning
    });
  } catch (error) {
    console.error('Error provisioning admin account:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to provision admin account' },
      { status: 500 }
    );
  }
}
