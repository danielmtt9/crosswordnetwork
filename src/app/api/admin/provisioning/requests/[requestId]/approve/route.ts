import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { AdminProvisioningManager } from '@/lib/adminProvisioning';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { requestId } = params;
    const body = await request.json();
    const { accessLevel, permissions, expiresAt } = body;

    const approvedRequest = await AdminProvisioningManager.approveAdminRequest(
      requestId,
      session.user.id,
      accessLevel,
      permissions,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      success: true,
      request: approvedRequest
    });
  } catch (error) {
    console.error('Error approving admin request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve admin request' },
      { status: 500 }
    );
  }
}
