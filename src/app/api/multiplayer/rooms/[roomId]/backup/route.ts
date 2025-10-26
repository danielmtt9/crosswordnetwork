/**
 * API endpoints for room state backup
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const includeExpired = searchParams.get('includeExpired') === 'true';

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

    // Get backups
    const backups = await getRoomBackups(roomId, includeExpired);

    return NextResponse.json(backups);
  } catch (error) {
    console.error('Error fetching room backups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const body = await req.json();
    const { name, type, metadata } = body;

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

    // Create backup
    const backup = await createRoomBackup(roomId, session.user.id, name, type, metadata);

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Error creating room backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const backupId = searchParams.get('backupId');

    if (!backupId) {
      return new NextResponse('Backup ID required', { status: 400 });
    }

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

    // Delete backup
    await deleteRoomBackup(backupId);

    return new NextResponse('Backup deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting room backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getRoomBackups(roomId: string, includeExpired: boolean) {
  const whereClause: any = { roomId };
  
  if (!includeExpired) {
    whereClause.expiresAt = { gt: new Date() };
  }

  const backups = await db.roomRecoveryBackup.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      createdAt: true,
      expiresAt: true,
      isExpired: true,
      isCorrupted: true,
      metadata: true
    }
  });

  return backups.map(backup => ({
    id: backup.id,
    name: backup.name,
    type: backup.type,
    size: backup.size,
    createdAt: backup.createdAt,
    expiresAt: backup.expiresAt,
    isExpired: backup.isExpired,
    isCorrupted: backup.isCorrupted,
    metadata: backup.metadata
  }));
}

async function createRoomBackup(
  roomId: string, 
  userId: string, 
  name: string, 
  type: string, 
  metadata?: any
) {
  // Get current room state
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      state: true,
      version: true,
      settings: true,
      participants: {
        select: { userId: true, role: true }
      }
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Get current puzzle state
  const puzzleState = await db.roomPuzzleState.findMany({
    where: { roomId },
    select: {
      cellId: true,
      value: true,
      isCompleted: true,
      attempts: true,
      hintsUsed: true,
      updatedAt: true
    }
  });

  // Get current messages
  const messages = await db.roomMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      userId: true,
      content: true,
      type: true,
      createdAt: true
    }
  });

  // Create backup data
  const backupData = {
    room: {
      state: room.state,
      version: room.version,
      settings: room.settings,
      participants: room.participants
    },
    puzzle: {
      state: puzzleState
    },
    messages: messages,
    metadata: {
      createdAt: new Date(),
      createdBy: userId,
      roomId,
      ...metadata
    }
  };

  // Calculate backup size
  const backupSize = JSON.stringify(backupData).length;

  // Create backup record
  const backup = await db.roomRecoveryBackup.create({
    data: {
      roomId,
      userId,
      name: name || `Backup ${new Date().toLocaleString()}`,
      type: type || 'MANUAL',
      data: backupData,
      size: backupSize,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_CREATED',
      description: `Backup created: ${backup.name}`,
      metadata: {
        backupId: backup.id,
        backupSize,
        backupType: backup.type
      }
    }
  });

  return {
    id: backup.id,
    name: backup.name,
    type: backup.type,
    size: backup.size,
    createdAt: backup.createdAt,
    expiresAt: backup.expiresAt
  };
}

async function deleteRoomBackup(backupId: string) {
  // Get backup
  const backup = await db.roomRecoveryBackup.findUnique({
    where: { id: backupId }
  });

  if (!backup) {
    throw new Error('Backup not found');
  }

  // Delete backup
  await db.roomRecoveryBackup.delete({
    where: { id: backupId }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId: backup.roomId,
      userId: backup.userId,
      type: 'BACKUP_DELETED',
      description: `Backup deleted: ${backup.name}`,
      metadata: {
        backupId: backup.id,
        backupSize: backup.size
      }
    }
  });
}
