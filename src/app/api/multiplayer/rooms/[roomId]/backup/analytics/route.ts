/**
 * API endpoints for room state backup analytics
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
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    const includeDetails = searchParams.get('includeDetails') === 'true';

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

    // Get backup analytics
    const analytics = await getBackupAnalytics(roomId, timeRange, includeDetails);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching backup analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getBackupAnalytics(roomId: string, timeRange: string, includeDetails: boolean) {
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '1d':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Get backup analytics
  const analytics = await getBackupAnalyticsData(roomId, startTime, now, includeDetails);

  return analytics;
}

async function getBackupAnalyticsData(
  roomId: string, 
  startTime: Date, 
  endTime: Date,
  includeDetails: boolean
) {
  // Get backup overview
  const overview = await getBackupOverview(roomId, startTime, endTime);

  // Get backup trends
  const trends = await getBackupTrends(roomId, startTime, endTime);

  // Get backup performance
  const performance = await getBackupPerformance(roomId, startTime, endTime);

  // Get backup health
  const health = await getBackupHealth(roomId, startTime, endTime);

  // Get backup insights
  const insights = await getBackupInsights(roomId, startTime, endTime);

  // Get detailed analytics if requested
  let details = null;
  if (includeDetails) {
    details = await getDetailedBackupAnalytics(roomId, startTime, endTime);
  }

  return {
    overview,
    trends,
    performance,
    health,
    insights,
    details,
    timeRange: {
      start: startTime,
      end: endTime
    }
  };
}

async function getBackupOverview(roomId: string, startTime: Date, endTime: Date) {
  // Get total backups
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  // Get active backups
  const activeBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { gt: endTime },
      isCorrupted: false
    }
  });

  // Get recent backups
  const recentBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  // Get total size
  const totalSize = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _sum: { size: true }
  });

  // Get average size
  const averageSize = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _avg: { size: true }
  });

  // Get backup types
  const backupTypes = await db.roomRecoveryBackup.groupBy({
    by: ['type'],
    where: { roomId },
    _count: { type: true },
    _sum: { size: true }
  });

  return {
    total: totalBackups,
    active: activeBackups,
    recent: recentBackups,
    totalSize: totalSize._sum.size || 0,
    averageSize: Math.round(averageSize._avg.size || 0),
    types: backupTypes.map(type => ({
      type: type.type,
      count: type._count.type,
      totalSize: type._sum.size || 0
    }))
  };
}

async function getBackupTrends(roomId: string, startTime: Date, endTime: Date) {
  // Get backup creation trends
  const creationTrends = await db.roomRecoveryBackup.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _count: { id: true },
    _sum: { size: true }
  });

  // Get backup type trends
  const typeTrends = await db.roomRecoveryBackup.groupBy({
    by: ['type', 'createdAt'],
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _count: { type: true }
  });

  // Get backup size trends
  const sizeTrends = await db.roomRecoveryBackup.findMany({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      size: true,
      createdAt: true,
      type: true
    }
  });

  return {
    creation: creationTrends.map(trend => ({
      date: trend.createdAt,
      count: trend._count.id,
      totalSize: trend._sum.size || 0
    })),
    types: typeTrends.map(trend => ({
      type: trend.type,
      date: trend.createdAt,
      count: trend._count.type
    })),
    sizes: sizeTrends.map(trend => ({
      size: trend.size,
      date: trend.createdAt,
      type: trend.type
    }))
  };
}

async function getBackupPerformance(roomId: string, startTime: Date, endTime: Date) {
  // Get backup creation frequency
  const creationFrequency = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  // Get backup success rate
  const totalBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  const successfulBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime },
      isCorrupted: false
    }
  });

  const successRate = totalBackups > 0 ? (successfulBackups / totalBackups) * 100 : 100;

  // Get backup restoration rate
  const restorationRate = await getBackupRestorationRate(roomId, startTime, endTime);

  // Get backup efficiency
  const efficiency = await getBackupEfficiency(roomId, startTime, endTime);

  return {
    creationFrequency,
    successRate: Math.round(successRate * 100) / 100,
    restorationRate,
    efficiency
  };
}

async function getBackupHealth(roomId: string, startTime: Date, endTime: Date) {
  // Get health metrics
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  const activeBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { gt: endTime },
      isCorrupted: false
    }
  });

  const expiredBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { lte: endTime }
    }
  });

  const corruptedBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      isCorrupted: true
    }
  });

  // Calculate health score
  const healthScore = calculateHealthScore(
    totalBackups,
    activeBackups,
    expiredBackups,
    corruptedBackups
  );

  // Get health trends
  const healthTrends = await getHealthTrends(roomId, startTime, endTime);

  return {
    score: healthScore,
    status: healthScore >= 75 ? 'HEALTHY' : healthScore >= 50 ? 'WARNING' : 'CRITICAL',
    total: totalBackups,
    active: activeBackups,
    expired: expiredBackups,
    corrupted: corruptedBackups,
    trends: healthTrends
  };
}

async function getBackupInsights(roomId: string, startTime: Date, endTime: Date) {
  const insights = [];

  // Get backup patterns
  const patterns = await getBackupPatterns(roomId, startTime, endTime);

  // Get backup anomalies
  const anomalies = await getBackupAnomalies(roomId, startTime, endTime);

  // Get backup recommendations
  const recommendations = await getBackupRecommendations(roomId, startTime, endTime);

  // Get backup predictions
  const predictions = await getBackupPredictions(roomId, startTime, endTime);

  return {
    patterns,
    anomalies,
    recommendations,
    predictions
  };
}

async function getDetailedBackupAnalytics(roomId: string, startTime: Date, endTime: Date) {
  // Get detailed backup information
  const backups = await db.roomRecoveryBackup.findMany({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    orderBy: { createdAt: 'desc' },
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

  // Get backup activities
  const activities = await db.roomActivity.findMany({
    where: {
      roomId,
      type: { in: ['BACKUP_CREATED', 'BACKUP_RESTORED', 'BACKUP_DELETED', 'BACKUP_UPLOADED'] },
      createdAt: { gte: startTime, lte: endTime }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      type: true,
      description: true,
      createdAt: true,
      metadata: true
    }
  });

  // Get backup schedules
  const schedules = await db.roomBackupSchedule.findMany({
    where: { roomId },
    select: {
      id: true,
      name: true,
      type: true,
      frequency: true,
      interval: true,
      isActive: true,
      lastRun: true,
      nextRun: true
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
    activities: activities.map(activity => ({
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      metadata: activity.metadata
    })),
    schedules: schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      type: schedule.type,
      frequency: schedule.frequency,
      interval: schedule.interval,
      isActive: schedule.isActive,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun
    }))
  };
}

// Helper functions for analytics
async function getBackupRestorationRate(roomId: string, startTime: Date, endTime: Date): Promise<number> {
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  const restoredBackups = await db.roomActivity.count({
    where: {
      roomId,
      type: 'BACKUP_RESTORED',
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  return totalBackups > 0 ? (restoredBackups / totalBackups) * 100 : 0;
}

async function getBackupEfficiency(roomId: string, startTime: Date, endTime: Date) {
  // Get backup size statistics
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _sum: { size: true },
    _avg: { size: true }
  });

  // Get backup count
  const backupCount = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  // Calculate efficiency metrics
  const totalSize = sizeStats._sum.size || 0;
  const averageSize = sizeStats._avg.size || 0;
  const sizeEfficiency = totalSize > 0 ? (averageSize / totalSize) * 100 : 0;

  return {
    totalSize,
    averageSize,
    sizeEfficiency: Math.round(sizeEfficiency * 100) / 100,
    backupCount
  };
}

async function getHealthTrends(roomId: string, startTime: Date, endTime: Date) {
  // Get health trends over time
  const trends = await db.roomRecoveryBackup.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _count: { id: true }
  });

  return trends.map(trend => ({
    date: trend.createdAt,
    count: trend._count.id
  }));
}

async function getBackupPatterns(roomId: string, startTime: Date, endTime: Date) {
  const patterns = [];

  // Get backup creation patterns
  const creationPatterns = await db.roomRecoveryBackup.groupBy({
    by: ['type'],
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _count: { type: true }
  });

  // Analyze patterns
  const totalBackups = creationPatterns.reduce((sum, pattern) => sum + pattern._count.type, 0);
  
  for (const pattern of creationPatterns) {
    const percentage = totalBackups > 0 ? (pattern._count.type / totalBackups) * 100 : 0;
    
    if (percentage > 50) {
      patterns.push({
        type: 'DOMINANT_TYPE',
        message: `${pattern.type} backups dominate (${percentage.toFixed(1)}%)`,
        severity: 'INFO'
      });
    }
  }

  return patterns;
}

async function getBackupAnomalies(roomId: string, startTime: Date, endTime: Date) {
  const anomalies = [];

  // Check for unusual backup sizes
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _avg: { size: true },
    _stddev: { size: true }
  });

  const averageSize = sizeStats._avg.size || 0;
  const stdDev = sizeStats._stddev.size || 0;
  const threshold = averageSize + (2 * stdDev);

  const largeBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      size: { gt: threshold },
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  if (largeBackups > 0) {
    anomalies.push({
      type: 'UNUSUAL_SIZE',
      message: `${largeBackups} backups are unusually large`,
      severity: 'WARNING'
    });
  }

  // Check for unusual backup frequency
  const backupCount = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  const daysInRange = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
  const averageFrequency = backupCount / daysInRange;

  if (averageFrequency > 10) {
    anomalies.push({
      type: 'HIGH_FREQUENCY',
      message: `Unusually high backup frequency (${averageFrequency.toFixed(1)} per day)`,
      severity: 'INFO'
    });
  }

  return anomalies;
}

async function getBackupRecommendations(roomId: string, startTime: Date, endTime: Date) {
  const recommendations = [];

  // Check for low backup frequency
  const backupCount = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  const daysInRange = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
  const averageFrequency = backupCount / daysInRange;

  if (averageFrequency < 1) {
    recommendations.push({
      type: 'FREQUENCY',
      priority: 'HIGH',
      message: 'Consider increasing backup frequency',
      action: 'Set up automatic backup scheduling'
    });
  }

  // Check for large backup sizes
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _avg: { size: true }
  });

  const averageSize = sizeStats._avg.size || 0;
  if (averageSize > 5 * 1024 * 1024) { // 5MB
    recommendations.push({
      type: 'SIZE',
      priority: 'MEDIUM',
      message: 'Consider optimizing backup size',
      action: 'Review backup content and exclude unnecessary data'
    });
  }

  // Check for expired backups
  const expiredBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { lte: endTime }
    }
  });

  if (expiredBackups > 0) {
    recommendations.push({
      type: 'CLEANUP',
      priority: 'MEDIUM',
      message: 'Clean up expired backups',
      action: 'Remove expired backups to free up space'
    });
  }

  return recommendations;
}

async function getBackupPredictions(roomId: string, startTime: Date, endTime: Date) {
  const predictions = [];

  // Predict future backup needs
  const recentBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  const daysInRange = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
  const averageFrequency = recentBackups / daysInRange;

  // Predict next 30 days
  const predictedBackups = Math.round(averageFrequency * 30);
  
  predictions.push({
    type: 'BACKUP_COUNT',
    timeframe: '30 days',
    prediction: predictedBackups,
    confidence: 'MEDIUM'
  });

  // Predict storage needs
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _avg: { size: true }
  });

  const averageSize = sizeStats._avg.size || 0;
  const predictedStorage = predictedBackups * averageSize;

  predictions.push({
    type: 'STORAGE_NEED',
    timeframe: '30 days',
    prediction: predictedStorage,
    confidence: 'MEDIUM'
  });

  return predictions;
}

function calculateHealthScore(
  total: number,
  active: number,
  expired: number,
  corrupted: number
): number {
  if (total === 0) return 0;

  let score = 100;

  // Deduct points for expired backups
  const expiredRatio = expired / total;
  score -= expiredRatio * 30;

  // Deduct points for corrupted backups
  const corruptedRatio = corrupted / total;
  score -= corruptedRatio * 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}
