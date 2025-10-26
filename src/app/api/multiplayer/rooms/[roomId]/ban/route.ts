import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// POST /api/multiplayer/rooms/[roomId]/ban - Ban user from room
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
        error: "Only hosts and moderators can ban users" 
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
      return NextResponse.json({ error: "Cannot ban the room host" }, { status: 400 });
    }

    // Check if target user is already banned
    const existingBan = await prisma.roomBannedUser.findFirst({
      where: {
        roomId: room.id,
        userId: userId,
        bannedUntil: { gt: new Date() }
      }
    });

    if (existingBan) {
      return NextResponse.json({ error: "User is already banned from this room" }, { status: 400 });
    }

    // Calculate ban duration
    const bannedUntil = new Date(Date.now() + duration);

    // Create ban record
    const bannedUser = await prisma.roomBannedUser.create({
      data: {
        roomId: room.id,
        userId: userId,
        userName: targetParticipant.user.name || 'User',
        bannedBy: session.userId,
        bannedByUserName: session.user?.name || 'Moderator',
        bannedUntil: bannedUntil,
        reason: reason || 'No reason provided'
      }
    });

    // Remove user from room if they're currently in it
    await prisma.roomParticipant.deleteMany({
      where: {
        roomId: room.id,
        userId: userId
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'BAN_USER_FROM_ROOM',
        entityType: 'ROOM_PARTICIPANT',
        entityId: userId,
        before: JSON.stringify({ 
          roomId: room.id, 
          roomCode: room.roomCode,
          participantRole: targetParticipant.role 
        }),
        after: JSON.stringify({ 
          bannedUntil: bannedUntil.toISOString(),
          reason: reason || 'No reason provided'
        }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      bannedUser: {
        id: bannedUser.id,
        userId: bannedUser.userId,
        userName: bannedUser.userName,
        bannedBy: bannedUser.bannedBy,
        bannedByUserName: bannedUser.bannedByUserName,
        bannedUntil: bannedUser.bannedUntil.toISOString(),
        reason: bannedUser.reason
      }
    });

  } catch (error) {
    console.error("Error banning user from room:", error);
    return NextResponse.json(
      { error: "Failed to ban user from room" },
      { status: 500 }
    );
  }
}

// GET /api/multiplayer/rooms/[roomId]/ban - Get banned users for room
export async function GET(
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
        error: "Only hosts and moderators can view banned users" 
      }, { status: 403 });
    }

    // Get active bans
    const bannedUsers = await prisma.roomBannedUser.findMany({
      where: {
        roomId: room.id,
        bannedUntil: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      bannedUsers: bannedUsers.map(ban => ({
        id: ban.id,
        userId: ban.userId,
        userName: ban.userName,
        bannedBy: ban.bannedBy,
        bannedByUserName: ban.bannedByUserName,
        bannedUntil: ban.bannedUntil.toISOString(),
        reason: ban.reason,
        createdAt: ban.createdAt.toISOString()
      }))
    });

  } catch (error) {
    console.error("Error fetching banned users:", error);
    return NextResponse.json(
      { error: "Failed to fetch banned users" },
      { status: 500 }
    );
  }
}
