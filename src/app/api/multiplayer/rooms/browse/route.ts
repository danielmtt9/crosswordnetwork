import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/multiplayer/rooms/browse - Browse public rooms with filtering and search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50); // Max 50 per page
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const difficulty = searchParams.get('difficulty') || 'all';
    const privacy = searchParams.get('privacy') || 'all';
    const sort = searchParams.get('sort') || 'created';
    const joinable = searchParams.get('joinable') === 'true';
    const hasSpace = searchParams.get('hasSpace') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      // Only show public rooms or rooms the user is a participant in
      OR: [
        { isPrivate: false },
        {
          participants: {
            some: { userId: session.userId }
          }
        }
      ],
      // Exclude expired rooms by default
      status: { not: 'EXPIRED' }
    };

    // Apply status filter
    if (status !== 'all') {
      where.status = status;
    }

    // Apply joinable filter
    if (joinable) {
      where.status = 'WAITING';
    }

    // Apply space filter
    if (hasSpace) {
      where.participants = {
        some: {},
        _count: {
          lt: prisma.multiplayerRoom.fields.maxPlayers
        }
      };
    }

    // Apply privacy filter
    if (privacy === 'public') {
      where.isPrivate = false;
    } else if (privacy === 'private') {
      where.isPrivate = true;
    }

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' }; // Default sort
    switch (sort) {
      case 'created':
        orderBy = { createdAt: 'desc' };
        break;
      case 'started':
        orderBy = { startedAt: 'desc' };
        break;
      case 'participants':
        orderBy = { participants: { _count: 'desc' } };
        break;
      case 'rating':
        // For now, sort by creation date (would need rating system)
        orderBy = { createdAt: 'desc' };
        break;
      case 'popular':
        // Sort by participant count and creation date
        orderBy = [
          { participants: { _count: 'desc' } },
          { createdAt: 'desc' }
        ];
        break;
    }

    // Get rooms with related data
    const rooms = await prisma.multiplayerRoom.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        hostUser: {
          select: {
            name: true,
            username: true,
            image: true
          }
        },
        puzzle: {
          select: {
            title: true,
            difficulty: true
          }
        },
        participants: {
          select: {
            userId: true,
            role: true,
            isOnline: true
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      }
    });

    // Get total count for pagination
    const total = await prisma.multiplayerRoom.count({ where });

    // Transform rooms to include computed fields
    const transformedRooms = rooms.map(room => {
      const participantCount = room.participants.filter(p => p.role === 'PLAYER' || p.role === 'HOST').length;
      const spectatorCount = room.participants.filter(p => p.role === 'SPECTATOR').length;
      const hostName = room.hostUser.username || room.hostUser.name || 'Unknown Host';

      return {
        id: room.id,
        roomCode: room.roomCode,
        name: room.name,
        description: room.description,
        hostName,
        hostAvatar: room.hostUser.image,
        puzzleTitle: room.puzzle.title,
        puzzleDifficulty: room.puzzle.difficulty,
        participantCount,
        maxPlayers: room.maxPlayers,
        spectatorCount,
        allowSpectators: room.allowSpectators,
        isPrivate: room.isPrivate,
        hasPassword: !!room.password,
        status: room.status,
        timeLimit: room.timeLimit,
        tags: room.tags ? JSON.parse(room.tags) : [],
        createdAt: room.createdAt.toISOString(),
        startedAt: room.startedAt?.toISOString(),
        averageRating: 0, // TODO: Implement rating system
        totalPlays: 0, // TODO: Implement play tracking
      };
    });

    // Apply search filter if provided
    let filteredRooms = transformedRooms;
    if (search.trim()) {
      const query = search.toLowerCase();
      filteredRooms = transformedRooms.filter(room => 
        room.name?.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query) ||
        room.hostName.toLowerCase().includes(query) ||
        room.puzzleTitle.toLowerCase().includes(query) ||
        room.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply difficulty filter if provided
    if (difficulty !== 'all') {
      filteredRooms = filteredRooms.filter(room => room.puzzleDifficulty === difficulty);
    }

    return NextResponse.json({
      rooms: filteredRooms,
      total: filteredRooms.length,
      page,
      limit,
      totalPages: Math.ceil(filteredRooms.length / limit)
    });

  } catch (error) {
    console.error("Error browsing rooms:", error);
    return NextResponse.json(
      { error: "Failed to browse rooms" },
      { status: 500 }
    );
  }
}
