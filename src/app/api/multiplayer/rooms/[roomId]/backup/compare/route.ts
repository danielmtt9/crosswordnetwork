/**
 * API endpoints for room state backup comparison
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
    const { backupIds, compareWithCurrent = false } = body;

    if (!backupIds || !Array.isArray(backupIds) || backupIds.length < 2) {
      return new NextResponse('At least 2 backup IDs are required', { status: 400 });
    }

    // Compare backups
    const comparison = await compareBackups(roomId, backupIds, compareWithCurrent);

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error comparing backups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function compareBackups(
  roomId: string, 
  backupIds: string[], 
  compareWithCurrent: boolean
) {
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
      size: true,
      createdAt: true,
      data: true
    }
  });

  if (backups.length !== backupIds.length) {
    throw new Error('One or more backups not found');
  }

  // Get current room state if requested
  let currentState = null;
  if (compareWithCurrent) {
    currentState = await getCurrentRoomState(roomId);
  }

  // Compare backups
  const comparisons = [];
  
  for (let i = 0; i < backups.length; i++) {
    for (let j = i + 1; j < backups.length; j++) {
      const comparison = await compareTwoBackups(backups[i], backups[j]);
      comparisons.push(comparison);
    }
  }

  // Compare with current state if requested
  if (currentState) {
    for (const backup of backups) {
      const comparison = await compareBackupWithCurrent(backup, currentState);
      comparisons.push(comparison);
    }
  }

  return {
    comparisons,
    backups: backups.map(backup => ({
      id: backup.id,
      name: backup.name,
      type: backup.type,
      size: backup.size,
      createdAt: backup.createdAt
    })),
    currentState: currentState ? {
      version: currentState.version,
      lastUpdated: currentState.updatedAt
    } : null
  };
}

async function compareTwoBackups(backup1: any, backup2: any) {
  const data1 = backup1.data;
  const data2 = backup2.data;

  const comparison = {
    backup1: {
      id: backup1.id,
      name: backup1.name,
      createdAt: backup1.createdAt
    },
    backup2: {
      id: backup2.id,
      name: backup2.name,
      createdAt: backup2.createdAt
    },
    differences: {
      room: compareRoomData(data1.room, data2.room),
      puzzle: comparePuzzleData(data1.puzzle, data2.puzzle),
      messages: compareMessagesData(data1.messages, data2.messages),
      participants: compareParticipantsData(data1.participants, data2.participants)
    },
    summary: {
      totalDifferences: 0,
      hasDifferences: false
    }
  };

  // Calculate summary
  const differences = comparison.differences;
  comparison.summary.totalDifferences = 
    differences.room.differences.length +
    differences.puzzle.differences.length +
    differences.messages.differences.length +
    differences.participants.differences.length;
  
  comparison.summary.hasDifferences = comparison.summary.totalDifferences > 0;

  return comparison;
}

async function compareBackupWithCurrent(backup: any, currentState: any) {
  const backupData = backup.data;

  const comparison = {
    backup: {
      id: backup.id,
      name: backup.name,
      createdAt: backup.createdAt
    },
    current: {
      version: currentState.version,
      lastUpdated: currentState.updatedAt
    },
    differences: {
      room: compareRoomData(backupData.room, currentState.room),
      puzzle: comparePuzzleData(backupData.puzzle, currentState.puzzle),
      messages: compareMessagesData(backupData.messages, currentState.messages),
      participants: compareParticipantsData(backupData.participants, currentState.participants)
    },
    summary: {
      totalDifferences: 0,
      hasDifferences: false
    }
  };

  // Calculate summary
  const differences = comparison.differences;
  comparison.summary.totalDifferences = 
    differences.room.differences.length +
    differences.puzzle.differences.length +
    differences.messages.differences.length +
    differences.participants.differences.length;
  
  comparison.summary.hasDifferences = comparison.summary.totalDifferences > 0;

  return comparison;
}

function compareRoomData(room1: any, room2: any) {
  const differences = [];

  if (!room1 || !room2) {
    differences.push({
      field: 'room',
      type: 'missing',
      message: 'One or both room data is missing'
    });
    return { differences, hasDifferences: differences.length > 0 };
  }

  // Compare room name
  if (room1.name !== room2.name) {
    differences.push({
      field: 'name',
      type: 'changed',
      oldValue: room1.name,
      newValue: room2.name
    });
  }

  // Compare room version
  if (room1.version !== room2.version) {
    differences.push({
      field: 'version',
      type: 'changed',
      oldValue: room1.version,
      newValue: room2.version
    });
  }

  // Compare room state
  if (JSON.stringify(room1.state) !== JSON.stringify(room2.state)) {
    differences.push({
      field: 'state',
      type: 'changed',
      message: 'Room state has changed'
    });
  }

  // Compare room settings
  if (JSON.stringify(room1.settings) !== JSON.stringify(room2.settings)) {
    differences.push({
      field: 'settings',
      type: 'changed',
      message: 'Room settings have changed'
    });
  }

  return { differences, hasDifferences: differences.length > 0 };
}

function comparePuzzleData(puzzle1: any, puzzle2: any) {
  const differences = [];

  if (!puzzle1 || !puzzle2) {
    differences.push({
      field: 'puzzle',
      type: 'missing',
      message: 'One or both puzzle data is missing'
    });
    return { differences, hasDifferences: differences.length > 0 };
  }

  const state1 = puzzle1.state || [];
  const state2 = puzzle2.state || [];

  // Compare puzzle state length
  if (state1.length !== state2.length) {
    differences.push({
      field: 'puzzle_state_count',
      type: 'changed',
      oldValue: state1.length,
      newValue: state2.length
    });
  }

  // Compare individual cells
  const cellDifferences = [];
  const maxLength = Math.max(state1.length, state2.length);

  for (let i = 0; i < maxLength; i++) {
    const cell1 = state1[i];
    const cell2 = state2[i];

    if (!cell1 || !cell2) {
      cellDifferences.push({
        index: i,
        type: 'missing',
        message: 'Cell is missing in one of the states'
      });
      continue;
    }

    if (cell1.cellId !== cell2.cellId) {
      cellDifferences.push({
        index: i,
        field: 'cellId',
        type: 'changed',
        oldValue: cell1.cellId,
        newValue: cell2.cellId
      });
    }

    if (cell1.value !== cell2.value) {
      cellDifferences.push({
        index: i,
        field: 'value',
        type: 'changed',
        oldValue: cell1.value,
        newValue: cell2.value
      });
    }

    if (cell1.isCompleted !== cell2.isCompleted) {
      cellDifferences.push({
        index: i,
        field: 'isCompleted',
        type: 'changed',
        oldValue: cell1.isCompleted,
        newValue: cell2.isCompleted
      });
    }

    if (cell1.attempts !== cell2.attempts) {
      cellDifferences.push({
        index: i,
        field: 'attempts',
        type: 'changed',
        oldValue: cell1.attempts,
        newValue: cell2.attempts
      });
    }

    if (cell1.hintsUsed !== cell2.hintsUsed) {
      cellDifferences.push({
        index: i,
        field: 'hintsUsed',
        type: 'changed',
        oldValue: cell1.hintsUsed,
        newValue: cell2.hintsUsed
      });
    }
  }

  if (cellDifferences.length > 0) {
    differences.push({
      field: 'puzzle_cells',
      type: 'changed',
      message: `${cellDifferences.length} cells have differences`,
      details: cellDifferences
    });
  }

  return { differences, hasDifferences: differences.length > 0 };
}

function compareMessagesData(messages1: any, messages2: any) {
  const differences = [];

  if (!messages1 || !messages2) {
    differences.push({
      field: 'messages',
      type: 'missing',
      message: 'One or both messages data is missing'
    });
    return { differences, hasDifferences: differences.length > 0 };
  }

  // Compare message count
  if (messages1.length !== messages2.length) {
    differences.push({
      field: 'message_count',
      type: 'changed',
      oldValue: messages1.length,
      newValue: messages2.length
    });
  }

  // Compare individual messages
  const messageDifferences = [];
  const maxLength = Math.max(messages1.length, messages2.length);

  for (let i = 0; i < maxLength; i++) {
    const message1 = messages1[i];
    const message2 = messages2[i];

    if (!message1 || !message2) {
      messageDifferences.push({
        index: i,
        type: 'missing',
        message: 'Message is missing in one of the states'
      });
      continue;
    }

    if (message1.id !== message2.id) {
      messageDifferences.push({
        index: i,
        field: 'id',
        type: 'changed',
        oldValue: message1.id,
        newValue: message2.id
      });
    }

    if (message1.content !== message2.content) {
      messageDifferences.push({
        index: i,
        field: 'content',
        type: 'changed',
        oldValue: message1.content,
        newValue: message2.content
      });
    }

    if (message1.type !== message2.type) {
      messageDifferences.push({
        index: i,
        field: 'type',
        type: 'changed',
        oldValue: message1.type,
        newValue: message2.type
      });
    }
  }

  if (messageDifferences.length > 0) {
    differences.push({
      field: 'messages',
      type: 'changed',
      message: `${messageDifferences.length} messages have differences`,
      details: messageDifferences
    });
  }

  return { differences, hasDifferences: differences.length > 0 };
}

function compareParticipantsData(participants1: any, participants2: any) {
  const differences = [];

  if (!participants1 || !participants2) {
    differences.push({
      field: 'participants',
      type: 'missing',
      message: 'One or both participants data is missing'
    });
    return { differences, hasDifferences: differences.length > 0 };
  }

  // Compare participant count
  if (participants1.length !== participants2.length) {
    differences.push({
      field: 'participant_count',
      type: 'changed',
      oldValue: participants1.length,
      newValue: participants2.length
    });
  }

  // Compare individual participants
  const participantDifferences = [];
  const maxLength = Math.max(participants1.length, participants2.length);

  for (let i = 0; i < maxLength; i++) {
    const participant1 = participants1[i];
    const participant2 = participants2[i];

    if (!participant1 || !participant2) {
      participantDifferences.push({
        index: i,
        type: 'missing',
        message: 'Participant is missing in one of the states'
      });
      continue;
    }

    if (participant1.id !== participant2.id) {
      participantDifferences.push({
        index: i,
        field: 'id',
        type: 'changed',
        oldValue: participant1.id,
        newValue: participant2.id
      });
    }

    if (participant1.role !== participant2.role) {
      participantDifferences.push({
        index: i,
        field: 'role',
        type: 'changed',
        oldValue: participant1.role,
        newValue: participant2.role
      });
    }

    if (participant1.isActive !== participant2.isActive) {
      participantDifferences.push({
        index: i,
        field: 'isActive',
        type: 'changed',
        oldValue: participant1.isActive,
        newValue: participant2.isActive
      });
    }
  }

  if (participantDifferences.length > 0) {
    differences.push({
      field: 'participants',
      type: 'changed',
      message: `${participantDifferences.length} participants have differences`,
      details: participantDifferences
    });
  }

  return { differences, hasDifferences: differences.length > 0 };
}

async function getCurrentRoomState(roomId: string) {
  // Get current room state
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      state: true,
      version: true,
      settings: true,
      updatedAt: true
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
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      content: true,
      type: true,
      createdAt: true
    }
  });

  // Get current participants
  const participants = await db.roomParticipant.findMany({
    where: { roomId },
    select: {
      userId: true,
      role: true,
      isActive: true
    }
  });

  return {
    room: {
      state: room.state,
      version: room.version,
      settings: room.settings
    },
    puzzle: {
      state: puzzleState
    },
    messages: messages,
    participants: participants,
    version: room.version,
    updatedAt: room.updatedAt
  };
}
