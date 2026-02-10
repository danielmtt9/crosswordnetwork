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

    const statistics = await AdminProvisioningManager.getAdminAccountStatistics();

    return NextResponse.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error fetching admin provisioning statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin provisioning statistics' },
      { status: 500 }
    );
  }
}
