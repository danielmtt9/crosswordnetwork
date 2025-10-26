/**
 * API endpoints for room recovery
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

    // Get recovery state
    const recoveryState = await getRecoveryState(roomId, session.user.id);

    return NextResponse.json(recoveryState);
  } catch (error) {
    console.error('Error fetching recovery state:', error);
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
    const { action, data } = body;

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

    let result;
    switch (action) {
      case 'create_backup':
        result = await createRecoveryBackup(roomId, session.user.id, data);
        break;
      case 'restore_backup':
        result = await restoreFromBackup(roomId, session.user.id, data);
        break;
      case 'recover_session':
        result = await recoverSession(roomId, session.user.id, data);
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing recovery action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getRecoveryState(roomId: string, userId: string) {
  // Get room recovery status
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      state: true,
      version: true,
      lastActivityAt: true,
      createdAt: true
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Get user's connection status
  const participant = await db.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId
      }
    },
    select: {
      isActive: true,
      lastSeen: true,
      connectionStatus: true
    }
  });

  // Get recent backups
  const backups = await db.roomRecoveryBackup.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      createdAt: true,
      isExpired: true,
      isCorrupted: true
    }
  });

  // Get recovery history
  const recoveryHistory = await db.roomRecoveryHistory.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      type: true,
      status: true,
      createdAt: true,
      metadata: true
    }
  });

  // Check if user is disconnected
  const isDisconnected = participant?.connectionStatus === 'DISCONNECTED';
  
  // Check if there are unsaved changes
  const hasUnsavedChanges = await checkUnsavedChanges(roomId, userId);

  // Check if room is recovering
  const isRecovering = await checkRecoveryInProgress(roomId);

  return {
    isDisconnected,
    hasUnsavedChanges,
    isRecovering,
    connectionStatus: participant?.connectionStatus || 'UNKNOWN',
    lastSeen: participant?.lastSeen,
    backups: backups.map(backup => ({
      id: backup.id,
      name: backup.name,
      type: backup.type,
      size: backup.size,
      createdAt: backup.createdAt,
      isExpired: backup.isExpired,
      isCorrupted: backup.isCorrupted
    })),
    recoveryHistory: recoveryHistory.map(history => ({
      id: history.id,
      type: history.type,
      status: history.status,
      createdAt: history.createdAt,
      metadata: history.metadata
    })),
    room: {
      id: room.id,
      name: room.name,
      version: room.version,
      lastActivityAt: room.lastActivityAt,
      createdAt: room.createdAt
    }
  };
}

async function createRecoveryBackup(roomId: string, userId: string, data: any) {
  // Get current room state
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      state: true,
      version: true,
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
      hintsUsed: true
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
      ...data
    }
  };

  // Calculate backup size
  const backupSize = JSON.stringify(backupData).length;

  // Create backup record
  const backup = await db.roomRecoveryBackup.create({
    data: {
      roomId,
      userId,
      name: data.name || `Backup ${new Date().toLocaleString()}`,
      type: data.type || 'MANUAL',
      data: backupData,
      size: backupSize,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  // Log recovery activity
  await db.roomRecoveryHistory.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_CREATED',
      status: 'SUCCESS',
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
    createdAt: backup.createdAt
  };
}

async function restoreFromBackup(roomId: string, userId: string, data: any) {
  const { backupId } = data;

  // Get backup
  const backup = await db.roomRecoveryBackup.findUnique({
    where: { id: backupId }
  });

  if (!backup) {
    throw new Error('Backup not found');
  }

  if (backup.isExpired) {
    throw new Error('Backup has expired');
  }

  if (backup.isCorrupted) {
    throw new Error('Backup is corrupted');
  }

  // Restore room state
  const backupData = backup.data as any;
  
  // Update room state
  await db.multiplayerRoom.update({
    where: { id: roomId },
    data: {
      state: backupData.room.state,
      version: backupData.room.version,
      updatedAt: new Date()
    }
  });

  // Restore puzzle state
  if (backupData.puzzle?.state) {
    // Clear existing puzzle state
    await db.roomPuzzleState.deleteMany({
      where: { roomId }
    });

    // Restore puzzle state
    await db.roomPuzzleState.createMany({
      data: backupData.puzzle.state.map((cell: any) => ({
        roomId,
        cellId: cell.cellId,
        value: cell.value,
        isCompleted: cell.isCompleted,
        attempts: cell.attempts,
        hintsUsed: cell.hintsUsed
      }))
    });
  }

  // Log recovery activity
  await db.roomRecoveryHistory.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_RESTORED',
      status: 'SUCCESS',
      metadata: {
        backupId: backup.id,
        restoredAt: new Date()
      }
    }
  });

  return {
    success: true,
    restoredAt: new Date(),
    backupId: backup.id
  };
}

async function recoverSession(roomId: string, userId: string, data: any) {
  // Update participant connection status
  await db.roomParticipant.update({
    where: {
      roomId_userId: {
        roomId,
        userId
      }
    },
    data: {
      connectionStatus: 'CONNECTED',
      isActive: true,
      lastSeen: new Date()
    }
  });

  // Log recovery activity
  await db.roomRecoveryHistory.create({
    data: {
      roomId,
      userId,
      type: 'SESSION_RECOVERED',
      status: 'SUCCESS',
      metadata: {
        recoveredAt: new Date(),
        ...data
      }
    }
  });

  return {
    success: true,
    recoveredAt: new Date()
  };
}

async function checkUnsavedChanges(roomId: string, userId: string): Promise<boolean> {
  // Check if user has unsaved changes
  const lastActivity = await db.roomActivity.findFirst({
    where: {
      roomId,
      userId,
      type: 'PUZZLE_ACTION'
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!lastActivity) return false;

  // Check if last activity was recent (within 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return lastActivity.createdAt > fiveMinutesAgo;
}

async function checkRecoveryInProgress(roomId: string): Promise<boolean> {
  // Check if there's a recovery in progress
  const recentRecovery = await db.roomRecoveryHistory.findFirst({
    where: {
      roomId,
      type: 'RECOVERY_STARTED',
      createdAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
      }
    }
  });

  return !!recentRecovery;
}
