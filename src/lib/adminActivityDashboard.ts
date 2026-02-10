import { prisma } from './prisma';

export interface AdminActivityMetrics {
  totalActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  uniqueAdmins: number;
  averageActionsPerDay: number;
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  topAdmins: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActivity: Date;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
  dailyTrend: Array<{
    date: string;
    count: number;
  }>;
}

export interface AdminActivityAlert {
  id: string;
  type: 'HIGH_ACTIVITY' | 'UNUSUAL_PATTERN' | 'SECURITY_EVENT' | 'SYSTEM_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  adminId: string;
  adminName: string;
  timestamp: Date;
  resolved: boolean;
  metadata: any;
}

export interface AdminActivityReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalActions: number;
    uniqueAdmins: number;
    topActions: string[];
    securityEvents: number;
    systemChanges: number;
  };
  admins: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActivity: Date;
    topActions: Array<{
      action: string;
      count: number;
    }>;
  }>;
  actions: Array<{
    action: string;
    count: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  timeline: Array<{
    timestamp: Date;
    adminId: string;
    adminName: string;
    action: string;
    resource: string;
    details: any;
  }>;
}

export class AdminActivityDashboard {
  /**
   * Get comprehensive admin activity metrics
   */
  static async getActivityMetrics(timeRange: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<AdminActivityMetrics> {
    const now = new Date();
    const timeRanges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    };

    const startDate = timeRanges[timeRange];
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get total actions in time range
    const totalActions = await prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    // Get actions today
    const actionsToday = await prisma.auditLog.count({
      where: {
        createdAt: { gte: today },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    // Get actions this week
    const actionsThisWeek = await prisma.auditLog.count({
      where: {
        createdAt: { gte: weekStart },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    // Get actions this month
    const actionsThisMonth = await prisma.auditLog.count({
      where: {
        createdAt: { gte: monthStart },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    // Get unique admins
    const uniqueAdmins = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    // Calculate average actions per day
    const daysInRange = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const averageActionsPerDay = daysInRange > 0 ? totalActions / daysInRange : 0;

    // Get top actions
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: startDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    });

    const topActions = actionCounts.map(item => ({
      action: item.action,
      count: item._count.action,
      percentage: totalActions > 0 ? (item._count.action / totalActions) * 100 : 0
    }));

    // Get top admins
    const adminCounts = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      _count: {
        userId: true
      },
      _max: {
        createdAt: true
      },
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: 10
    });

    const topAdmins = await Promise.all(
      adminCounts.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { name: true }
        });
        return {
          userId: item.userId,
          userName: user?.name || 'Unknown',
          actionCount: item._count.userId,
          lastActivity: item._max.createdAt || new Date()
        };
      })
    );

    // Get hourly distribution
    const hourlyData = await this.getHourlyDistribution(startDate, now);

    // Get daily trend
    const dailyTrend = await this.getDailyTrend(startDate, now);

    return {
      totalActions,
      actionsToday,
      actionsThisWeek,
      actionsThisMonth,
      uniqueAdmins: uniqueAdmins.length,
      averageActionsPerDay,
      topActions,
      topAdmins,
      hourlyDistribution: hourlyData,
      dailyTrend
    };
  }

  /**
   * Get hourly distribution of admin activities
   */
  private static async getHourlyDistribution(startDate: Date, endDate: Date): Promise<Array<{ hour: number; count: number }>> {
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));

