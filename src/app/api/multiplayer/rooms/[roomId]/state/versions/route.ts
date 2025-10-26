import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { roomPersistenceManager } from "@/lib/roomPersistence";
import { RoomPermissionManager, createPermissionContext } from "@/lib/roomPermissions";

// GET /api/multiplayer/rooms/[roomId]/state/versions - Get available state versions
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

    // Only hosts can view state versions
    if (room.hostUserId !== session.userId) {
      return NextResponse.json({ 
        error: "Only the host can view state versions" 
      }, { status: 403 });
    }

    // Get available state versions
    const versions = await roomPersistenceManager.getStateVersions(room.id);

    return NextResponse.json({
      versions: versions.map(v => ({
        version: v.version,
        createdAt: v.createdAt.toISOString(),
        checksum: v.checksum
      }))
    });

  } catch (error) {
    console.error("Error fetching state versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch state versions" },
      { status: 500 }
    );
  }
}
