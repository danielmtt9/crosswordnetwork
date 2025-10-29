import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    // Session is optional for viewing a room; required only for private rooms
    const session = await getServerSession(authOptions);

    const resolvedParams = await params;
    const roomCode = resolvedParams.roomId; // roomId is actually roomCode

    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: {
        hostUser: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        participants: {
          select: {
            id: true,
            userId: true,
            role: true,
            displayName: true,
            avatarUrl: true,
            cursorPosition: true,
            isOnline: true,
            joinedAt: true,
            leftAt: true
          }
        },
        puzzle: {
          select: {
            id: true,
            title: true,
            difficulty: true,
            description: true,
            file_path: true,
            tags: true
          }
        }
      }
    });

    // If room is private, only allow host or participants (require session)
    if (room?.isPrivate) {
      const isHost = session?.userId && room.hostUserId === session.userId;
      const isParticipant = session?.userId
        ? room.participants.some(p => p.userId === session.userId)
        : false;
      if (!(isHost || isParticipant)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // Check if room is expired
    if (room.expiresAt && new Date() > room.expiresAt) {
      await prisma.multiplayerRoom.update({
        where: { roomCode },
        data: { status: 'EXPIRED' }
      });
      
      return NextResponse.json(
        { error: "Room has expired" },
        { status: 410 }
      );
    }

    // Transform the data to match expected format
    const transformedRoom = {
      id: room.id,
      roomCode: room.roomCode,
      name: room.name,
      puzzleId: room.puzzleId,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      status: room.status,
      gridState: room.gridState,
      createdAt: room.createdAt,
      startedAt: room.startedAt,
      completedAt: room.completedAt,
      expiresAt: room.expiresAt,
      puzzle: room.puzzle,
      participants: room.participants.map(p => ({
        id: p.id,
        userId: p.userId,
        roomId: room.id,
        role: p.role,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        cursorPosition: p.cursorPosition,
        isOnline: p.isOnline,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt
      })),
      hostUserId: room.hostUserId,
      hostUser: room.hostUser
    };

    return NextResponse.json(transformedRoom);
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Failed to fetch room" },
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
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const roomCode = resolvedParams.roomId; // roomId is actually roomCode
    const body = await request.json();
    const { action, puzzleId, maxPlayers, isPrivate, roomName } = body;

    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: { participants: true }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostUserId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    switch (action) {
      case 'join':
        // Check if user is already a participant
        const existingParticipant = await prisma.roomParticipant.findUnique({
          where: {
            roomId_userId: {
              roomId: room.id,
              userId: session.userId
            }
          }
        });

        if (!existingParticipant) {
          await prisma.roomParticipant.create({
            data: {
              roomId: room.id,
              userId: session.userId,
              displayName: session.user?.name || "Player",
              avatarUrl: session.user?.image || null,
              role: 'PLAYER'
            }
          });
        }
        break;
      
      case 'leave':
        await prisma.roomParticipant.updateMany({
          where: {
            roomId: room.id,
            userId: session.userId
          },
          data: {
            isOnline: false,
            leftAt: new Date()
          }
        });
        break;
      
      case 'update':
        await prisma.multiplayerRoom.update({
          where: { roomCode },
          data: {
            ...(puzzleId && { puzzleId }),
            ...(maxPlayers && { maxPlayers }),
            ...(isPrivate !== undefined && { isPrivate }),
            ...(roomName && { name: roomName })
          }
        });
        break;
      
      case 'start':
        await prisma.multiplayerRoom.update({
          where: { roomCode },
          data: { 
            status: 'ACTIVE', 
            startedAt: new Date() 
          }
        });
        break;
      
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Failed to update room" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostUserId !== session.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Mark room as expired instead of deleting to preserve data
    await prisma.multiplayerRoom.update({
      where: { roomCode },
      data: { 
        status: 'EXPIRED',
        completedAt: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
