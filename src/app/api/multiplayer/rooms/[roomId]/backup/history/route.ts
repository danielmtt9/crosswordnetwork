/**
 * API endpoints for room state backup history
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const status = searchParams.get('status');

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

    // Get backup history
    const history = await getBackupHistory(roomId, { limit, offset, type, status });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching backup history:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getBackupHistory(
  roomId: string, 
  options: {
    limit: number;
    offset: number;
    type?: string;
    status?: string;
  }
) {
  const { limit, offset, type, status } = options;

  // Build where clause
  const whereClause: any = { roomId };
  
  if (type) {
    whereClause.type = type;
  }
  
  if (status) {
    if (status === 'active') {
      whereClause.expiresAt = { gt: new Date() };
      whereClause.isCorrupted = false;
    } else if (status === 'expired') {
      whereClause.expiresAt = { lte: new Date() };
    } else if (status === 'corrupted') {
      whereClause.isCorrupted = true;
    }
  }

  // Get backup history
  const backups = await db.roomRecoveryBackup.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      createdAt: true,
      expiresAt: true,
      isExpired: true,
      isCorrupted: true,
      metadata: true
    }
  });

  // Get total count
  const totalCount = await db.roomRecoveryBackup.count({
    where: whereClause
  });

  // Get backup statistics
  const stats = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _count: { id: true },
    _sum: { size: true },
    _avg: { size: true }
  });

  // Get backup types
  const types = await db.roomRecoveryBackup.groupBy({
    by: ['type'],
    where: { roomId },
    _count: { type: true }
  });

  // Get recent activity
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

  return {
    backups: backups.map(backup => ({
      id: backup.id,
      name: backup.name,
      type: backup.type,
      size: backup.size,
      createdAt: backup.createdAt,
      expiresAt: backup.expiresAt,
      isExpired: backup.isExpired,
      isCorrupted: backup.isCorrupted,
      metadata: backup.metadata
    })),
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    },
    statistics: {
      total: stats._count.id,
      totalSize: stats._sum.size || 0,
      averageSize: Math.round(stats._avg.size || 0),
      types: types.map(type => ({
        type: type.type,
        count: type._count.type
      }))
    },
    recentActivity: recentActivity.map(activity => ({
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      metadata: activity.metadata
    }))
  };
}
