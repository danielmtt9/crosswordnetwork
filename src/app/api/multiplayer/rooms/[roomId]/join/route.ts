import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcrypt';

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
    const { password } = body;

    // Verify room exists
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: { 
        participants: true,
        puzzle: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== 'WAITING') {
      return NextResponse.json({ 
        error: "Room is not accepting new players" 
      }, { status: 400 });
    }

    // Check if room is full
    if (room.participants.length >= room.maxPlayers) {
      return NextResponse.json({ 
        error: "Room is full" 
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

    // Check password for private rooms
    if (room.isPrivate && room.password) {
      if (!password) {
        return NextResponse.json({ 
          error: "Password required for private room" 
        }, { status: 400 });
      }

      const isValidPassword = await bcrypt.compare(password, room.password);
      if (!isValidPassword) {
        return NextResponse.json({ 
          error: "Invalid password" 
        }, { status: 401 });
      }
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { 
        username: true, 
        name: true, 
        role: true, 
        subscriptionStatus: true, 
        trialEndsAt: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine user role
    const isPremium = user.role === 'PREMIUM' || 
                     user.subscriptionStatus === 'ACTIVE' ||
                     (user.subscriptionStatus === 'TRIAL' && user.trialEndsAt && new Date() < user.trialEndsAt);

    let role: 'HOST' | 'PLAYER' | 'SPECTATOR' = 'SPECTATOR';
    if (isPremium) {
      role = 'PLAYER';
    } else if (room.allowSpectators) {
      role = 'SPECTATOR';
    } else {
      return NextResponse.json({ 
        error: "This room doesn't allow spectators and you need a premium subscription to play" 
      }, { status: 403 });
    }

    // Add participant to room
    const participant = await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: session.userId,
        displayName: user.username || user.name || 'Player',
        role,
        isOnline: true
      }
    });

    // Check if room should auto-start
    if (room.autoStart && room.participants.length + 1 >= 2) {
      await prisma.multiplayerRoom.update({
        where: { id: room.id },
        data: { 
          status: 'ACTIVE',
          startedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      participant,
      room: {
        ...room,
        password: room.password ? '***' : null, // Hide password
        participantCount: room.participants.length + 1
      }
    });

  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json(
      { error: "Failed to join room" },
      { status: 500 }
    );
  }
}
