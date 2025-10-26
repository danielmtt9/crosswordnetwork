/**
 * API endpoints for room state management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get('version');

    // Check if user has access to room
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { 
        hostUserId: true,
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    const isParticipant = room.participants.some(p => p.userId === session.user.id);
    
    if (!isParticipant) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get room state
    const roomState = await getRoomState(roomId, version);

    return NextResponse.json(roomState);
  } catch (error) {
    console.error('Error fetching room state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const body = await req.json();
    const { state, version, metadata } = body;

    // Check if user has access to room
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { 
        hostUserId: true,
        participants: {
          select: { userId: true, role: true }
        }
      }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    const isHost = room.hostUserId === session.user.id;
    const isParticipant = room.participants.some(p => p.userId === session.user.id);
    
    if (!isParticipant) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Save room state
    const savedState = await saveRoomState(roomId, session.user.id, state, version, metadata);

    return NextResponse.json(savedState);
  } catch (error) {
    console.error('Error saving room state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const body = await req.json();
    const { version, state } = body;

    // Check if user is host
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    if (room.hostUserId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Restore room state
    const restoredState = await restoreRoomState(roomId, version, state);

    return NextResponse.json(restoredState);
  } catch (error) {
    console.error('Error restoring room state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getRoomState(roomId: string, version?: string) {
  // Get current room state
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      settings: true,
      state: true,
      version: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Get state versions if version is specified
  let stateVersions = [];
  if (version) {
    stateVersions = await db.roomStateVersion.findMany({
      where: {
        roomId,
        version: { gte: version }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  // Get current participants
  const participants = await db.roomParticipant.findMany({
    where: { roomId },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  // Get current puzzle state
  const puzzleState = await db.roomPuzzleState.findMany({
    where: { roomId },
    select: {
      id: true,
      userId: true,
      cellId: true,
      value: true,
      isCompleted: true,
      attempts: true,
      hintsUsed: true,
      updatedAt: true
    }
  });

  // Get recent messages
  const messages = await db.roomMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  return {
    room: {
      id: room.id,
      name: room.name,
      settings: room.settings,
      state: room.state,
      version: room.version,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    },
    participants: participants.map(p => ({
      id: p.userId,
      name: p.user.name,
      avatar: p.user.image,
      role: p.role,
      isActive: p.isActive,
      lastSeen: p.lastSeen
    })),
    puzzleState: puzzleState.map(ps => ({
      id: ps.id,
      userId: ps.userId,
      cellId: ps.cellId,
      value: ps.value,
      isCompleted: ps.isCompleted,
      attempts: ps.attempts,
      hintsUsed: ps.hintsUsed,
      updatedAt: ps.updatedAt
    })),
    messages: messages.map(m => ({
      id: m.id,
      userId: m.userId,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        image: m.user.image
      }
    })),
    stateVersions: stateVersions.map(sv => ({
      id: sv.id,
      version: sv.version,
      state: sv.state,
      metadata: sv.metadata,
      createdAt: sv.createdAt
    }))
  };
}

async function saveRoomState(
  roomId: string, 
  userId: string, 
  state: any, 
  version: string, 
  metadata?: any
) {
  // Create state version
  const stateVersion = await db.roomStateVersion.create({
    data: {
      roomId,
      userId,
      version,
      state,
      metadata: metadata || {}
    }
  });

  // Update room version
  await db.multiplayerRoom.update({
    where: { id: roomId },
    data: {
      version,
      state,
      updatedAt: new Date()
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId,
      type: 'STATE_SAVE',
      description: 'Room state saved',
      metadata: {
        version,
        stateSize: JSON.stringify(state).length
      }
    }
  });

  return {
    id: stateVersion.id,
    version: stateVersion.version,
    createdAt: stateVersion.createdAt
  };
}

async function restoreRoomState(roomId: string, version: string, state: any) {
  // Get the state version to restore
  const stateVersion = await db.roomStateVersion.findFirst({
    where: {
      roomId,
      version
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!stateVersion) {
    throw new Error('State version not found');
  }

  // Update room with restored state
  await db.multiplayerRoom.update({
    where: { id: roomId },
    data: {
      state: stateVersion.state,
      version: stateVersion.version,
      updatedAt: new Date()
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId: stateVersion.userId,
      type: 'STATE_RESTORE',
      description: 'Room state restored',
      metadata: {
        version,
        restoredFrom: stateVersion.createdAt
      }
    }
  });

  return {
    version: stateVersion.version,
    restoredAt: new Date(),
    restoredFrom: stateVersion.createdAt
  };
}