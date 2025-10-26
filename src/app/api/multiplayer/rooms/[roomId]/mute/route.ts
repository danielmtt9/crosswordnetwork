import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// POST /api/multiplayer/rooms/[roomId]/mute - Mute user
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
    const roomCode = resolvedParams.roomId;

    const body = await request.json();
    const { userId, duration, reason } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (!duration || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json({ error: "Valid duration is required" }, { status: 400 });
    }

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
        error: "Only hosts and moderators can mute users" 
      }, { status: 403 });
    }

    // Check if target user is a participant
    const targetParticipant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: userId
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    if (!targetParticipant) {
      return NextResponse.json({ error: "User is not a participant in this room" }, { status: 404 });
    }

    // Check if target user is the host
    if (room.hostUserId === userId) {
      return NextResponse.json({ error: "Cannot mute the room host" }, { status: 400 });
    }

    // Check if target user is already muted
    const existingMute = await prisma.roomMutedUser.findFirst({
      where: {
        roomId: room.id,
        userId: userId,
        mutedUntil: { gt: new Date() }
      }
    });

    if (existingMute) {
      return NextResponse.json({ error: "User is already muted" }, { status: 400 });
    }

    // Calculate mute duration
    const mutedUntil = new Date(Date.now() + duration);

    // Create mute record
    const mutedUser = await prisma.roomMutedUser.create({
      data: {
        roomId: room.id,
        userId: userId,
        userName: targetParticipant.user.name || 'User',
        mutedBy: session.userId,
        mutedUntil: mutedUntil,
        reason: reason || 'No reason provided'
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'MUTE_USER',
        entityType: 'ROOM_MUTED_USER',
        entityId: mutedUser.id,
        before: null,
        after: JSON.stringify({ 
          userId: userId, 
          duration: duration, 
          reason: reason,
          mutedUntil: mutedUntil.toISOString()
        }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      id: mutedUser.id,
      userId: mutedUser.userId,
      userName: mutedUser.userName,
      mutedBy: mutedUser.mutedBy,
      mutedUntil: mutedUser.mutedUntil.toISOString(),
      reason: mutedUser.reason
    });

  } catch (error) {
    console.error("Error muting user:", error);
    return NextResponse.json(
      { error: "Failed to mute user" },
      { status: 500 }
    );
  }
}