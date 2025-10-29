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

    // Only allow joining WAITING or ACTIVE rooms
    // COMPLETED and EXPIRED rooms cannot be joined
    if (room.status === 'COMPLETED' || room.status === 'EXPIRED') {
      return NextResponse.json({ 
        error: "This room has ended and is no longer accepting players" 
      }, { status: 400 });
    }

    // Check if room is full (only count PLAYER roles, spectators don't count against limit)
    const playerCount = room.participants.filter(p => p.role === 'PLAYER' || p.role === 'HOST').length;
    
    // We'll check maxPlayers after determining the user's role
    // For now, just do a preliminary check to prevent abuse
    if (room.participants.length >= 100) { // Hard limit to prevent spam
      return NextResponse.json({ 
        error: "Room has reached maximum capacity" 
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
      // User is already in room, just update their online status and return success
      const updatedParticipant = await prisma.roomParticipant.update({
        where: { id: existingParticipant.id },
        data: { 
          isOnline: true,
          leftAt: null
        }
      });
      
      return NextResponse.json({
        success: true,
        participant: updatedParticipant,
        room: {
          ...room,
          password: room.password ? '***' : null,
          participantCount: room.participants.length
        },
        message: "Already in room - status updated"
      });
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
    
    // If room is ACTIVE, force spectator role (game already in progress)
    if (room.status === 'ACTIVE') {
      if (!room.allowSpectators) {
        return NextResponse.json({ 
          error: "This room is in progress and doesn't allow spectators" 
        }, { status: 403 });
      }
      role = 'SPECTATOR';
    } else {
      // Room is WAITING, assign role based on premium status
      if (isPremium) {
        // Check if there's room for another player
        if (playerCount >= room.maxPlayers) {
          // Room is full of players, check if spectators are allowed
          if (!room.allowSpectators) {
            return NextResponse.json({ 
              error: "Room is full and spectators are not allowed" 
            }, { status: 400 });
          }
          role = 'SPECTATOR';
        } else {
          role = 'PLAYER';
        }
      } else if (room.allowSpectators) {
        role = 'SPECTATOR';
      } else {
        return NextResponse.json({ 
          error: "This room doesn't allow spectators and you need a premium subscription to play" 
        }, { status: 403 });
      }
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
