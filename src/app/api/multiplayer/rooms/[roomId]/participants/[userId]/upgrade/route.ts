import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { prisma } from '../../../../../../lib/prisma';
import { RoomPermissionManager } from '../../../../../../lib/roomPermissions';
import { SpectatorPermissionManager } from '../../../../../../lib/spectatorPermissions';

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string; userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId } = params;
    const { newRole } = await request.json();

    // Validate new role
    if (!['PLAYER', 'SPECTATOR'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be PLAYER or SPECTATOR.' },
        { status: 400 }
      );
    }

    // Get room and participant information
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        hostUser: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const participant = room.participants.find(p => p.userId === userId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    const currentUser = room.participants.find(p => p.userId === session.user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'You are not a participant in this room' }, { status: 403 });
    }

    // Check permissions
    const isHost = room.hostUserId === session.user.id;
    const isSelfUpgrade = session.user.id === userId;

    if (newRole === 'PLAYER') {
      // Upgrade to player
      if (!isSelfUpgrade) {
        return NextResponse.json(
          { error: 'Only users can upgrade themselves to player' },
          { status: 403 }
        );
      }

      // Check if user can upgrade
      const spectatorContext = {
        userRole: participant.role as any,
        isPremium: participant.user.role === 'PREMIUM',
        roomStatus: room.status as any,
        isHost: false,
        isOnline: participant.isOnline
      };

      const upgradeCheck = SpectatorPermissionManager.canUpgradeToPlayer(spectatorContext);
      if (!upgradeCheck.canUpgrade) {
        return NextResponse.json(
          { error: upgradeCheck.reason || 'Cannot upgrade to player' },
          { status: 403 }
        );
      }
    } else if (newRole === 'SPECTATOR') {
      // Demote to spectator
      if (!isHost) {
        return NextResponse.json(
          { error: 'Only the host can demote participants to spectator' },
          { status: 403 }
        );
      }

      if (participant.userId === room.hostUserId) {
        return NextResponse.json(
          { error: 'Cannot demote the host to spectator' },
          { status: 403 }
        );
      }

      // Check if host can demote
      const demoteCheck = SpectatorPermissionManager.canDemoteToSpectator(
        {
          userRole: currentUser.role as any,
          isPremium: currentUser.user.role === 'PREMIUM',
          roomStatus: room.status as any,
          isHost: true,
          isOnline: currentUser.isOnline
        },
        participant.role as any
      );

      if (!demoteCheck.canDemote) {
        return NextResponse.json(
          { error: demoteCheck.reason || 'Cannot demote to spectator' },
          { status: 403 }
        );
      }
    }

    // Update participant role
    const updatedParticipant = await prisma.roomParticipant.update({
      where: {
        id: participant.id
      },
      data: {
        role: newRole
      },
      include: {
        user: true
      }
    });

    // Create system message
    const action = newRole === 'PLAYER' ? 'upgraded to player' : 'demoted to spectator';
    await prisma.roomMessage.create({
      data: {
        roomId,
        userId: session.user.id,
        userName: session.user.name || 'System',
        content: `${participant.user.name || participant.user.username} has been ${action}`,
        type: 'role_change',
        metadata: JSON.stringify({
          targetUserId: userId,
          targetUserName: participant.user.name || participant.user.username,
          oldRole: participant.role,
          newRole,
          action: newRole === 'PLAYER' ? 'upgrade' : 'demote'
        })
      }
    });

    return NextResponse.json({
      success: true,
      participant: {
        id: updatedParticipant.id,
        userId: updatedParticipant.userId,
        userName: updatedParticipant.user.name || updatedParticipant.user.username,
        role: updatedParticipant.role,
        isOnline: updatedParticipant.isOnline,
        lastSeen: updatedParticipant.lastSeen
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
