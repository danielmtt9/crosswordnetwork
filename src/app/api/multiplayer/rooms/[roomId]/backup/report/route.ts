/**
 * API endpoints for room state backup reporting
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
    const reportType = searchParams.get('reportType') || 'summary';
    const timeRange = searchParams.get('timeRange') || '30d';
    const format = searchParams.get('format') || 'json';

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

    // Generate backup report
    const report = await generateBackupReport(roomId, reportType, timeRange, format);

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating backup report:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

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
    const { reportType, timeRange, format, schedule } = await req.json();

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

    // Schedule backup report
    const result = await scheduleBackupReport(roomId, reportType, timeRange, format, schedule);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error scheduling backup report:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function generateBackupReport(roomId: string, reportType: string, timeRange: string, format: string) {
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

  // Generate report based on type
  let report;
  switch (reportType) {
    case 'summary':
      report = await generateSummaryReport(roomId, startTime, now);
      break;
    case 'detailed':
      report = await generateDetailedReport(roomId, startTime, now);
      break;
    case 'analytics':
      report = await generateAnalyticsReport(roomId, startTime, now);
      break;
    case 'performance':
      report = await generatePerformanceReport(roomId, startTime, now);
      break;
    case 'health':
      report = await generateHealthReport(roomId, startTime, now);
      break;
    case 'comprehensive':
      report = await generateComprehensiveReport(roomId, startTime, now);
      break;
    default:
      return {
        error: 'Invalid report type',
        report: null
      };
  }

  // Format report
  const formattedReport = formatReport(report, format);

  return {
    reportType,
    timeRange,
    format,
    generatedAt: new Date(),
    report: formattedReport
  };
}

async function generateSummaryReport(roomId: string, startTime: Date, endTime: Date) {
  // Get backup summary
  const totalBackups = await db.roomRecoveryBackup.count({
    where: { roomId }
  });

  const recentBackups = await db.roomRecoveryBackup.count({
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    }
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

  // Get size summary
  const sizeStats = await db.roomRecoveryBackup.aggregate({
    where: { roomId },
    _sum: { size: true },
    _avg: { size: true }
  });

  // Get restoration summary
  const restorationCount = await db.roomActivity.count({
    where: {
      roomId,
      type: 'BACKUP_RESTORED',
      createdAt: { gte: startTime, lte: endTime }
    }
  });

  return {
    type: 'summary',
    period: { start: startTime, end: endTime },
    backups: {
      total: totalBackups,
      recent: recentBackups,
      active: activeBackups,
      expired: expiredBackups,
      corrupted: corruptedBackups
    },
    size: {
      total: sizeStats._sum.size || 0,
      average: Math.round(sizeStats._avg.size || 0)
    },
    restoration: {
      count: restorationCount,
      rate: totalBackups > 0 ? (restorationCount / totalBackups) * 100 : 0
    }
  };
}

async function generateDetailedReport(roomId: string, startTime: Date, endTime: Date) {
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
    type: 'detailed',
    period: { start: startTime, end: endTime },
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

async function generateAnalyticsReport(roomId: string, startTime: Date, endTime: Date) {
  // Get backup analytics
  const backupTypes = await db.roomRecoveryBackup.groupBy({
    by: ['type'],
    where: { roomId },
    _count: { type: true },
    _sum: { size: true }
  });

  // Get backup trends
  const backupTrends = await db.roomRecoveryBackup.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      createdAt: { gte: startTime, lte: endTime }
    },
    _count: { id: true },
    _sum: { size: true }
  });

  // Get restoration trends
  const restorationTrends = await db.roomActivity.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      type: 'BACKUP_RESTORED',
      createdAt: { gte: startTime, lte: endTime }
    },
    _count: { id: true }
  });

  // Get performance metrics
  const performanceMetrics = await getPerformanceMetrics(roomId, startTime, endTime);

  return {
    type: 'analytics',
    period: { start: startTime, end: endTime },
    backupTypes: backupTypes.map(type => ({
      type: type.type,
      count: type._count.type,
      totalSize: type._sum.size || 0
    })),
    trends: {
      creation: backupTrends.map(trend => ({
        date: trend.createdAt,
        count: trend._count.id,
        totalSize: trend._sum.size || 0
      })),
      restoration: restorationTrends.map(trend => ({
        date: trend.createdAt,
        count: trend._count.id
      }))
    },
    performance: performanceMetrics
  };
}

async function generatePerformanceReport(roomId: string, startTime: Date, endTime: Date) {
  // Get performance metrics
  const performanceMetrics = await getPerformanceMetrics(roomId, startTime, endTime);

  // Get backup creation performance
  const creationPerformance = await getCreationPerformance(roomId, startTime, endTime);

  // Get backup restoration performance
  const restorationPerformance = await getRestorationPerformance(roomId, startTime, endTime);

  // Get backup validation performance
  const validationPerformance = await getValidationPerformance(roomId, startTime, endTime);

  return {
    type: 'performance',
    period: { start: startTime, end: endTime },
    metrics: performanceMetrics,
    creation: creationPerformance,
    restoration: restorationPerformance,
    validation: validationPerformance
  };
}

async function generateHealthReport(roomId: string, startTime: Date, endTime: Date) {
  // Get health metrics
  const healthMetrics = await getHealthMetrics(roomId, startTime, endTime);

  // Get health trends
  const healthTrends = await getHealthTrends(roomId, startTime, endTime);

  // Get health alerts
  const healthAlerts = await getHealthAlerts(roomId, startTime, endTime);

  // Get health recommendations
  const healthRecommendations = await getHealthRecommendations(roomId, startTime, endTime);

  return {
    type: 'health',
    period: { start: startTime, end: endTime },
    metrics: healthMetrics,
    trends: healthTrends,
    alerts: healthAlerts,
    recommendations: healthRecommendations
  };
}

async function generateComprehensiveReport(roomId: string, startTime: Date, endTime: Date) {
  // Generate all report types
  const summary = await generateSummaryReport(roomId, startTime, endTime);
  const detailed = await generateDetailedReport(roomId, startTime, endTime);
  const analytics = await generateAnalyticsReport(roomId, startTime, endTime);
  const performance = await generatePerformanceReport(roomId, startTime, endTime);
  const health = await generateHealthReport(roomId, startTime, endTime);

  return {
    type: 'comprehensive',
    period: { start: startTime, end: endTime },
    summary,
    detailed,
    analytics,
    performance,
    health
  };
}

async function scheduleBackupReport(roomId: string, reportType: string, timeRange: string, format: string, schedule: any) {
  // Schedule backup report
  const scheduledReport = await db.roomBackupReportSchedule.create({
    data: {
      roomId,
      reportType,
      timeRange,
      format,
      frequency: schedule.frequency || 'WEEKLY',
      interval: schedule.interval || 1,
      isActive: schedule.isActive || true,
      nextRun: schedule.nextRun || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      notificationSettings: schedule.notificationSettings || {
        email: true,
        inApp: true,
        webhook: false
      }
    }
  });

  return {
    success: true,
    message: 'Backup report scheduled successfully',
    schedule: {
      id: scheduledReport.id,
      reportType: scheduledReport.reportType,
      frequency: scheduledReport.frequency,
      nextRun: scheduledReport.nextRun
    }
  };
}

// Helper functions
async function getPerformanceMetrics(roomId: string, startTime: Date, endTime: Date) {
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

async function getCreationPerformance(roomId: string, startTime: Date, endTime: Date) {
  // Get creation performance metrics
  const backups = await db.roomRecoveryBackup.findMany({
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

  // Calculate performance metrics
  const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
  const averageSize = backups.length > 0 ? totalSize / backups.length : 0;
  const maxSize = Math.max(...backups.map(backup => backup.size));
  const minSize = Math.min(...backups.map(backup => backup.size));

  return {
    totalSize,
    averageSize: Math.round(averageSize),
    maxSize,
    minSize,
    backupCount: backups.length
  };
}

async function getRestorationPerformance(roomId: string, startTime: Date, endTime: Date) {
  // Get restoration performance metrics
  const restorations = await db.roomActivity.findMany({
    where: {
      roomId,
      type: 'BACKUP_RESTORED',
      createdAt: { gte: startTime, lte: endTime }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      metadata: true
    }
  });

  return {
    restorationCount: restorations.length,
    averageRestorationTime: 0, // Would need to track restoration time
    successRate: 100 // Would need to track restoration success
  };
}

async function getValidationPerformance(roomId: string, startTime: Date, endTime: Date) {
  // Get validation performance metrics
  const validations = await db.roomActivity.findMany({
    where: {
      roomId,
      type: 'BACKUP_VALIDATED',
      createdAt: { gte: startTime, lte: endTime }
    },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      metadata: true
    }
  });

  return {
    validationCount: validations.length,
    averageValidationTime: 0, // Would need to track validation time
    successRate: 100 // Would need to track validation success
  };
}

async function getHealthMetrics(roomId: string, startTime: Date, endTime: Date) {
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

  return {
    score: healthScore,
    status: healthScore >= 75 ? 'HEALTHY' : healthScore >= 50 ? 'WARNING' : 'CRITICAL',
    total: totalBackups,
    active: activeBackups,
    expired: expiredBackups,
    corrupted: corruptedBackups
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

async function getHealthAlerts(roomId: string, startTime: Date, endTime: Date) {
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

  return alerts;
}

async function getHealthRecommendations(roomId: string, startTime: Date, endTime: Date) {
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
    where: { roomId },
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

  return recommendations;
}

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

function formatReport(report: any, format: string) {
  switch (format) {
    case 'json':
      return report;
    case 'csv':
      return convertToCSV(report);
    case 'html':
      return convertToHTML(report);
    case 'pdf':
      return convertToPDF(report);
    default:
      return report;
  }
}

function convertToCSV(report: any): string {
  // Convert report to CSV format
  // This is a simplified implementation
  return JSON.stringify(report, null, 2);
}

function convertToHTML(report: any): string {
  // Convert report to HTML format
  // This is a simplified implementation
  return `<html><body><pre>${JSON.stringify(report, null, 2)}</pre></body></html>`;
}

function convertToPDF(report: any): string {
  // Convert report to PDF format
  // This is a simplified implementation
  return JSON.stringify(report, null, 2);
}