/**
 * API endpoints for room state backup statistics
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
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

    // Get backup statistics
    const stats = await getBackupStatistics(roomId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching backup statistics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getBackupStatistics(roomId: string) {
  // Get total backup count
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  // Get active backup count
  const activeBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { gt: new Date() },
      isCorrupted: false
    }
  });

  // Get expired backup count
  const expiredBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { lte: new Date() }
    }
  });

  // Get corrupted backup count
  const corruptedBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      isCorrupted: true
    }
  });

  // Get total backup size
  const totalSize = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _sum: { size: true }
  });

  // Get backup types
  const backupTypes = await db.roomRecoveryBackup.groupBy({
    by: ['type'],
    where: { roomId },
    _count: { type: true },
    _sum: { size: true }
  });

  // Get recent backup activity
  const recentActivity = await db.roomActivity.findMany({
    where: {
      roomId,
      type: { in: ['BACKUP_CREATED', 'BACKUP_RESTORED', 'BACKUP_DELETED', 'BACKUP_UPLOADED'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      type: true,
      description: true,
      createdAt: true,
      metadata: true
    }
  });

  // Get backup creation trends
  const creationTrends = await db.roomRecoveryBackup.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    },
    _count: { id: true },
    _sum: { size: true }
  });

  // Get backup size distribution
  const sizeDistribution = await db.roomRecoveryBackup.findMany({
    where: { roomId },
    select: { size: true, type: true },
    orderBy: { size: 'desc' }
  });

  // Calculate statistics
  const stats = {
    overview: {
      total: totalBackups,
      active: activeBackups,
      expired: expiredBackups,
      corrupted: corruptedBackups,
      totalSize: totalSize._sum.size || 0
    },
    types: backupTypes.map(type => ({
      type: type.type,
      count: type._count.type,
      totalSize: type._sum.size || 0
    })),
    recentActivity: recentActivity.map(activity => ({
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      metadata: activity.metadata
    })),
    trends: {
      creationTrends: creationTrends.map(trend => ({
        date: trend.createdAt,
        count: trend._count.id,
        totalSize: trend._sum.size || 0
      })),
      sizeDistribution: sizeDistribution.map(backup => ({
        size: backup.size,
        type: backup.type
      }))
    },
    health: {
      activePercentage: totalBackups > 0 ? Math.round((activeBackups / totalBackups) * 100) : 0,
      corruptionRate: totalBackups > 0 ? Math.round((corruptedBackups / totalBackups) * 100) : 0,
      averageSize: totalBackups > 0 ? Math.round((totalSize._sum.size || 0) / totalBackups) : 0
    }
  };

  return stats;
}
