import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; requestId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const roomCode = resolvedParams.roomId;
    const requestId = resolvedParams.requestId;

    const body = await request.json();
    const { action } = body;

    // Verify room exists and user is host
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: { participants: true }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostUserId !== session.userId) {
      return NextResponse.json({ 
        error: "Only the host can approve/reject requests" 
      }, { status: 403 });
    }

    const joinRequest = await prisma.joinRequest.findFirst({
      where: {
        id: requestId,
        roomId: room.id,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!joinRequest) {
      return NextResponse.json({ error: "Join request not found" }, { status: 404 });
    }

    if (action === 'approve') {
      // Check if room is full
      if (room.participants.length >= room.maxPlayers) {
        return NextResponse.json({ 
          error: "Room is full" 
        }, { status: 400 });
      }

      // Update request status
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' }
      });

      // Add user to room participants
      await prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          userId: joinRequest.userId,
          displayName: joinRequest.user.name || 'Player',
          role: 'PLAYER',
          isOnline: true
        }
      });

      // Create notification for the requester
      await prisma.notification.create({
        data: {
          userId: joinRequest.userId,
          type: 'JOIN_APPROVED',
          title: 'Join Request Approved',
          message: `Your request to join "${room.name || 'Puzzle Room'}" was approved`,
          actionUrl: `/room/${roomCode}`,
          metadata: JSON.stringify({
            roomId: room.id,
            roomCode: room.roomCode,
            roomName: room.name,
            approvedByUserId: session.userId,
            approvedByUserName: session.user?.name
          })
        }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      });

      // Create notification for the requester
      await prisma.notification.create({
        data: {
          userId: joinRequest.userId,
          type: 'JOIN_REJECTED',
          title: 'Join Request Rejected',
          message: `Your request to join "${room.name || 'Puzzle Room'}" was rejected`,
          actionUrl: `/multiplayer`,
          metadata: JSON.stringify({
            roomId: room.id,
            roomCode: room.roomCode,
            roomName: room.name,
            rejectedByUserId: session.userId,
            rejectedByUserName: session.user?.name
          })
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error updating join request:", error);
    return NextResponse.json(
      { error: "Failed to update join request" },
      { status: 500 }
    );
  }
}
