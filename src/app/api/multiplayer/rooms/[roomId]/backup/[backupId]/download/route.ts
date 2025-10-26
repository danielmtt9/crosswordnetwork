/**
 * API endpoints for room state backup download
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

    if (backup.isExpired) {
      return new NextResponse('Backup has expired', { status: 410 });
    }

    if (backup.isCorrupted) {
      return new NextResponse('Backup is corrupted', { status: 422 });
    }

    // Log download activity
    await db.roomActivity.create({
      data: {
        roomId,
        userId: session.user.id,
        type: 'BACKUP_DOWNLOADED',
        description: `Backup downloaded: ${backup.name}`,
        metadata: {
          backupId: backup.id,
          backupSize: backup.size
        }
      }
    });

    // Return backup data as JSON
    return new NextResponse(JSON.stringify(backup.data), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${backup.name}.json"`,
        'Content-Length': backup.size.toString()
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
