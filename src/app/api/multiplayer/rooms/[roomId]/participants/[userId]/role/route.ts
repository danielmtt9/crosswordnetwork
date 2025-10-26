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

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId } = await params;

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
      return NextResponse.json({ error: 'Only the host can manage roles' }, { status: 403 });
    }

    // Get the participant's current role
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

    return NextResponse.json({
      participant: {
        userId: participant.userId,
        userName: participant.userName,
        userEmail: participant.userEmail,
        role: participant.role,
        isOnline: participant.isOnline,
        joinedAt: participant.joinedAt,
        lastSeenAt: participant.lastSeenAt,
        user: participant.user
      }
    });
  } catch (error) {
    console.error('Error fetching participant role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId } = await params;
    const { role, reason } = await request.json();

    // Validate role
    const validRoles = ['HOST', 'MODERATOR', 'PLAYER', 'SPECTATOR'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only the host can change roles' }, { status: 403 });
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

    // Prevent host from changing their own role
    if (participant.userId === session.user.id) {
      return NextResponse.json({ error: 'Host cannot change their own role' }, { status: 400 });
    }

    // Check if trying to assign HOST role
    if (role === 'HOST') {
      return NextResponse.json({ error: 'Cannot assign HOST role directly' }, { status: 400 });
    }

    // Update the participant's role
    const updatedParticipant = await prisma.roomParticipant.update({
      where: { id: participant.id },
      data: {
        role: role,
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

    // Log the role change
    await prisma.roomActivityLog.create({
      data: {
        roomId: roomId,
        userId: session.user.id,
        action: 'ROLE_CHANGED',
        details: JSON.stringify({
          targetUserId: userId,
          oldRole: participant.role,
          newRole: role,
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
    console.error('Error updating participant role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId } = await params;

    // Get the room and verify the requesting user is the host
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostId !== session.user.id) {
      return NextResponse.json({ error: 'Only the host can remove participants' }, { status: 403 });
    }

    // Get the participant
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: userId
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Prevent host from removing themselves
    if (participant.userId === session.user.id) {
      return NextResponse.json({ error: 'Host cannot remove themselves' }, { status: 400 });
    }

    // Remove the participant
    await prisma.roomParticipant.delete({
      where: { id: participant.id }
    });

    // Log the removal
    await prisma.roomActivityLog.create({
      data: {
        roomId: roomId,
        userId: session.user.id,
        action: 'PARTICIPANT_REMOVED',
        details: JSON.stringify({
          removedUserId: userId,
          removedUserName: participant.userName
        }),
        timestamp: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Error removing participant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}