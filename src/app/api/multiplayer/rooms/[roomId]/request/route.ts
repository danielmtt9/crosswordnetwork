import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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
    const { message } = body;

    // Verify room exists
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: { 
        participants: true,
        puzzle: true,
        hostUserId: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== 'WAITING') {
      return NextResponse.json({ 
        error: "Room is not accepting join requests" 
      }, { status: 400 });
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: room.id,
        userId: session.userId
      }
    });

    if (existingParticipant) {
      return NextResponse.json({ 
        error: "You are already in this room" 
      }, { status: 400 });
    }

    // Check if user already has a pending request
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        roomId: room.id,
        userId: session.userId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      return NextResponse.json({ 
        error: "You already have a pending request for this room" 
      }, { status: 400 });
    }

    // Create join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        roomId: room.id,
        userId: session.userId,
        message: message || null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            subscriptionStatus: true
          }
        }
      }
    });

    // Create notification for the host
    await prisma.notification.create({
      data: {
        userId: room.hostUserId,
        type: 'JOIN_REQUEST',
        title: 'Join Request',
        message: `${session.user?.name || 'Someone'} wants to join your room`,
        actionUrl: `/room/${roomCode}`,
        metadata: JSON.stringify({
          roomId: room.id,
          roomCode: room.roomCode,
          roomName: room.name,
          puzzleTitle: room.puzzle.title,
          requestUserId: session.userId,
          requestUserName: session.user?.name,
          joinRequestId: joinRequest.id
        })
      }
    });

    return NextResponse.json(joinRequest);

  } catch (error) {
    console.error("Error creating join request:", error);
    return NextResponse.json(
      { error: "Failed to create join request" },
      { status: 500 }
    );
  }
}
