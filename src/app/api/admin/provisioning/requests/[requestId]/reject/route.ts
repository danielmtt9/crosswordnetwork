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
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const rejectedRequest = await AdminProvisioningManager.rejectAdminRequest(
      requestId,
      session.user.id,
      reason
    );

    return NextResponse.json({
      success: true,
      request: rejectedRequest
    });
  } catch (error) {
    console.error('Error rejecting admin request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject admin request' },
      { status: 500 }
    );
  }
}
