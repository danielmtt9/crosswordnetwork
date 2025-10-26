/**
 * API endpoints for room state backup restoration
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { roomId: string; backupId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId, backupId } = params;

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

    // Get backup
    const backup = await db.roomRecoveryBackup.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      return new NextResponse('Backup not found', { status: 404 });
    }

    if (backup.roomId !== roomId) {
      return new NextResponse('Backup does not belong to this room', { status: 400 });
    }

    return NextResponse.json({
      id: backup.id,
      name: backup.name,
      type: backup.type,
      size: backup.size,
      createdAt: backup.createdAt,
      expiresAt: backup.expiresAt,
      isExpired: backup.isExpired,
      isCorrupted: backup.isCorrupted,
      metadata: backup.metadata
    });
  } catch (error) {
    console.error('Error fetching backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { roomId: string; backupId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId, backupId } = params;

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

    // Restore backup
    const result = await restoreRoomBackup(roomId, backupId, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error restoring backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { roomId: string; backupId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId, backupId } = params;

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
    await deleteRoomBackup(backupId, roomId);

    return new NextResponse('Backup deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function restoreRoomBackup(roomId: string, backupId: string, userId: string) {
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

  // Restore room state
  const backupData = backup.data as any;
  
  await db.$transaction(async (tx) => {
    // Update room state
    await tx.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        state: backupData.room.state,
        version: backupData.room.version,
        settings: backupData.room.settings,
        updatedAt: new Date()
      }
    });

    // Restore puzzle state
    if (backupData.puzzle?.state) {
      // Clear existing puzzle state
      await tx.roomPuzzleState.deleteMany({
        where: { roomId }
      });

      // Restore puzzle state
      await tx.roomPuzzleState.createMany({
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

    // Log activity
    await tx.roomActivity.create({
      data: {
        roomId,
        userId,
        type: 'BACKUP_RESTORED',
        description: `Backup restored: ${backup.name}`,
        metadata: {
          backupId: backup.id,
          restoredAt: new Date()
        }
      }
    });
  });

  return {
    success: true,
    restoredAt: new Date(),
    backupId: backup.id,
    backupName: backup.name
  };
}

async function deleteRoomBackup(backupId: string, roomId: string) {
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
