/**
 * API endpoints for room state backup cleanup
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
    const { action, options } = body;

    let result;
    switch (action) {
      case 'cleanup_expired':
        result = await cleanupExpiredBackups(roomId);
        break;
      case 'cleanup_old':
        result = await cleanupOldBackups(roomId, options);
        break;
      case 'cleanup_all':
        result = await cleanupAllBackups(roomId);
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error cleaning up backups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function cleanupExpiredBackups(roomId: string) {
  const now = new Date();
  
  // Find expired backups
  const expiredBackups = await db.roomRecoveryBackup.findMany({
    where: {
      roomId,
      expiresAt: { lt: now }
    },
    select: { id: true, name: true, size: true }
  });

  if (expiredBackups.length === 0) {
    return {
      action: 'cleanup_expired',
      deleted: 0,
      freedSpace: 0,
      message: 'No expired backups found'
    };
  }

  // Delete expired backups
  const deleteResult = await db.roomRecoveryBackup.deleteMany({
    where: {
      roomId,
      expiresAt: { lt: now }
    }
  });

  // Calculate freed space
  const freedSpace = expiredBackups.reduce((total, backup) => total + backup.size, 0);

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId: 'system',
      type: 'BACKUP_CLEANUP',
      description: `Cleaned up ${deleteResult.count} expired backups`,
      metadata: {
        action: 'cleanup_expired',
        deletedCount: deleteResult.count,
        freedSpace
      }
    }
  });

  return {
    action: 'cleanup_expired',
    deleted: deleteResult.count,
    freedSpace,
    message: `Deleted ${deleteResult.count} expired backups`
  };
}

async function cleanupOldBackups(roomId: string, options: any) {
  const { keepCount = 5, olderThanDays = 7 } = options || {};
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  // Get all backups ordered by creation date
  const allBackups = await db.roomRecoveryBackup.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, size: true, createdAt: true }
  });

  // Keep the most recent backups
  const backupsToKeep = allBackups.slice(0, keepCount);
  const backupsToDelete = allBackups.slice(keepCount);

  // Filter out backups that are too recent
  const oldBackupsToDelete = backupsToDelete.filter(backup => 
    backup.createdAt < cutoffDate
  );

  if (oldBackupsToDelete.length === 0) {
    return {
      action: 'cleanup_old',
      deleted: 0,
      freedSpace: 0,
      message: 'No old backups found to delete'
    };
  }

  // Delete old backups
  const deleteResult = await db.roomRecoveryBackup.deleteMany({
    where: {
      roomId,
      id: { in: oldBackupsToDelete.map(b => b.id) }
    }
  });

  // Calculate freed space
  const freedSpace = oldBackupsToDelete.reduce((total, backup) => total + backup.size, 0);

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId: 'system',
      type: 'BACKUP_CLEANUP',
      description: `Cleaned up ${deleteResult.count} old backups`,
      metadata: {
        action: 'cleanup_old',
        deletedCount: deleteResult.count,
        freedSpace,
        keepCount,
        olderThanDays
      }
    }
  });

  return {
    action: 'cleanup_old',
    deleted: deleteResult.count,
    freedSpace,
    message: `Deleted ${deleteResult.count} old backups`
  };
}

async function cleanupAllBackups(roomId: string) {
  // Get all backups
  const allBackups = await db.roomRecoveryBackup.findMany({
    where: { roomId },
    select: { id: true, name: true, size: true }
  });

  if (allBackups.length === 0) {
    return {
      action: 'cleanup_all',
      deleted: 0,
      freedSpace: 0,
      message: 'No backups found'
    };
  }

  // Delete all backups
  const deleteResult = await db.roomRecoveryBackup.deleteMany({
    where: { roomId }
  });

  // Calculate freed space
  const freedSpace = allBackups.reduce((total, backup) => total + backup.size, 0);

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId: 'system',
      type: 'BACKUP_CLEANUP',
      description: `Cleaned up all ${deleteResult.count} backups`,
      metadata: {
        action: 'cleanup_all',
        deletedCount: deleteResult.count,
        freedSpace
      }
    }
  });

  return {
    action: 'cleanup_all',
    deleted: deleteResult.count,
    freedSpace,
    message: `Deleted all ${deleteResult.count} backups`
  };
}
