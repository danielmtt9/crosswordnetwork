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

    // Get room with role settings
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hostUserId: true,
        maxCollaborators: true,
        allowSpectators: true,
        requirePremiumToHost: true,
        allowRoleChanges: true,
        defaultRole: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if user has access to room
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: session.user.id
      }
    });

    if (!participant && room.hostUserId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      maxCollaborators: room.maxCollaborators || 5,
      allowSpectators: room.allowSpectators ?? true,
      requirePremiumToHost: room.requirePremiumToHost ?? true,
      allowRoleChanges: room.allowRoleChanges ?? true,
      defaultRole: room.defaultRole || 'SPECTATOR'
    });

  } catch (error) {
    console.error('Error fetching room role settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await params;
    const body = await request.json();

    // Get room and check if user is host
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        hostUserId: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (room.hostUserId !== session.user.id) {
      return NextResponse.json({ error: 'Only room host can modify settings' }, { status: 403 });
    }

    // Validate settings
    const {
      maxCollaborators,
      allowSpectators,
      requirePremiumToHost,
      allowRoleChanges,
      defaultRole
    } = body;

    if (maxCollaborators !== undefined && (maxCollaborators < 2 || maxCollaborators > 10)) {
      return NextResponse.json(
        { error: 'Max collaborators must be between 2 and 10' },
        { status: 400 }
      );
    }

    if (defaultRole && !['HOST', 'PLAYER', 'SPECTATOR', 'MODERATOR'].includes(defaultRole)) {
      return NextResponse.json(
        { error: 'Invalid default role' },
        { status: 400 }
      );
    }

    // Update room settings
    const updatedRoom = await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        maxCollaborators: maxCollaborators,
        allowSpectators: allowSpectators,
        requirePremiumToHost: requirePremiumToHost,
        allowRoleChanges: allowRoleChanges,
        defaultRole: defaultRole
      }
    });

    return NextResponse.json({
      maxCollaborators: updatedRoom.maxCollaborators,
      allowSpectators: updatedRoom.allowSpectators,
      requirePremiumToHost: updatedRoom.requirePremiumToHost,
      allowRoleChanges: updatedRoom.allowRoleChanges,
      defaultRole: updatedRoom.defaultRole
    });

  } catch (error) {
    console.error('Error updating room role settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
