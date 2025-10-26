import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    roomId: string;
    userId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId } = await params;
    const { reason, newRole = 'SPECTATOR' } = await request.json();

    // Validate new role
    const validRoles = ['PLAYER', 'SPECTATOR'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role for demotion' }, { status: 400 });
    }

    // Get the room and verify the requesting user is the host
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId !== session.user.id) {
      return NextResponse.json({ error: 'Only the host can demote users' }, { status: 403 });
    }

    // Get the participant
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            subscriptionStatus: true
          }
        }
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Check if not a moderator
    if (participant.role !== 'MODERATOR') {
      return NextResponse.json({ error: 'User is not a moderator' }, { status: 400 });
    }

    // Check if trying to demote host
    if (participant.userId === session.user.id) {
      return NextResponse.json({ error: 'Host cannot demote themselves' }, { status: 400 });
    }

    // Update the participant's role
    const updatedParticipant = await prisma.roomParticipant.update({
      where: { id: participant.id },
      data: {
        role: newRole,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            subscriptionStatus: true
          }
        }
      }
    });

    // Log the demotion
    await prisma.roomActivityLog.create({
      data: {
        roomId: roomId,
        userId: session.user.id,
        action: 'USER_DEMOTED',
        details: JSON.stringify({
          demotedUserId: userId,
          demotedUserName: participant.userName,
          oldRole: participant.role,
          newRole: newRole,
          reason: reason || 'No reason provided'
        }),
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      participant: {
        userId: updatedParticipant.userId,
        userName: updatedParticipant.userName,
        userEmail: updatedParticipant.userEmail,
        role: updatedParticipant.role,
        isOnline: updatedParticipant.isOnline,
        joinedAt: updatedParticipant.joinedAt,
        lastSeenAt: updatedParticipant.lastSeenAt,
        user: updatedParticipant.user
      }
    });
  } catch (error) {
    console.error('Error demoting participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
