import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from "@/lib/auth";
import { isSuperAdmin } from '@/lib/superAdmin';
import { AdminProvisioningManager } from '@/lib/adminProvisioning';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isSuperAdmin(session.user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requests = await AdminProvisioningManager.getPendingAdminRequests();

    return NextResponse.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching admin requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestedFor, expiresInDays } = body;

    if (!requestedFor || !requestedFor.email || !requestedFor.name || !requestedFor.role || !requestedFor.justification) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user can request admin access
    const canRequest = await AdminProvisioningManager.canRequestAdminAccess(session.user.id);
    if (!canRequest) {
      return NextResponse.json({ error: 'Cannot request admin access at this time' }, { status: 400 });
    }

    const adminRequest = await AdminProvisioningManager.requestAdminAccount(
      session.user.id,
      requestedFor,
      expiresInDays || 7
    );

    return NextResponse.json({
      success: true,
      request: adminRequest
    });
  } catch (error) {
    console.error('Error creating admin request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create admin request' },
      { status: 500 }
    );
  }
}
