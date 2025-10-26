import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;

    // Users can only view their own role info, or admins can view any
    if (session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user with subscription information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine premium status
    const isPremium = user.role === 'PREMIUM' || 
                     user.subscriptionStatus === 'ACTIVE' ||
                     (user.subscriptionStatus === 'TRIAL' && 
                      user.trialEndsAt && 
                      new Date() < user.trialEndsAt);

    // Determine capabilities
    const canHost = isPremium;
    const canCollaborate = isPremium;
    const canSpectate = true; // Everyone can spectate

    return NextResponse.json({
      userId: user.id,
      isPremium,
      subscriptionStatus: user.subscriptionStatus || 'EXPIRED',
      trialEndsAt: user.trialEndsAt,
      role: user.role || 'USER',
      canHost,
      canCollaborate,
      canSpectate,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    });

  } catch (error) {
    console.error('Error fetching user role info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
