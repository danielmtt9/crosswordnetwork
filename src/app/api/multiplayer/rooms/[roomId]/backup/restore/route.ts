/**
 * API endpoints for room state backup restore
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Parse request body
    const body = await req.json();
    const { backupId, options } = body;

    if (!backupId) {
      return new NextResponse('Backup ID is required', { status: 400 });
    }

    // Restore room state
    const result = await restoreRoomState(roomId, session.user.id, backupId, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error restoring room state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function restoreRoomState(
  roomId: string, 
  userId: string, 
  backupId: string, 
  options: any = {}
) {
  const {
    createBackup = true,
    validate = true,
    merge = false
  } = options;

  // Get backup
  const backup = await db.roomRecoveryBackup.findUnique({
    where: { id: backupId }
  });

  if (!backup) {
    throw new Error('Backup not found');
  }

  if (backup.roomId !== roomId) {
    throw new Error('Backup does not belong to this room');
  }

  if (backup.isExpired) {
    throw new Error('Backup has expired');
  }

  if (backup.isCorrupted) {
    throw new Error('Backup is corrupted');
  }

  // Validate backup data if requested
  if (validate) {
    const validation = await validateBackupData(backup.data);
    if (!validation.isValid) {
      throw new Error(`Invalid backup data: ${validation.errors.join(', ')}`);
    }
  }

  // Create backup of current state if requested
  if (createBackup) {
    await createRestoreBackup(roomId, userId);
  }

  // Restore room state
  const result = await db.$transaction(async (tx) => {
    // Update room information
    if (backup.data.room) {
      await tx.multiplayerRoom.update({
        where: { id: roomId },
        data: {
          state: backup.data.room.state,
          version: backup.data.room.version,
          settings: backup.data.room.settings,
          updatedAt: new Date()
        }
      });
    }

    // Restore puzzle state
    if (backup.data.puzzle && backup.data.puzzle.state) {
      if (!merge) {
        // Clear existing puzzle state
        await tx.roomPuzzleState.deleteMany({
          where: { roomId }
        });
      }

      // Restore puzzle state
      for (const cell of backup.data.puzzle.state) {
        await tx.roomPuzzleState.upsert({
          where: {
            roomId_cellId: {
              roomId,
              cellId: cell.cellId
            }
          },
          update: {
            value: cell.value,
            isCompleted: cell.isCompleted,
            attempts: cell.attempts,
            hintsUsed: cell.hintsUsed,
            updatedAt: new Date()
          },
          create: {
            roomId,
            cellId: cell.cellId,
            value: cell.value,
            isCompleted: cell.isCompleted,
            attempts: cell.attempts,
            hintsUsed: cell.hintsUsed
          }
        });
      }
    }

    // Restore messages
    if (backup.data.messages && backup.data.messages.length > 0) {
      if (!merge) {
        // Clear existing messages
        await tx.roomMessage.deleteMany({
          where: { roomId }
        });
      }

      // Restore messages
      for (const message of backup.data.messages) {
        await tx.roomMessage.create({
          data: {
            roomId,
            userId: message.userId,
            content: message.content,
            type: message.type,
            createdAt: message.createdAt ? new Date(message.createdAt) : new Date()
          }
        });
      }
    }

    // Log restore activity
    await tx.roomActivity.create({
      data: {
        roomId,
        userId,
        type: 'BACKUP_RESTORED',
        description: `Room state restored from backup: ${backup.name}`,
        metadata: {
          backupId: backup.id,
          restoredAt: new Date(),
          createBackup,
          validate,
          merge
        }
      }
    });

    return {
      success: true,
      restoredAt: new Date(),
      backupId: backup.id,
      backupName: backup.name,
      createBackup,
      validate,
      merge
    };
  });

  return result;
}

async function validateBackupData(data: any) {
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };

  // Basic structure validation
  if (!data || typeof data !== 'object') {
    validation.isValid = false;
    validation.errors.push('Invalid data format');
    return validation;
  }

  // Validate room data
  if (data.room) {
    if (data.room.state && typeof data.room.state !== 'object') {
      validation.isValid = false;
      validation.errors.push('Invalid room state format');
    }

    if (data.room.version && typeof data.room.version !== 'string') {
      validation.isValid = false;
      validation.errors.push('Invalid room version format');
    }

    if (data.room.settings && typeof data.room.settings !== 'object') {
      validation.isValid = false;
      validation.errors.push('Invalid room settings format');
    }
  }

  // Validate puzzle state
  if (data.puzzle && data.puzzle.state) {
    if (!Array.isArray(data.puzzle.state)) {
      validation.isValid = false;
      validation.errors.push('Invalid puzzle state format');
    } else {
      for (const cell of data.puzzle.state) {
        if (!cell.cellId || typeof cell.cellId !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid puzzle cell ID');
          break;
        }

        if (typeof cell.isCompleted !== 'boolean') {
          validation.isValid = false;
          validation.errors.push('Invalid puzzle cell completion status');
          break;
        }

        if (typeof cell.attempts !== 'number' || cell.attempts < 0) {
          validation.isValid = false;
          validation.errors.push('Invalid puzzle cell attempts');
          break;
        }

        if (typeof cell.hintsUsed !== 'number' || cell.hintsUsed < 0) {
          validation.isValid = false;
          validation.errors.push('Invalid puzzle cell hints used');
          break;
        }
      }
    }
  }

  // Validate messages
  if (data.messages) {
    if (!Array.isArray(data.messages)) {
      validation.isValid = false;
      validation.errors.push('Invalid messages format');
    } else {
      for (const message of data.messages) {
        if (!message.userId || typeof message.userId !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid message user ID');
          break;
        }

        if (!message.content || typeof message.content !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid message content');
          break;
        }

        if (!message.type || typeof message.type !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid message type');
          break;
        }
      }
    }
  }

  return validation;
}

async function createRestoreBackup(roomId: string, userId: string) {
  // Get current room state
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      state: true,
      version: true,
      settings: true
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
      settings: room.settings
    },
    puzzle: {
      state: puzzleState
    },
    messages: messages,
    metadata: {
      createdAt: new Date(),
      createdBy: userId,
      roomId,
      type: 'RESTORE_BACKUP'
    }
  };

  // Calculate backup size
  const backupSize = JSON.stringify(backupData).length;

  // Create backup record
  const backup = await db.roomRecoveryBackup.create({
    data: {
      roomId,
      userId,
      name: `Restore Backup ${new Date().toLocaleString()}`,
      type: 'RESTORE_BACKUP',
      data: backupData,
      size: backupSize,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return backup;
}
