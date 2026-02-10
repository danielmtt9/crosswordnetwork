import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/superAdmin';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        isAdmin: false, 
        isSuperAdmin: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Check if user is super admin
    const isSuper = await isSuperAdmin(session.user.id);
    
    // Check if user is admin (role check)
    const isAdmin = session.user.role === 'ADMIN' || isSuper;

    return NextResponse.json({
      isAdmin,
      isSuperAdmin: isSuper,
      userId: session.user.id,
      userRole: session.user.role,
      userEmail: session.user.email
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ 
      isAdmin: false, 
      isSuperAdmin: false,
      error: 'Failed to check admin status' 
    }, { status: 500 });
  }
}