    const activities = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        createdAt: true
      }
    });

    activities.forEach(activity => {
      const hour = activity.createdAt.getHours();
      hourlyData[hour].count++;
    });

    return hourlyData;
  }

  /**
   * Get daily trend of admin activities
   */
  private static async getDailyTrend(startDate: Date, endDate: Date): Promise<Array<{ date: string; count: number }>> {
    const dailyData: { [key: string]: number } = {};
    const current = new Date(startDate);

    // Initialize all days with 0
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      dailyData[dateKey] = 0;
      current.setDate(current.getDate() + 1);
    }

    // Get actual counts
    const activities = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        createdAt: true
      }
    });

    activities.forEach(activity => {
      const dateKey = activity.createdAt.toISOString().split('T')[0];
      if (dailyData.hasOwnProperty(dateKey)) {
        dailyData[dateKey]++;
      }
    });

    return Object.entries(dailyData).map(([date, count]) => ({
      date,
      count
    }));
  }

  /**
   * Get admin activity alerts
   */
  static async getActivityAlerts(limit: number = 20): Promise<AdminActivityAlert[]> {
    const alerts: AdminActivityAlert[] = [];
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check for high activity
    const highActivityAdmins = await this.detectHighActivity(last24Hours);
    alerts.push(...highActivityAdmins);

    // Check for unusual patterns
    const unusualPatterns = await this.detectUnusualPatterns(last24Hours);
    alerts.push(...unusualPatterns);

    // Check for security events
    const securityEvents = await this.detectSecurityEvents(last24Hours);
    alerts.push(...securityEvents);

    // Check for system issues
    const systemIssues = await this.detectSystemIssues(last24Hours);
    alerts.push(...systemIssues);

    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Detect high activity patterns
   */
  private static async detectHighActivity(since: Date): Promise<AdminActivityAlert[]> {
    const alerts: AdminActivityAlert[] = [];
    
    // Find admins with unusually high activity
    const adminActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: since },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      _count: {
        userId: true
      },
      having: {
        userId: {
          _count: {
            gt: 100 // More than 100 actions in 24 hours
          }
        }
      }
    });

    for (const admin of adminActivity) {
      const user = await prisma.user.findUnique({
        where: { id: admin.userId },
        select: { name: true }
      });

      alerts.push({
        id: `high_activity_${admin.userId}_${Date.now()}`,
        type: 'HIGH_ACTIVITY',
        severity: 'MEDIUM',
        title: 'High Admin Activity Detected',
        description: `${user?.name || 'Unknown admin'} has performed ${admin._count.userId} actions in the last 24 hours`,
        adminId: admin.userId,
        adminName: user?.name || 'Unknown',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          actionCount: admin._count.userId,
          timeWindow: '24h'
        }
      });
    }

    return alerts;
  }

  /**
   * Detect unusual activity patterns
   */
  private static async detectUnusualPatterns(since: Date): Promise<AdminActivityAlert[]> {
    const alerts: AdminActivityAlert[] = [];

    // Check for off-hours activity
    const offHoursActivity = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: since },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        userId: true,
        createdAt: true,
        user: {
          select: { name: true }
        }
      }
    });

    const offHoursCount = offHoursActivity.filter(activity => {
      const hour = activity.createdAt.getHours();
      return hour < 6 || hour > 22; // Activity between 10 PM and 6 AM
    }).length;

    if (offHoursCount > 10) {
      alerts.push({
        id: `unusual_pattern_offhours_${Date.now()}`,
        type: 'UNUSUAL_PATTERN',
        severity: 'LOW',
        title: 'Off-Hours Admin Activity',
        description: `${offHoursCount} admin actions detected during off-hours (10 PM - 6 AM)`,
        adminId: 'multiple',
        adminName: 'Multiple Admins',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          offHoursCount,
          timeWindow: '24h'
        }
      });
    }

    return alerts;
  }

  /**
   * Detect security events
   */
  private static async detectSecurityEvents(since: Date): Promise<AdminActivityAlert[]> {
    const alerts: AdminActivityAlert[] = [];

    // Check for failed login attempts
    const failedLogins = await prisma.auditLog.count({
      where: {
        createdAt: { gte: since },
        action: 'LOGIN_FAILED',
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    if (failedLogins > 5) {
      alerts.push({
        id: `security_failed_logins_${Date.now()}`,
        type: 'SECURITY_EVENT',
        severity: 'HIGH',
        title: 'Multiple Failed Admin Login Attempts',
        description: `${failedLogins} failed login attempts detected for admin accounts`,
        adminId: 'multiple',
        adminName: 'Multiple Admins',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          failedLoginCount: failedLogins,
          timeWindow: '24h'
        }
      });
    }

    // Check for privilege escalation attempts
    const privilegeEscalations = await prisma.auditLog.count({
      where: {
        createdAt: { gte: since },
        action: 'ROLE_CHANGE',
        details: {
          path: ['newRole'],
          in: ['ADMIN', 'SUPER_ADMIN']
        }
      }
    });

    if (privilegeEscalations > 0) {
      alerts.push({
        id: `security_privilege_escalation_${Date.now()}`,
        type: 'SECURITY_EVENT',
        severity: 'CRITICAL',
        title: 'Privilege Escalation Attempt',
        description: `${privilegeEscalations} privilege escalation attempts detected`,
        adminId: 'multiple',
        adminName: 'Multiple Admins',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          escalationCount: privilegeEscalations,
          timeWindow: '24h'
        }
      });
    }

    return alerts;
  }

  /**
   * Detect system issues
   */
  private static async detectSystemIssues(since: Date): Promise<AdminActivityAlert[]> {
    const alerts: AdminActivityAlert[] = [];

    // Check for system configuration changes
    const configChanges = await prisma.auditLog.count({
      where: {
        createdAt: { gte: since },
        action: {
          in: ['SYSTEM_CONFIG_UPDATE', 'FEATURE_FLAG_UPDATE', 'MAINTENANCE_MODE_TOGGLE']
        }
      }
    });

    if (configChanges > 5) {
      alerts.push({
        id: `system_config_changes_${Date.now()}`,
        type: 'SYSTEM_ISSUE',
        severity: 'MEDIUM',
        title: 'Multiple System Configuration Changes',
        description: `${configChanges} system configuration changes detected`,
        adminId: 'multiple',
        adminName: 'Multiple Admins',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          configChangeCount: configChanges,
          timeWindow: '24h'
        }
      });
    }

    return alerts;
  }

  /**
   * Generate admin activity report
   */
  static async generateActivityReport(
    startDate: Date,
    endDate: Date
  ): Promise<AdminActivityReport> {
    // Get summary data
    const totalActions = await prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    const uniqueAdmins = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 5
    });

    const securityEvents = await prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        action: {
          in: ['LOGIN_FAILED', 'ROLE_CHANGE', 'USER_SUSPEND', 'USER_BAN']
        }
      }
    });

    const systemChanges = await prisma.auditLog.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        action: {
          in: ['SYSTEM_CONFIG_UPDATE', 'FEATURE_FLAG_UPDATE', 'MAINTENANCE_MODE_TOGGLE']
        }
      }
    });

    // Get admin details
    const adminActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      _count: {
        userId: true
      },
      _max: {
        createdAt: true
      }
    });

    const admins = await Promise.all(
      adminActivity.map(async (admin) => {
        const user = await prisma.user.findUnique({
          where: { id: admin.userId },
          select: { name: true }
        });

        const topActions = await prisma.auditLog.groupBy({
          by: ['action'],
          where: {
            userId: admin.userId,
            createdAt: { gte: startDate, lte: endDate }
          },
          _count: {
            action: true
          },
          orderBy: {
            _count: {
              action: 'desc'
            }
          },
          take: 3
        });

        return {
          userId: admin.userId,
          userName: user?.name || 'Unknown',
          actionCount: admin._count.userId,
          lastActivity: admin._max.createdAt || new Date(),
          topActions: topActions.map(action => ({
            action: action.action,
            count: action._count.action
          }))
        };
      })
    );

    // Get action breakdown
    const actionBreakdown = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      }
    });

    const actions = actionBreakdown.map(action => ({
      action: action.action,
      count: action._count.action,
      percentage: totalActions > 0 ? (action._count.action / totalActions) * 100 : 0,
      trend: 'stable' as const // Would need historical data to calculate trend
    }));

    // Get timeline
    const timeline = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        createdAt: true,
        userId: true,
        action: true,
        resource: true,
        details: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalActions,
        uniqueAdmins: uniqueAdmins.length,
        topActions: topActions.map(a => a.action),
        securityEvents,
        systemChanges
      },
      admins,
      actions,
      timeline: timeline.map(item => ({
        timestamp: item.createdAt,
        adminId: item.userId,
        adminName: item.user?.name || 'Unknown',
        action: item.action,
        resource: item.resource,
        details: item.details
      }))
    };
  }

  /**
   * Get real-time admin activity feed
   */
  static async getRealTimeActivityFeed(limit: number = 50): Promise<Array<{
    id: string;
    timestamp: Date;
    adminId: string;
    adminName: string;
    action: string;
    resource: string;
    details: any;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>> {
    const activities = await prisma.auditLog.findMany({
      where: {
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        id: true,
        createdAt: true,
        userId: true,
        action: true,
        resource: true,
        details: true,
        user: {
          select: { name: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return activities.map(activity => ({
      id: activity.id,
      timestamp: activity.createdAt,
      adminId: activity.userId,
      adminName: activity.user?.name || 'Unknown',
      action: activity.action,
      resource: activity.resource,
      details: activity.details,
      severity: this.getActionSeverity(activity.action)
    }));
  }

  /**
   * Get action severity level
   */
  private static getActionSeverity(action: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalActions = ['ROLE_CHANGE', 'USER_DELETE', 'SYSTEM_CONFIG_UPDATE'];
    const highActions = ['USER_SUSPEND', 'USER_BAN', 'DATA_EXPORT', 'FEATURE_FLAG_UPDATE'];
    const mediumActions = ['USER_UPDATE', 'PUZZLE_DELETE', 'MAINTENANCE_MODE_TOGGLE'];

    if (criticalActions.includes(action)) return 'CRITICAL';
    if (highActions.includes(action)) return 'HIGH';
    if (mediumActions.includes(action)) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get admin activity statistics for specific admin
   */
  static async getAdminActivityStats(
    adminId: string,
    timeRange: '24h' | '7d' | '30d' = '30d'
  ): Promise<{
    totalActions: number;
    topActions: Array<{ action: string; count: number }>;
    dailyActivity: Array<{ date: string; count: number }>;
    lastActivity: Date | null;
    averageActionsPerDay: number;
  }> {
    const now = new Date();
    const timeRanges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    };

    const startDate = timeRanges[timeRange];

    const totalActions = await prisma.auditLog.count({
      where: {
        userId: adminId,
        createdAt: { gte: startDate }
      }
    });

    const topActions = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        userId: adminId,
        createdAt: { gte: startDate }
      },
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      },
      take: 10
    });

    const lastActivity = await prisma.auditLog.findFirst({
      where: { userId: adminId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    const dailyActivity = await this.getDailyTrend(startDate, now);

    const daysInRange = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const averageActionsPerDay = daysInRange > 0 ? totalActions / daysInRange : 0;

    return {
      totalActions,
      topActions: topActions.map(action => ({
        action: action.action,
        count: action._count.action
      })),
      dailyActivity,
      lastActivity: lastActivity?.createdAt || null,
      averageActionsPerDay
    };
  }
}
