import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { RoomPermissionManager, createPermissionContext } from "@/lib/roomPermissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const roomCode = resolvedParams.roomId; // roomId is actually roomCode

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID is required" }, { status: 400 });
    }

    // Verify room exists and get participant info
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: { 
        participants: {
          where: { userId: session.userId },
          select: { role: true, isOnline: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const actorParticipant = room.participants[0];
    if (!actorParticipant) {
      return NextResponse.json({ error: "You are not a participant in this room" }, { status: 403 });
    }

    // Check permissions using the permission system
    const permissionContext = createPermissionContext(
      actorParticipant.role,
      room.hostUserId === session.userId,
      actorParticipant.isOnline,
      room.status,
      room.isPrivate,
      !!room.password,
      false // TODO: Get premium status from user
    );

    const permissionCheck = RoomPermissionManager.validateAction('kick_player', permissionContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || "You don't have permission to kick players" 
      }, { status: 403 });
    }

    // Find the participant to kick
    const participant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: targetUserId
      }
    });

    if (!participant) {
      return NextResponse.json({ 
        error: "User is not in this room" 
      }, { status: 404 });
    }

    if (participant.userId === session.userId) {
      return NextResponse.json({ 
        error: "Cannot kick yourself" 
      }, { status: 400 });
    }

    // Remove participant from room
    await prisma.roomParticipant.delete({
      where: { id: participant.id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'KICK_PLAYER',
        entityType: 'ROOM',
        entityId: room.id,
        before: JSON.stringify({ participantId: participant.id, userId: targetUserId }),
        after: null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    // Create notification for kicked user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'ROOM_KICKED',
        title: 'Removed from Room',
        message: `You have been removed from room "${room.name || roomCode}"`,
        actionUrl: '/multiplayer',
        metadata: JSON.stringify({
          roomId: room.id,
          roomCode: room.roomCode,
          roomName: room.name,
          kickedBy: session.user?.name || 'Host'
        })
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Player kicked successfully" 
    });

  } catch (error) {
    console.error("Error kicking player:", error);
    return NextResponse.json(
      { error: "Failed to kick player" },
      { status: 500 }
    );
  }
}
