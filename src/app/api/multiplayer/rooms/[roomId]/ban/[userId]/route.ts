import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// DELETE /api/multiplayer/rooms/[roomId]/ban/[userId] - Unban user from room
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
        error: "Only hosts and moderators can unban users" 
      }, { status: 403 });
    }

    // Find active ban
    const activeBan = await prisma.roomBannedUser.findFirst({
      where: {
        roomId: room.id,
        userId: userId,
        bannedUntil: { gt: new Date() }
      }
    });

    if (!activeBan) {
      return NextResponse.json({ error: "User is not currently banned from this room" }, { status: 404 });
    }

    // Update ban to expire immediately
    await prisma.roomBannedUser.update({
      where: { id: activeBan.id },
      data: {
        bannedUntil: new Date() // Set to current time to expire immediately
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'UNBAN_USER_FROM_ROOM',
        entityType: 'ROOM_PARTICIPANT',
        entityId: userId,
        before: JSON.stringify({ 
          roomId: room.id, 
          roomCode: room.roomCode,
          bannedUntil: activeBan.bannedUntil.toISOString(),
          reason: activeBan.reason
        }),
        after: JSON.stringify({ 
          unbannedAt: new Date().toISOString()
        }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: "User has been unbanned from the room"
    });

  } catch (error) {
    console.error("Error unbanning user from room:", error);
    return NextResponse.json(
      { error: "Failed to unban user from room" },
      { status: 500 }
    );
  }
}
