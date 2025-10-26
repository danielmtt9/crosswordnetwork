/**
 * API endpoints for room state backup monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
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

    // Get backup monitoring data
    const monitoring = await getBackupMonitoring(roomId, includeDetails);

    return NextResponse.json(monitoring);
  } catch (error) {
    console.error('Error fetching backup monitoring:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { action, ...data } = await req.json();

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

    // Handle monitoring actions
    let result;
    switch (action) {
      case 'start_monitoring':
        result = await startBackupMonitoring(roomId, data);
        break;
      case 'stop_monitoring':
        result = await stopBackupMonitoring(roomId, data);
        break;
      case 'update_alerts':
        result = await updateBackupAlerts(roomId, data);
        break;
      case 'test_monitoring':
        result = await testBackupMonitoring(roomId, data);
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error handling backup monitoring action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getBackupMonitoring(roomId: string, includeDetails: boolean) {
  // Get monitoring status
  const status = await getMonitoringStatus(roomId);

  // Get monitoring metrics
  const metrics = await getMonitoringMetrics(roomId);

  // Get monitoring alerts
  const alerts = await getMonitoringAlerts(roomId);

  // Get monitoring health
  const health = await getMonitoringHealth(roomId);

  // Get monitoring configuration
  const config = await getMonitoringConfig(roomId);

  // Get detailed monitoring data if requested
  let details = null;
  if (includeDetails) {
    details = await getDetailedMonitoringData(roomId);
  }

  return {
    status,
    metrics,
    alerts,
    health,
    config,
    details
  };
}

async function getMonitoringStatus(roomId: string) {
  // Get monitoring status
  const monitoring = await db.roomBackupMonitoring.findFirst({
    where: { roomId },
    select: {
      isActive: true,
      lastCheck: true,
      nextCheck: true,
      checkInterval: true,
      alertThresholds: true
    }
  });

  if (!monitoring) {
    return {
      isActive: false,
      lastCheck: null,
      nextCheck: null,
      checkInterval: 300, // 5 minutes
      alertThresholds: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        minFrequency: 1, // 1 backup per day
        maxCorruptionRate: 0.1 // 10%
      }
    };
  }

  return {
    isActive: monitoring.isActive,
    lastCheck: monitoring.lastCheck,
    nextCheck: monitoring.nextCheck,
    checkInterval: monitoring.checkInterval,
    alertThresholds: monitoring.alertThresholds
  };
}

async function getMonitoringMetrics(roomId: string) {
  // Get backup metrics
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  const activeBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { gt: new Date() },
      isCorrupted: false
    }
  });

  const expiredBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { lte: new Date() }
    }
  });

  const corruptedBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      isCorrupted: true
    }
  });

  // Get size metrics
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _sum: { size: true },
    _avg: { size: true },
    _max: { size: true },
    _min: { size: true }
  });

  // Get frequency metrics
  const recentBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  // Get restoration metrics
  const restorationCount = await db.roomActivity.count({
    where: {
      roomId,
      type: 'BACKUP_RESTORED',
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }
  });

  return {
    backups: {
      total: totalBackups,
      active: activeBackups,
      expired: expiredBackups,
      corrupted: corruptedBackups
    },
    size: {
      total: sizeStats._sum.size || 0,
      average: Math.round(sizeStats._avg.size || 0),
      max: sizeStats._max.size || 0,
      min: sizeStats._min.size || 0
    },
    frequency: {
      recent: recentBackups,
      daily: recentBackups
    },
    restoration: {
      count: restorationCount,
      rate: totalBackups > 0 ? (restorationCount / totalBackups) * 100 : 0
    }
  };
}

async function getMonitoringAlerts(roomId: string) {
  const alerts = [];

  // Check for size alerts
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _avg: { size: true }
  });

  const averageSize = sizeStats._avg.size || 0;
  if (averageSize > 10 * 1024 * 1024) { // 10MB
    alerts.push({
      type: 'SIZE',
      severity: 'WARNING',
      message: `Average backup size is ${(averageSize / 1024 / 1024).toFixed(1)}MB`,
      timestamp: new Date()
    });
  }

  // Check for age alerts
  const oldestBackup = await db.roomRecoveryBackup.findFirst({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true }
  });

  if (oldestBackup) {
    const age = Date.now() - oldestBackup.createdAt.getTime();
    const ageHours = age / (1000 * 60 * 60);
    
    if (ageHours > 24) {
      alerts.push({
        type: 'AGE',
        severity: 'WARNING',
        message: `Oldest backup is ${ageHours.toFixed(1)} hours old`,
        timestamp: new Date()
      });
    }
  }

  // Check for frequency alerts
  const recentBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (recentBackups === 0) {
    alerts.push({
      type: 'FREQUENCY',
      severity: 'CRITICAL',
      message: 'No backups created in the last 24 hours',
      timestamp: new Date()
    });
  }

  // Check for corruption alerts
  const corruptedBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      isCorrupted: true
    }
  });

  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  if (totalBackups > 0) {
    const corruptionRate = corruptedBackups / totalBackups;
    if (corruptionRate > 0.1) { // 10%
      alerts.push({
        type: 'CORRUPTION',
        severity: 'CRITICAL',
        message: `Corruption rate is ${(corruptionRate * 100).toFixed(1)}%`,
        timestamp: new Date()
      });
    }
  }

  return alerts;
}

async function getMonitoringHealth(roomId: string) {
  // Get health metrics
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  const activeBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { gt: new Date() },
      isCorrupted: false
    }
  });

  const expiredBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      expiresAt: { lte: new Date() }
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

  // Get health status
  const healthStatus = healthScore >= 75 ? 'HEALTHY' : healthScore >= 50 ? 'WARNING' : 'CRITICAL';

  // Get health trends
  const healthTrends = await getHealthTrends(roomId);

  return {
    score: healthScore,
    status: healthStatus,
    total: totalBackups,
    active: activeBackups,
    expired: expiredBackups,
    corrupted: corruptedBackups,
    trends: healthTrends
  };
}

async function getMonitoringConfig(roomId: string) {
  // Get monitoring configuration
  const config = await db.roomBackupMonitoring.findFirst({
    where: { roomId },
    select: {
      checkInterval: true,
      alertThresholds: true,
      notificationSettings: true,
      isActive: true
    }
  });

  if (!config) {
    return {
      checkInterval: 300, // 5 minutes
      alertThresholds: {
        maxSize: 10 * 1024 * 1024, // 10MB
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        minFrequency: 1, // 1 backup per day
        maxCorruptionRate: 0.1 // 10%
      },
      notificationSettings: {
        email: true,
        inApp: true,
        webhook: false
      },
      isActive: false
    };
  }

  return {
    checkInterval: config.checkInterval,
    alertThresholds: config.alertThresholds,
    notificationSettings: config.notificationSettings,
    isActive: config.isActive
  };
}

async function getDetailedMonitoringData(roomId: string) {
  // Get detailed monitoring information
  const monitoring = await db.roomBackupMonitoring.findFirst({
    where: { roomId },
    select: {
      id: true,
      isActive: true,
      lastCheck: true,
      nextCheck: true,
      checkInterval: true,
      alertThresholds: true,
      notificationSettings: true,
      createdAt: true,
      updatedAt: true
    }
  });

  // Get monitoring history
  const history = await db.roomBackupMonitoringHistory.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      type: true,
      status: true,
      message: true,
      metadata: true,
      createdAt: true
    }
  });

  // Get monitoring schedules
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
    monitoring: monitoring ? {
      id: monitoring.id,
      isActive: monitoring.isActive,
      lastCheck: monitoring.lastCheck,
      nextCheck: monitoring.nextCheck,
      checkInterval: monitoring.checkInterval,
      alertThresholds: monitoring.alertThresholds,
      notificationSettings: monitoring.notificationSettings,
      createdAt: monitoring.createdAt,
      updatedAt: monitoring.updatedAt
    } : null,
    history: history.map(entry => ({
      type: entry.type,
      status: entry.status,
      message: entry.message,
      metadata: entry.metadata,
      timestamp: entry.createdAt
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

// Monitoring action handlers
async function startBackupMonitoring(roomId: string, data: any) {
  // Start monitoring
  const monitoring = await db.roomBackupMonitoring.upsert({
    where: { roomId },
    update: {
      isActive: true,
      checkInterval: data.checkInterval || 300,
      alertThresholds: data.alertThresholds || {
        maxSize: 10 * 1024 * 1024,
        maxAge: 24 * 60 * 60 * 1000,
        minFrequency: 1,
        maxCorruptionRate: 0.1
      },
      notificationSettings: data.notificationSettings || {
        email: true,
        inApp: true,
        webhook: false
      }
    },
    create: {
      roomId,
      isActive: true,
      checkInterval: data.checkInterval || 300,
      alertThresholds: data.alertThresholds || {
        maxSize: 10 * 1024 * 1024,
        maxAge: 24 * 60 * 60 * 1000,
        minFrequency: 1,
        maxCorruptionRate: 0.1
      },
      notificationSettings: data.notificationSettings || {
        email: true,
        inApp: true,
        webhook: false
      }
    }
  });

  // Log monitoring start
  await db.roomBackupMonitoringHistory.create({
    data: {
      roomId,
      type: 'MONITORING_STARTED',
      status: 'SUCCESS',
      message: 'Backup monitoring started',
      metadata: {
        checkInterval: monitoring.checkInterval,
        alertThresholds: monitoring.alertThresholds
      }
    }
  });

  return {
    success: true,
    message: 'Backup monitoring started',
    monitoring: {
      id: monitoring.id,
      isActive: monitoring.isActive,
      checkInterval: monitoring.checkInterval
    }
  };
}

async function stopBackupMonitoring(roomId: string, data: any) {
  // Stop monitoring
  await db.roomBackupMonitoring.update({
    where: { roomId },
    data: { isActive: false }
  });

  // Log monitoring stop
  await db.roomBackupMonitoringHistory.create({
    data: {
      roomId,
      type: 'MONITORING_STOPPED',
      status: 'SUCCESS',
      message: 'Backup monitoring stopped',
      metadata: data
    }
  });

  return {
    success: true,
    message: 'Backup monitoring stopped'
  };
}

async function updateBackupAlerts(roomId: string, data: any) {
  // Update alert thresholds
  const monitoring = await db.roomBackupMonitoring.update({
    where: { roomId },
    data: {
      alertThresholds: data.alertThresholds,
      notificationSettings: data.notificationSettings
    }
  });

  // Log alert update
  await db.roomBackupMonitoringHistory.create({
    data: {
      roomId,
      type: 'ALERTS_UPDATED',
      status: 'SUCCESS',
      message: 'Backup alert thresholds updated',
      metadata: {
        alertThresholds: data.alertThresholds,
        notificationSettings: data.notificationSettings
      }
    }
  });

  return {
    success: true,
    message: 'Backup alerts updated',
    monitoring: {
      id: monitoring.id,
      alertThresholds: monitoring.alertThresholds,
      notificationSettings: monitoring.notificationSettings
    }
  };
}

async function testBackupMonitoring(roomId: string, data: any) {
  // Test monitoring system
  const testResult = await performMonitoringTest(roomId);

  // Log test result
  await db.roomBackupMonitoringHistory.create({
    data: {
      roomId,
      type: 'MONITORING_TEST',
      status: testResult.success ? 'SUCCESS' : 'FAILED',
      message: testResult.message,
      metadata: testResult.data
    }
  });

  return {
    success: testResult.success,
    message: testResult.message,
    data: testResult.data
  };
}

// Helper functions
async function getHealthTrends(roomId: string) {
  // Get health trends over time
  const trends = await db.roomRecoveryBackup.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    _count: { id: true }
  });

  return trends.map(trend => ({
    date: trend.createdAt,
    count: trend._count.id
  }));
}

async function performMonitoringTest(roomId: string) {
  try {
    // Test backup access
    const backupCount = await db.roomRecoveryBackup.count({
      where: { roomId }
    });

    // Test monitoring configuration
    const monitoring = await db.roomBackupMonitoring.findFirst({
      where: { roomId }
    });

    // Test alert thresholds
    const alertThresholds = monitoring?.alertThresholds || {
      maxSize: 10 * 1024 * 1024,
      maxAge: 24 * 60 * 60 * 1000,
      minFrequency: 1,
      maxCorruptionRate: 0.1
    };

    return {
      success: true,
      message: 'Monitoring test completed successfully',
      data: {
        backupCount,
        monitoringConfigured: !!monitoring,
        alertThresholds
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Monitoring test failed',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
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