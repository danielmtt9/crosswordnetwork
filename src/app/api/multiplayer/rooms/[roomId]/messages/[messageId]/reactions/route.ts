import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// POST /api/multiplayer/rooms/[roomId]/messages/[messageId]/reactions - Add reaction
export async function POST(
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
    const { emoji } = body;

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
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

    // Verify message exists and belongs to this room
    const message = await prisma.roomMessage.findFirst({
      where: {
        id: messageId,
        roomId: room.id
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Check if user already reacted with this emoji
    const existingReaction = await prisma.roomMessageReaction.findFirst({
      where: {
        messageId,
        emoji,
        userId: session.userId
      }
    });

    if (existingReaction) {
      return NextResponse.json({ error: "You have already reacted with this emoji" }, { status: 400 });
    }

    // Add reaction
    await prisma.roomMessageReaction.create({
      data: {
        messageId,
        emoji,
        userId: session.userId
      }
    });

    // Get updated message with reactions
    const updatedMessage = await prisma.roomMessage.findUnique({
      where: { id: messageId },
      include: {
        reactions: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!updatedMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Group reactions by emoji
    const groupedReactions = updatedMessage.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          users: [],
          count: 0
        };
      }
      acc[reaction.emoji].users.push(reaction.userId);
      acc[reaction.emoji].count++;
      return acc;
    }, {} as Record<string, { emoji: string; users: string[]; count: number }>);

    const reactions = Object.values(groupedReactions);

    return NextResponse.json({
      id: updatedMessage.id,
      reactions
    });

  } catch (error) {
    console.error("Error adding reaction:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 }
    );
  }
}

// DELETE /api/multiplayer/rooms/[roomId]/messages/[messageId]/reactions - Remove reaction
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

    const body = await request.json();
    const { emoji } = body;

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json({ error: "Emoji is required" }, { status: 400 });
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

    // Verify message exists and belongs to this room
    const message = await prisma.roomMessage.findFirst({
      where: {
        id: messageId,
        roomId: room.id
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Remove reaction
    const deletedReaction = await prisma.roomMessageReaction.deleteMany({
      where: {
        messageId,
        emoji,
        userId: session.userId
      }
    });

    if (deletedReaction.count === 0) {
      return NextResponse.json({ error: "Reaction not found" }, { status: 404 });
    }

    // Get updated message with reactions
    const updatedMessage = await prisma.roomMessage.findUnique({
      where: { id: messageId },
      include: {
        reactions: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!updatedMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Group reactions by emoji
    const groupedReactions = updatedMessage.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = {
          emoji: reaction.emoji,
          users: [],
          count: 0
        };
      }
      acc[reaction.emoji].users.push(reaction.userId);
      acc[reaction.emoji].count++;
      return acc;
    }, {} as Record<string, { emoji: string; users: string[]; count: number }>);

    const reactions = Object.values(groupedReactions);

    return NextResponse.json({
      id: updatedMessage.id,
      reactions
    });

  } catch (error) {
    console.error("Error removing reaction:", error);
    return NextResponse.json(
      { error: "Failed to remove reaction" },
      { status: 500 }
    );
  }
}
