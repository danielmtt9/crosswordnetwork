import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      gridState, 
      timestamp,
      participantState 
    } = body;

    // Validate required fields
    if (!gridState) {
      return NextResponse.json(
        { error: "Grid state is required" },
        { status: 400 }
      );
    }

    // Verify room exists and user is a participant
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { userId: userId },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    if (room.participants.length === 0) {
      return NextResponse.json(
        { error: "User is not a participant in this room" },
        { status: 403 }
      );
    }

    const now = new Date();

    // Check for conflicts with room's lastSyncedAt
    if (room.lastSyncedAt && timestamp) {
      const clientTimestamp = new Date(timestamp);
      if (room.lastSyncedAt > clientTimestamp) {
        return NextResponse.json(
          { 
            error: "Conflict detected",
            serverTimestamp: room.lastSyncedAt,
            clientTimestamp: clientTimestamp,
          },
          { status: 409 }
        );
      }
    }

    // Update room state with transaction to ensure consistency
    const [updatedRoom, updatedParticipant] = await prisma.$transaction([
      // Update room grid state
      prisma.multiplayerRoom.update({
        where: { id: roomId },
        data: {
          gridState: JSON.stringify(gridState),
          lastSyncedAt: now,
          lastActivityAt: now,
        },
        select: {
          id: true,
          lastSyncedAt: true,
          roomCode: true,
        },
      }),
      // Update participant's individual progress
      prisma.roomParticipant.update({
        where: {
          roomId_userId: {
            roomId: roomId,
            userId: userId,
          },
        },
        data: {
          completedCells: participantState?.completedCells || null,
          lastActiveAt: now,
        },
        select: {
          userId: true,
          completedCells: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      saved: true,
      timestamp: updatedRoom.lastSyncedAt,
      roomCode: updatedRoom.roomCode,
    });
  } catch (error) {
    console.error("Error auto-saving multiplayer room:", error);
    return NextResponse.json(
      { 
        error: "Failed to save room state",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Get room auto-save config
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    // Verify room exists and user is a participant
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { userId: userId },
        },
      },
      select: {
        id: true,
        autoSaveEnabled: true,
        saveInterval: true,
        lastSyncedAt: true,
        participants: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    if (room.participants.length === 0) {
      return NextResponse.json(
        { error: "User is not a participant in this room" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      autoSaveEnabled: room.autoSaveEnabled,
      saveInterval: room.saveInterval,
      lastSyncedAt: room.lastSyncedAt,
    });
  } catch (error) {
    console.error("Error fetching room auto-save config:", error);
    return NextResponse.json(
      { error: "Failed to fetch auto-save config" },
      { status: 500 }
    );
  }
}

// Update room auto-save config (host only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    // Verify room exists and user is the host
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: {
        hostUserId: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    if (room.hostUserId !== userId) {
      return NextResponse.json(
        { error: "Only the host can modify auto-save settings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { autoSaveEnabled, saveInterval } = body;

    // Validate saveInterval if provided
    if (saveInterval !== undefined && (saveInterval < 5000 || saveInterval > 300000)) {
      return NextResponse.json(
        { error: "Save interval must be between 5000 and 300000 ms" },
        { status: 400 }
      );
    }

    const updatedRoom = await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        ...(autoSaveEnabled !== undefined && { autoSaveEnabled }),
        ...(saveInterval !== undefined && { saveInterval }),
      },
      select: {
        autoSaveEnabled: true,
        saveInterval: true,
      },
    });

    return NextResponse.json({
      success: true,
      config: updatedRoom,
    });
  } catch (error) {
    console.error("Error updating room auto-save config:", error);
    return NextResponse.json(
      { error: "Failed to update auto-save config" },
      { status: 500 }
    );
  }
}
