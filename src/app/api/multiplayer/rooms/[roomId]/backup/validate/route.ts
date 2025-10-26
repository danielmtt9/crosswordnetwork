/**
 * API endpoints for room state backup validation
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
    const { data } = body;

    if (!data) {
      return new NextResponse('Data is required', { status: 400 });
    }

    // Validate backup data
    const validation = await validateBackupData(roomId, data);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function validateBackupData(roomId: string, data: any) {
  const validation = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    compatibility: {
      version: false,
      structure: false,
      data: false
    }
  };

  // Basic structure validation
  if (!data || typeof data !== 'object') {
    validation.isValid = false;
    validation.errors.push('Invalid data format');
    return validation;
  }

  // Check for required fields
  if (!data.room) {
    validation.isValid = false;
    validation.errors.push('Missing room data');
  } else {
    // Validate room data
    if (!data.room.state) {
      validation.isValid = false;
      validation.errors.push('Missing room state');
    }

    if (!data.room.version) {
      validation.isValid = false;
      validation.errors.push('Missing room version');
    }

    if (!data.room.settings) {
      validation.warnings.push('Missing room settings');
    }
  }

  if (!data.puzzle) {
    validation.isValid = false;
    validation.errors.push('Missing puzzle data');
  } else {
    // Validate puzzle data
    if (!Array.isArray(data.puzzle.state)) {
      validation.isValid = false;
      validation.errors.push('Invalid puzzle state format');
    } else {
      // Validate puzzle state structure
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

  if (!data.messages) {
    validation.isValid = false;
    validation.errors.push('Missing messages data');
  } else {
    // Validate messages data
    if (!Array.isArray(data.messages)) {
      validation.isValid = false;
      validation.errors.push('Invalid messages format');
    } else {
      // Validate message structure
      for (const message of data.messages) {
        if (!message.id || typeof message.id !== 'string') {
          validation.isValid = false;
          validation.errors.push('Invalid message ID');
          break;
        }

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

        if (!message.createdAt || !(message.createdAt instanceof Date || typeof message.createdAt === 'string')) {
          validation.isValid = false;
          validation.errors.push('Invalid message timestamp');
          break;
        }
      }
    }
  }

  // Check metadata
  if (!data.metadata) {
    validation.warnings.push('Missing metadata');
  } else {
    if (!data.metadata.createdAt) {
      validation.warnings.push('Missing creation timestamp');
    }

    if (!data.metadata.createdBy) {
      validation.warnings.push('Missing creator information');
    }
  }

  // Check compatibility with current room
  if (validation.isValid) {
    try {
      // Get current room state
      const currentRoom = await db.multiplayerRoom.findUnique({
        where: { id: roomId },
        select: {
          state: true,
          version: true,
          settings: true
        }
      });

      if (currentRoom) {
        // Check version compatibility
        if (data.room.version === currentRoom.version) {
          validation.compatibility.version = true;
        } else {
          validation.warnings.push('Version mismatch with current room');
        }

        // Check structure compatibility
        if (data.room.state && typeof data.room.state === 'object') {
          validation.compatibility.structure = true;
        }

        // Check data compatibility
        if (data.puzzle.state && data.messages) {
          validation.compatibility.data = true;
        }
      }
    } catch (error) {
      validation.warnings.push('Could not verify compatibility with current room');
    }
  }

  return validation;
}
