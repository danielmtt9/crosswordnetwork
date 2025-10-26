import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// DELETE /api/multiplayer/rooms/[roomId]/mute/[userId] - Unmute user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { roomId: roomCode, userId } = resolvedParams;

    // Verify room exists and user is a participant
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

    const participant = room.participants[0];
    if (!participant) {
      return NextResponse.json({ error: "You are not a participant in this room" }, { status: 403 });
    }

    // Check if user is host or moderator
    const isHost = room.hostUserId === session.userId;
    const isModerator = participant.role === 'HOST' || participant.role === 'MODERATOR';

    if (!isHost && !isModerator) {
      return NextResponse.json({ 
        error: "Only hosts and moderators can unmute users" 
      }, { status: 403 });
    }

    // Find the mute record
    const mutedUser = await prisma.roomMutedUser.findFirst({
      where: {
        roomId: room.id,
        userId: userId,
        mutedUntil: { gt: new Date() }
      }
    });

    if (!mutedUser) {
      return NextResponse.json({ error: "User is not currently muted" }, { status: 404 });
    }

    // Remove mute record
    await prisma.roomMutedUser.delete({
      where: { id: mutedUser.id }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'UNMUTE_USER',
        entityType: 'ROOM_MUTED_USER',
        entityId: mutedUser.id,
        before: JSON.stringify({ 
          userId: userId, 
          mutedUntil: mutedUser.mutedUntil.toISOString(),
          reason: mutedUser.reason
        }),
        after: null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: "User has been unmuted"
    });

  } catch (error) {
    console.error("Error unmuting user:", error);
    return NextResponse.json(
      { error: "Failed to unmute user" },
      { status: 500 }
    );
  }
}