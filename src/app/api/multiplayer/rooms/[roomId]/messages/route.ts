import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { RoomPermissionManager, createPermissionContext } from "@/lib/roomPermissions";

// GET /api/multiplayer/rooms/[roomId]/messages - Get chat history
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
    const roomCode = resolvedParams.roomId; // roomId is actually roomCode

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

    // Get chat messages (last 100 messages)
    const messages = await prisma.roomMessage.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        userId: true,
        userName: true,
        content: true,
        type: true,
        metadata: true,
        createdAt: true,
        isDeleted: true,
        deletedBy: true,
        deletedAt: true
      }
    });

    // Get muted users
    const mutedUsers = await prisma.roomMutedUser.findMany({
      where: { 
        roomId: room.id,
        mutedUntil: { gt: new Date() }
      },
      select: {
        userId: true,
        userName: true,
        mutedUntil: true,
        mutedBy: true,
        reason: true
      }
    });

    return NextResponse.json({
      messages: messages.reverse(), // Reverse to show oldest first
      mutedUsers: mutedUsers.map(muted => ({
        ...muted,
        mutedUntil: muted.mutedUntil.toISOString()
      }))
    });

  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}

// POST /api/multiplayer/rooms/[roomId]/messages - Send a message
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
    const { content, type = 'text', metadata } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: "Message too long (max 500 characters)" }, { status: 400 });
    }

    // Verify room exists and user is a participant
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: {
        participants: {
          where: { userId: session.userId },
          select: { role: true, isOnline: true, displayName: true }
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

    // Check if user is muted
    const mutedUser = await prisma.roomMutedUser.findFirst({
      where: {
        roomId: room.id,
        userId: session.userId,
        mutedUntil: { gt: new Date() }
      }
    });

    if (mutedUser) {
      return NextResponse.json({ 
        error: "You are muted and cannot send messages" 
      }, { status: 403 });
    }

    // Check permissions for sending chat messages
    const permissionContext = createPermissionContext(
      participant.role,
      room.hostUserId === session.userId,
      participant.isOnline,
      room.status,
      room.isPrivate,
      !!room.password,
      false // TODO: Get premium status from user
    );

    const permissionCheck = RoomPermissionManager.validateAction('send_chat_message', permissionContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || "You cannot send chat messages" 
      }, { status: 403 });
    }

    // Rate limiting check (basic implementation)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const recentMessages = await prisma.roomMessage.count({
      where: {
        roomId: room.id,
        userId: session.userId,
        createdAt: { gte: oneMinuteAgo }
      }
    });

    if (recentMessages >= 10) {
      return NextResponse.json({ 
        error: "Rate limit exceeded. You can send 10 messages per minute." 
      }, { status: 429 });
    }

    // Create message
    const message = await prisma.roomMessage.create({
      data: {
        roomId: room.id,
        userId: session.userId,
        userName: participant.displayName || session.user?.name || 'Player',
        content: content.trim(),
        type: type as any,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'SEND_CHAT_MESSAGE',
        entityType: 'ROOM_MESSAGE',
        entityId: message.id,
        before: null,
        after: JSON.stringify({ content: message.content, type: message.type }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      id: message.id,
      userId: message.userId,
      userName: message.userName,
      content: message.content,
      type: message.type,
      metadata: message.metadata ? JSON.parse(message.metadata) : null,
      createdAt: message.createdAt.toISOString()
    });

  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
