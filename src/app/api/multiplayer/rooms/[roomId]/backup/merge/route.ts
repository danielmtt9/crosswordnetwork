/**
 * API endpoints for room state backup merge
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params; {
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
    const { backupIds, mergeStrategy, options } = body;

    if (!backupIds || !Array.isArray(backupIds) || backupIds.length < 2) {
      return new NextResponse('At least 2 backup IDs are required', { status: 400 });
    }

    if (!mergeStrategy) {
      return new NextResponse('Merge strategy is required', { status: 400 });
    }

    // Merge backups
    const result = await mergeBackups(roomId, session.user.id, backupIds, mergeStrategy, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error merging backups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function mergeBackups(
  roomId: string,
  userId: string,
  backupIds: string[],
  mergeStrategy: string,
  options: any = {}
) {
  const {
    createBackup = true,
    validate = true,
    conflictResolution = 'manual'
  } = options;

  // Get backups
  const backups = await db.roomRecoveryBackup.findMany({
    where: {
      id: { in: backupIds },
      roomId
    },
    select: {
      id: true,
      name: true,
      type: true,
      data: true,
      createdAt: true
    }
  });

  if (backups.length !== backupIds.length) {
    throw new Error('One or more backups not found');
  }

  // Validate backups if requested
  if (validate) {
    for (const backup of backups) {
      const validation = await validateBackupData(backup.data);
      if (!validation.isValid) {
        throw new Error(`Invalid backup data in ${backup.name}: ${validation.errors.join(', ')}`);
      }
    }
  }

  // Create backup of current state if requested
  if (createBackup) {
    await createMergeBackup(roomId, userId);
  }

  // Merge backups based on strategy
  let mergedData;
  switch (mergeStrategy) {
    case 'latest':
      mergedData = await mergeLatestStrategy(backups);
      break;
    case 'oldest':
      mergedData = await mergeOldestStrategy(backups);
      break;
    case 'priority':
      mergedData = await mergePriorityStrategy(backups, options.priorities);
      break;
    case 'selective':
      mergedData = await mergeSelectiveStrategy(backups, options.selections);
      break;
    default:
      throw new Error('Invalid merge strategy');
  }

  // Apply merged data to room
  const result = await db.$transaction(async (tx) => {
    // Update room information
    if (mergedData.room) {
      await tx.multiplayerRoom.update({
        where: { id: roomId },
        data: {
          state: mergedData.room.state,
          version: mergedData.room.version,
          settings: mergedData.room.settings,
          updatedAt: new Date()
        }
      });
    }

    // Apply puzzle state
    if (mergedData.puzzle && mergedData.puzzle.state) {
      // Clear existing puzzle state
      await tx.roomPuzzleState.deleteMany({
        where: { roomId }
      });

      // Apply merged puzzle state
      for (const cell of mergedData.puzzle.state) {
        await tx.roomPuzzleState.create({
          data: {
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

    // Apply messages
    if (mergedData.messages && mergedData.messages.length > 0) {
      // Clear existing messages
      await tx.roomMessage.deleteMany({
        where: { roomId }
      });

      // Apply merged messages
      for (const message of mergedData.messages) {
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

    // Apply participants
    if (mergedData.participants && mergedData.participants.length > 0) {
      // Clear existing participants
      await tx.roomParticipant.deleteMany({
        where: { roomId }
      });

      // Apply merged participants
      for (const participant of mergedData.participants) {
        await tx.roomParticipant.create({
          data: {
            roomId,
            userId: participant.id,
            role: participant.role,
            isActive: participant.isActive,
            lastSeen: participant.lastSeen ? new Date(participant.lastSeen) : new Date()
          }
        });
      }
    }

    // Log merge activity
    await tx.roomActivity.create({
      data: {
        roomId,
        userId,
        type: 'BACKUP_MERGED',
        description: `Merged ${backups.length} backups using ${mergeStrategy} strategy`,
        metadata: {
          backupIds,
          mergeStrategy,
          mergedAt: new Date(),
          createBackup,
          validate,
          conflictResolution
        }
      }
    });

    return {
      success: true,
      mergedAt: new Date(),
      backupIds,
      mergeStrategy,
      createBackup,
      validate,
      conflictResolution
    };
  });

  return result;
}

async function mergeLatestStrategy(backups: any[]) {
  // Sort backups by creation date (latest first)
  const sortedBackups = backups.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Use the latest backup as base
  const baseBackup = sortedBackups[0];
  const mergedData = { ...baseBackup.data };

  // Merge with other backups (overwriting with newer data)
  for (let i = 1; i < sortedBackups.length; i++) {
    const backup = sortedBackups[i];
    mergedData.room = { ...mergedData.room, ...backup.data.room };
    mergedData.puzzle = { ...mergedData.puzzle, ...backup.data.puzzle };
    mergedData.messages = [...(backup.data.messages || []), ...(mergedData.messages || [])];
    mergedData.participants = [...(backup.data.participants || []), ...(mergedData.participants || [])];
  }

  return mergedData;
}

async function mergeOldestStrategy(backups: any[]) {
  // Sort backups by creation date (oldest first)
  const sortedBackups = backups.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Use the oldest backup as base
  const baseBackup = sortedBackups[0];
  const mergedData = { ...baseBackup.data };

  // Merge with other backups (overwriting with older data)
  for (let i = 1; i < sortedBackups.length; i++) {
    const backup = sortedBackups[i];
    mergedData.room = { ...backup.data.room, ...mergedData.room };
    mergedData.puzzle = { ...backup.data.puzzle, ...mergedData.puzzle };
    mergedData.messages = [...(mergedData.messages || []), ...(backup.data.messages || [])];
    mergedData.participants = [...(mergedData.participants || []), ...(backup.data.participants || [])];
  }

  return mergedData;
}

async function mergePriorityStrategy(backups: any[], priorities: any[]) {
  if (!priorities || priorities.length !== backups.length) {
    throw new Error('Priorities must be provided for each backup');
  }

  // Sort backups by priority (highest first)
  const sortedBackups = backups.map((backup, index) => ({
    backup,
    priority: priorities[index]
  })).sort((a, b) => b.priority - a.priority);

  // Use the highest priority backup as base
  const baseBackup = sortedBackups[0].backup;
  const mergedData = { ...baseBackup.data };

  // Merge with other backups based on priority
  for (let i = 1; i < sortedBackups.length; i++) {
    const { backup, priority } = sortedBackups[i];
    
    // Only merge if priority is high enough
    if (priority > 0) {
      mergedData.room = { ...mergedData.room, ...backup.data.room };
      mergedData.puzzle = { ...mergedData.puzzle, ...backup.data.puzzle };
      mergedData.messages = [...(backup.data.messages || []), ...(mergedData.messages || [])];
      mergedData.participants = [...(backup.data.participants || []), ...(mergedData.participants || [])];
    }
  }

  return mergedData;
}

async function mergeSelectiveStrategy(backups: any[], selections: any[]) {
  if (!selections || selections.length !== backups.length) {
    throw new Error('Selections must be provided for each backup');
  }

  const mergedData = {
    room: {},
    puzzle: { state: [] },
    messages: [],
    participants: []
  };

  // Merge selected parts from each backup
  for (let i = 0; i < backups.length; i++) {
    const backup = backups[i];
    const selection = selections[i];

    if (selection.room) {
      mergedData.room = { ...mergedData.room, ...backup.data.room };
    }

    if (selection.puzzle) {
      mergedData.puzzle = { ...mergedData.puzzle, ...backup.data.puzzle };
    }

    if (selection.messages) {
      mergedData.messages = [...mergedData.messages, ...(backup.data.messages || [])];
    }

    if (selection.participants) {
      mergedData.participants = [...mergedData.participants, ...(backup.data.participants || [])];
    }
  }

  return mergedData;
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

  // Validate puzzle data
  if (data.puzzle && data.puzzle.state) {
    if (!Array.isArray(data.puzzle.state)) {
      validation.isValid = false;
      validation.errors.push('Invalid puzzle state format');
    }
  }

  // Validate messages data
  if (data.messages) {
    if (!Array.isArray(data.messages)) {
      validation.isValid = false;
      validation.errors.push('Invalid messages format');
    }
  }

  // Validate participants data
  if (data.participants) {
    if (!Array.isArray(data.participants)) {
      validation.isValid = false;
      validation.errors.push('Invalid participants format');
    }
  }

  return validation;
}

async function createMergeBackup(roomId: string, userId: string) {
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
      type: 'MERGE_BACKUP'
    }
  };

  // Calculate backup size
  const backupSize = JSON.stringify(backupData).length;

  // Create backup record
  const backup = await db.roomRecoveryBackup.create({
    data: {
      roomId,
      userId,
      name: `Merge Backup ${new Date().toLocaleString()}`,
      type: 'MERGE_BACKUP',
      data: backupData,
      size: backupSize,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });

  return backup;
}
