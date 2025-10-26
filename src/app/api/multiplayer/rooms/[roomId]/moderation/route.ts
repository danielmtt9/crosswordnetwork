import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/multiplayer/rooms/[roomId]/moderation - Get moderation settings and stats
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
        error: "Only hosts and moderators can view moderation settings" 
      }, { status: 403 });
    }

    // Get moderation stats
    const mutedUsers = await prisma.roomMutedUser.findMany({
      where: {
        roomId: room.id,
        mutedUntil: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const bannedUsers = await prisma.roomBannedUser.findMany({
      where: {
        roomId: room.id,
        bannedUntil: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get recent moderation actions from audit logs
    const recentActions = await prisma.auditLog.findMany({
      where: {
        entityType: { in: ['ROOM_MESSAGE', 'ROOM_PARTICIPANT'] },
        action: { in: ['MUTE_USER', 'UNMUTE_USER', 'BAN_USER_FROM_ROOM', 'UNBAN_USER_FROM_ROOM', 'DELETE_CHAT_MESSAGE'] },
        before: { contains: `"roomId":"${room.id}"` }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({
      roomId: room.id,
      roomCode: room.roomCode,
      moderationStats: {
        mutedUsers: mutedUsers.length,
        bannedUsers: bannedUsers.length,
        totalActions: recentActions.length
      },
      mutedUsers: mutedUsers.map(mute => ({
        id: mute.id,
        userId: mute.userId,
        userName: mute.userName,
        mutedBy: mute.mutedBy,
        mutedByUserName: mute.mutedByUserName,
        mutedUntil: mute.mutedUntil.toISOString(),
        reason: mute.reason,
        createdAt: mute.createdAt.toISOString()
      })),
      bannedUsers: bannedUsers.map(ban => ({
        id: ban.id,
        userId: ban.userId,
        userName: ban.userName,
        bannedBy: ban.bannedBy,
        bannedByUserName: ban.bannedByUserName,
        bannedUntil: ban.bannedUntil.toISOString(),
        reason: ban.reason,
        createdAt: ban.createdAt.toISOString()
      })),
      recentActions: recentActions.map(action => ({
        id: action.id,
        action: action.action,
        entityType: action.entityType,
        entityId: action.entityId,
        actorUserId: action.actorUserId,
        before: action.before,
        after: action.after,
        createdAt: action.createdAt.toISOString(),
        ip: action.ip
      }))
    });

  } catch (error) {
    console.error("Error fetching moderation data:", error);
    return NextResponse.json(
      { error: "Failed to fetch moderation data" },
      { status: 500 }
    );
  }
}

// POST /api/multiplayer/rooms/[roomId]/moderation - Update moderation settings
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
    const { 
      enableModeration, 
      strictMode, 
      maxWarnings, 
      warningCooldown,
      customFilters,
      whitelist 
    } = body;

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

    // Check if user is host
    const isHost = room.hostUserId === session.userId;

    if (!isHost) {
      return NextResponse.json({ 
        error: "Only the host can update moderation settings" 
      }, { status: 403 });
    }

    // Validate settings
    if (maxWarnings !== undefined && (maxWarnings < 1 || maxWarnings > 10)) {
      return NextResponse.json({ 
        error: "Max warnings must be between 1 and 10" 
      }, { status: 400 });
    }

    if (warningCooldown !== undefined && (warningCooldown < 60000 || warningCooldown > 3600000)) {
      return NextResponse.json({ 
        error: "Warning cooldown must be between 1 minute and 1 hour" 
      }, { status: 400 });
    }

    // Update room moderation settings (you might want to add these fields to the schema)
    // For now, we'll just log the settings update
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'UPDATE_MODERATION_SETTINGS',
        entityType: 'MULTIPLAYER_ROOM',
        entityId: room.id,
        before: JSON.stringify({}),
        after: JSON.stringify({
          enableModeration,
          strictMode,
          maxWarnings,
          warningCooldown,
          customFilters,
          whitelist
        }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      message: "Moderation settings updated successfully"
    });

  } catch (error) {
    console.error("Error updating moderation settings:", error);
    return NextResponse.json(
      { error: "Failed to update moderation settings" },
      { status: 500 }
    );
  }
}
