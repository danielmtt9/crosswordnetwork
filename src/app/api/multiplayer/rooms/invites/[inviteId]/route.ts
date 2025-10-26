import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcrypt';

// GET /api/multiplayer/rooms/invites/[inviteId] - Get invitation details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const inviteId = resolvedParams.inviteId;

    const invite = await prisma.roomInvite.findUnique({
      where: { id: inviteId },
      include: {
        room: {
          include: {
            hostUser: {
              select: { name: true, username: true, image: true }
            },
            puzzle: {
              select: { title: true, difficulty: true }
            },
            participants: {
              select: { userId: true, role: true, displayName: true }
            }
          }
        }
      }
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check if invitation is expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Check if invitation is for the current user
    if (invite.targetUserId && invite.targetUserId !== session.userId) {
      return NextResponse.json({ error: "This invitation is not for you" }, { status: 403 });
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: invite.roomId,
        userId: session.userId
      }
    });

    if (existingParticipant) {
      return NextResponse.json({ error: "You are already in this room" }, { status: 400 });
    }

    return NextResponse.json({
      id: invite.id,
      room: {
        id: invite.room.id,
        roomCode: invite.room.roomCode,
        name: invite.room.name,
        description: invite.room.description,
        isPrivate: invite.room.isPrivate,
        hasPassword: !!invite.room.password,
        maxPlayers: invite.room.maxPlayers,
        participantCount: invite.room.participants.length,
        hostName: invite.room.hostUser.name || invite.room.hostUser.username,
        hostAvatar: invite.room.hostUser.image,
        puzzleTitle: invite.room.puzzle.title,
        puzzleDifficulty: invite.room.puzzle.difficulty,
        status: invite.room.status,
        timeLimit: invite.room.timeLimit,
        allowSpectators: invite.room.allowSpectators
      },
      invitedBy: invite.invitedByUserName,
      message: invite.message,
      expiresAt: invite.expiresAt.toISOString(),
      createdAt: invite.createdAt.toISOString()
    });

  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    );
  }
}

// POST /api/multiplayer/rooms/invites/[inviteId] - Accept or decline invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const inviteId = resolvedParams.inviteId;

    const body = await request.json();
    const { action, password } = body; // action: 'accept' | 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ 
        error: "Action is required and must be 'accept' or 'decline'" 
      }, { status: 400 });
    }

    const invite = await prisma.roomInvite.findUnique({
      where: { id: inviteId },
      include: {
        room: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!invite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Check if invitation is expired
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invitation has expired" }, { status: 400 });
    }

    // Check if invitation is for the current user
    if (invite.targetUserId && invite.targetUserId !== session.userId) {
      return NextResponse.json({ error: "This invitation is not for you" }, { status: 403 });
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.roomParticipant.findFirst({
      where: {
        roomId: invite.roomId,
        userId: session.userId
      }
    });

    if (existingParticipant) {
      return NextResponse.json({ error: "You are already in this room" }, { status: 400 });
    }

    if (action === 'decline') {
      // Mark invitation as declined
      await prisma.roomInvite.update({
        where: { id: inviteId },
        data: { status: 'DECLINED' }
      });

      return NextResponse.json({ 
        success: true, 
        message: "Invitation declined" 
      });
    }

    // Accept invitation
    if (action === 'accept') {
      // Check if room is full
      if (invite.room.participants.length >= invite.room.maxPlayers) {
        return NextResponse.json({ 
          error: "Room is full" 
        }, { status: 400 });
      }

      // Check if room is private and password is required
      if (invite.room.isPrivate && invite.room.password) {
        if (!password) {
          return NextResponse.json({ 
            error: "Password is required to join this private room" 
          }, { status: 400 });
        }
        if (!(await bcrypt.compare(password, invite.room.password))) {
          return NextResponse.json({ 
            error: "Incorrect password" 
          }, { status: 401 });
        }
      }

      // Get user info
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { username: true, name: true, role: true, subscriptionStatus: true, trialEndsAt: true }
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isPremium = user?.role === 'PREMIUM' ||
                       user?.subscriptionStatus === 'ACTIVE' ||
                       (user?.subscriptionStatus === 'TRIAL' && user?.trialEndsAt && new Date() < user.trialEndsAt);

      const participantRole = isPremium ? 'PLAYER' : 'SPECTATOR';

      // Add participant to room
      await prisma.roomParticipant.create({
        data: {
          roomId: invite.roomId,
          userId: session.userId,
          displayName: user?.username || user?.name || 'Player',
          avatarUrl: session.user?.image || null,
          role: participantRole,
          isOnline: true
        }
      });

      // Mark invitation as accepted
      await prisma.roomInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED' }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: session.userId,
          action: 'ACCEPT_ROOM_INVITE',
          entityType: 'ROOM_INVITE',
          entityId: inviteId,
          before: JSON.stringify({ status: 'PENDING' }),
          after: JSON.stringify({ status: 'ACCEPTED' }),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: "Successfully joined the room",
        roomCode: invite.room.roomCode
      });
    }

  } catch (error) {
    console.error("Error processing invitation:", error);
    return NextResponse.json(
      { error: "Failed to process invitation" },
      { status: 500 }
    );
  }
}
