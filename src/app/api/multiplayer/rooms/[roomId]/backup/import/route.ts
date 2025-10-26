/**
 * API endpoints for room state backup import
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
    const { data, options } = body;

    if (!data) {
      return new NextResponse('Data is required', { status: 400 });
    }

    // Import room state
    const result = await importRoomState(roomId, session.user.id, data, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error importing room state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function importRoomState(
  roomId: string, 
  userId: string, 
  data: any, 
  options: any = {}
) {
  const {
    overwrite = false,
    merge = false,
    validate = true,
    createBackup = true
  } = options;

  // Validate import data
  if (validate) {
    const validation = await validateImportData(data);
    if (!validation.isValid) {
      throw new Error(`Invalid import data: ${validation.errors.join(', ')}`);
    }
  }

  // Create backup of current state if requested
  if (createBackup) {
    await createImportBackup(roomId, userId);
  }

  // Import room state
  const result = await db.$transaction(async (tx) => {
    // Update room information
    if (data.room) {
      await tx.multiplayerRoom.update({
        where: { id: roomId },
        data: {
          name: data.room.name || undefined,
          state: data.room.state || undefined,
          version: data.room.version || undefined,
          settings: data.room.settings || undefined,
          updatedAt: new Date()
        }
      });
    }

    // Import participants
    if (data.participants && data.participants.length > 0) {
      if (overwrite) {
        // Clear existing participants
        await tx.roomParticipant.deleteMany({
          where: { roomId }
        });
      }

      // Import participants
      for (const participant of data.participants) {
        await tx.roomParticipant.upsert({
          where: {
            roomId_userId: {
              roomId,
              userId: participant.id
            }
          },
          update: {
            role: participant.role,
            isActive: participant.isActive,
            lastSeen: participant.lastSeen ? new Date(participant.lastSeen) : new Date()
          },
          create: {
            roomId,
            userId: participant.id,
            role: participant.role,
            isActive: participant.isActive,
            lastSeen: participant.lastSeen ? new Date(participant.lastSeen) : new Date()
          }
        });
      }
    }

    // Import puzzle state
    if (data.puzzle && data.puzzle.state) {
      if (overwrite) {
        // Clear existing puzzle state
        await tx.roomPuzzleState.deleteMany({
          where: { roomId }
        });
      }

      // Import puzzle state
      for (const cell of data.puzzle.state) {
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

    // Import messages
    if (data.messages && data.messages.length > 0) {
      if (overwrite) {
        // Clear existing messages
        await tx.roomMessage.deleteMany({
          where: { roomId }
        });
      }

      // Import messages
      for (const message of data.messages) {
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

    // Import activities
    if (data.activities && data.activities.length > 0) {
      if (overwrite) {
        // Clear existing activities
        await tx.roomActivity.deleteMany({
          where: { roomId }
        });
      }

      // Import activities
      for (const activity of data.activities) {
        await tx.roomActivity.create({
          data: {
            roomId,
            userId: activity.user.id,
            type: activity.type,
            description: activity.description,
            metadata: activity.metadata || {},
            createdAt: activity.createdAt ? new Date(activity.createdAt) : new Date()
          }
        });
      }
    }

    // Log import activity
    await tx.roomActivity.create({
      data: {
        roomId,
        userId,
        type: 'ROOM_IMPORTED',
        description: 'Room state imported from backup',
        metadata: {
          importedAt: new Date(),
          overwrite,
          merge,
          validate,
          createBackup
        }
      }
    });

    return {
      success: true,
      importedAt: new Date(),
      overwrite,
      merge,
      validate,
      createBackup
    };
  });

  return result;
}

async function validateImportData(data: any) {
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
    if (typeof data.room.name !== 'string') {
      validation.warnings.push('Invalid room name format');
    }

    if (typeof data.room.version !== 'string') {
      validation.warnings.push('Invalid room version format');
    }

    if (data.room.settings && typeof data.room.settings !== 'object') {
      validation.warnings.push('Invalid room settings format');
    }
  }

  // Validate participants
  if (data.participants) {
    if (!Array.isArray(data.participants)) {
      validation.isValid = false;
      validation.errors.push('Invalid participants format');
    } else {
      for (const participant of data.participants) {
        if (!participant.id || typeof participant.id !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid participant ID');
          break;
        }

        if (!participant.role || typeof participant.role !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid participant role');
          break;
        }

        if (typeof participant.isActive !== 'boolean') {
          validation.warnings.push('Invalid participant active status');
        }
      }
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

async function createImportBackup(roomId: string, userId: string) {
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
      type: 'IMPORT_BACKUP'
    }
  };

  // Calculate backup size
  const backupSize = JSON.stringify(backupData).length;

  // Create backup record
  const backup = await db.roomRecoveryBackup.create({
    data: {
      roomId,
      userId,
      name: `Import Backup ${new Date().toLocaleString()}`,
      type: 'IMPORT_BACKUP',
      data: backupData,
      size: backupSize,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return backup;
}
