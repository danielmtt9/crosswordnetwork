import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// PATCH /api/multiplayer/rooms/[roomId]/messages/[messageId] - Edit message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { roomId: roomCode, messageId } = resolvedParams;

    const body = await request.json();
    const { content } = body;

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

    // Find the message
    const message = await prisma.roomMessage.findFirst({
      where: {
        id: messageId,
        roomId: room.id
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user owns the message
    if (message.userId !== session.userId) {
      return NextResponse.json({ error: "You can only edit your own messages" }, { status: 403 });
    }

    // Check if message is within 5 minutes
    const messageTime = new Date(message.createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

    if (now - messageTime > fiveMinutes) {
      return NextResponse.json({ 
        error: "Message can only be edited within 5 minutes of creation" 
      }, { status: 400 });
    }

    // Check if message is deleted
    if (message.isDeleted) {
      return NextResponse.json({ error: "Cannot edit deleted message" }, { status: 400 });
    }

    // Update message
    const updatedMessage = await prisma.roomMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        editedAt: new Date(),
        isEdited: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'EDIT_CHAT_MESSAGE',
        entityType: 'ROOM_MESSAGE',
        entityId: message.id,
        before: JSON.stringify({ content: message.content }),
        after: JSON.stringify({ content: updatedMessage.content }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      id: updatedMessage.id,
      userId: updatedMessage.userId,
      userName: updatedMessage.userName,
      content: updatedMessage.content,
      type: updatedMessage.type,
      metadata: updatedMessage.metadata ? JSON.parse(updatedMessage.metadata) : null,
      createdAt: updatedMessage.createdAt.toISOString(),
      editedAt: updatedMessage.editedAt?.toISOString(),
      isEdited: updatedMessage.isEdited
    });

  } catch (error) {
    console.error("Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}

// DELETE /api/multiplayer/rooms/[roomId]/messages/[messageId] - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { roomId: roomCode, messageId } = resolvedParams;

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

    // Find the message
    const message = await prisma.roomMessage.findFirst({
      where: {
        id: messageId,
        roomId: room.id
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check permissions for deleting messages
    const isHost = room.hostUserId === session.userId;
    const isOwner = message.userId === session.userId;
    const isModerator = participant.role === 'HOST' || participant.role === 'MODERATOR';

    if (!isOwner && !isHost && !isModerator) {
      return NextResponse.json({ 
        error: "You can only delete your own messages or be a host/moderator" 
      }, { status: 403 });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return NextResponse.json({ error: "Message is already deleted" }, { status: 400 });
    }

    // Soft delete message
    const deletedMessage = await prisma.roomMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: session.userId,
        deletedAt: new Date()
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'DELETE_CHAT_MESSAGE',
        entityType: 'ROOM_MESSAGE',
        entityId: message.id,
        before: JSON.stringify({ content: message.content, type: message.type }),
        after: null,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      id: deletedMessage.id,
      isDeleted: deletedMessage.isDeleted,
      deletedBy: deletedMessage.deletedBy,
      deletedAt: deletedMessage.deletedAt?.toISOString()
    });

  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}