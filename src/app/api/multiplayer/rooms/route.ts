import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import bcrypt from 'bcrypt';

// GET: List active rooms with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty');
    const hasTimeLimit = searchParams.get('hasTimeLimit');
    const allowSpectators = searchParams.get('allowSpectators');
    const search = searchParams.get('search');

    // Build where clause with filters
    const whereClause: any = {
      status: { in: ['WAITING', 'ACTIVE'] },
      OR: [
        { isPrivate: false },
        { hostUserId: session.userId },
        {
          participants: {
            some: { userId: session.userId }
          }
        }
      ]
    };

    // Add filters
    if (difficulty) {
      whereClause.difficulty = difficulty;
    }

    if (hasTimeLimit === 'true') {
      whereClause.timeLimit = { not: null };
    } else if (hasTimeLimit === 'false') {
      whereClause.timeLimit = null;
    }

    if (allowSpectators !== null) {
      whereClause.allowSpectators = allowSpectators === 'true';
    }

    if (search) {
      whereClause.OR = [
        ...whereClause.OR,
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const rooms = await prisma.multiplayerRoom.findMany({
      where: whereClause,
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
          where: { isOnline: true },
          select: {
            userId: true,
            displayName: true,
            avatarUrl: true,
            role: true
          }
        },
        puzzle: {
          select: {
            id: true,
            title: true,
            difficulty: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Process rooms to include parsed tags and hide sensitive data
    const processedRooms = rooms.map(room => ({
      ...room,
      tags: room.tags ? JSON.parse(room.tags) : [],
      password: room.password ? '***' : null, // Hide password hash
      participantCount: room.participants.length,
      participants: room.participants.map(p => ({
        ...p,
        isOnline: true // All participants in this query are online
      }))
    }));

    return NextResponse.json({
      rooms: processedRooms,
      total: processedRooms.length,
      hasMore: false
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      puzzleId, 
      maxPlayers = 4, 
      isPrivate = false, 
      roomName,
      description,
      allowSpectators = true,
      autoStart = false,
      timeLimit = null, // in minutes, null for no limit
      difficulty = null, // 'EASY', 'MEDIUM', 'HARD', null for any
      tags = [],
      password = null // for private rooms
    } = body;

    // Validation
    if (!puzzleId) {
      return NextResponse.json(
        { error: "Puzzle ID is required" },
        { status: 400 }
      );
    }

    if (maxPlayers < 2 || maxPlayers > 8) {
      return NextResponse.json(
        { error: "Max players must be between 2 and 8" },
        { status: 400 }
      );
    }

    if (roomName && (roomName.length < 3 || roomName.length > 50)) {
      return NextResponse.json(
        { error: "Room name must be between 3 and 50 characters" },
        { status: 400 }
      );
    }

    if (description && description.length > 200) {
      return NextResponse.json(
        { error: "Description must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (timeLimit && (timeLimit < 5 || timeLimit > 180)) {
      return NextResponse.json(
        { error: "Time limit must be between 5 and 180 minutes" },
        { status: 400 }
      );
    }

    if (difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      return NextResponse.json(
        { error: "Difficulty must be EASY, MEDIUM, or HARD" },
        { status: 400 }
      );
    }

    if (tags && (!Array.isArray(tags) || tags.length > 5)) {
      return NextResponse.json(
        { error: "Tags must be an array with maximum 5 items" },
        { status: 400 }
      );
    }

    if (password && (password.length < 4 || password.length > 20)) {
      return NextResponse.json(
        { error: "Password must be between 4 and 20 characters" },
        { status: 400 }
      );
    }

    // Check if user is premium (only premium can host)
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, subscriptionStatus: true, trialEndsAt: true }
    });

    const isPremium = user?.role === 'PREMIUM' || 
                     user?.subscriptionStatus === 'ACTIVE' ||
                     (user?.subscriptionStatus === 'TRIAL' && user?.trialEndsAt && new Date() < user.trialEndsAt);

    if (!isPremium) {
      return NextResponse.json(
        { error: "Premium subscription required to host rooms" },
        { status: 403 }
      );
    }

    // Generate unique 6-character room code
    const generateRoomCode = () => {
      return Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    let roomCode = generateRoomCode();
    let attempts = 0;
    
    // Ensure uniqueness
    while (attempts < 10) {
      const existing = await prisma.multiplayerRoom.findUnique({
        where: { roomCode }
      });
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create room
    const room = await prisma.multiplayerRoom.create({
      data: {
        roomCode,
        name: roomName || `Room ${roomCode}`,
        description,
        puzzleId,
        maxPlayers,
        isPrivate,
        password: hashedPassword,
        allowSpectators,
        autoStart,
        timeLimit,
        difficulty,
        tags: tags.length > 0 ? JSON.stringify(tags) : null,
        hostUserId: session.userId,
        status: 'WAITING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Get user's username for displayName
    const userWithUsername = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { username: true, name: true }
    });

    // Add host as first participant
    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: session.userId,
        displayName: userWithUsername?.username || session.user?.name || 'Host',
        avatarUrl: session.user?.image || null,
        role: 'HOST',
        isOnline: true
      }
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
