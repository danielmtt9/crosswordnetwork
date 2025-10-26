import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await params;

    // Check if user has access to room
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: session.user.id
      }
    });

    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true }
    });

    if (!participant && room?.hostUserId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Count collaborators (HOST and PLAYER roles)
    const collaboratorCount = await prisma.roomParticipant.count({
      where: {
        roomId: roomId,
        role: {
          in: ['HOST', 'PLAYER']
        }
      }
    });

    return NextResponse.json({
      count: collaboratorCount
    });

  } catch (error) {
    console.error('Error fetching collaborator count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
