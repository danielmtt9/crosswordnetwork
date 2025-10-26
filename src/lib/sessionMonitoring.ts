import { prisma } from './prisma';

export interface SessionActivity {
  id: string;
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: any;
}

export interface SessionTimeoutConfig {
  adminTimeoutMinutes: number;
  superAdminTimeoutMinutes: number;
  warningMinutes: number;
  maxInactiveMinutes: number;
  enableActivityTracking: boolean;
  enableAutoLogout: boolean;
}

export interface SessionWarning {
  userId: string;
  sessionId: string;
  warningType: 'TIMEOUT_WARNING' | 'INACTIVITY_WARNING' | 'SUSPICIOUS_ACTIVITY';
  message: string;
  expiresAt: Date;
  acknowledged: boolean;
}

export interface AdminSession {
  id: string;
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  warningSent: boolean;
  activityCount: number;
  suspiciousActivityCount: number;
}

export class SessionMonitoringManager {
  private static config: SessionTimeoutConfig = {
    adminTimeoutMinutes: 60,        // 1 hour for regular admins
    superAdminTimeoutMinutes: 120,  // 2 hours for super admins
    warningMinutes: 10,             // Warn 10 minutes before timeout
    maxInactiveMinutes: 30,         // Max 30 minutes of inactivity
    enableActivityTracking: true,
    enableAutoLogout: true
  };

  /**
   * Track admin activity
   */
  static async trackActivity(
    userId: string,
    sessionId: string,
    action: string,
    resource: string,
    ipAddress: string,
    userAgent: string,
    metadata?: any
  ): Promise<void> {
    if (!this.config.enableActivityTracking) return;

    // Log activity
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        details: {
          sessionId,
          ...metadata
        },
        ipAddress,
        userAgent
      }
    });

    // Update session activity
    await this.updateSessionActivity(userId, sessionId, ipAddress, userAgent);

    // Check for suspicious activity
    await this.checkSuspiciousActivity(userId, sessionId, action, ipAddress, userAgent);

    // Check for timeout warnings
    await this.checkTimeoutWarnings(userId, sessionId);
  }

  /**
   * Update session activity timestamp
   */
  private static async updateSessionActivity(
    userId: string,
    sessionId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const now = new Date();
    
    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (existingSession) {
      // Update existing session
      await prisma.session.update({
        where: { id: sessionId },
        data: {
          expires: new Date(now.getTime() + this.getSessionTimeout(userId) * 60 * 1000)
        }
      });
    }
  }

  /**
   * Get session timeout based on user role
   */
  private static getSessionTimeout(userId: string): number {
    // This would check user role from database
    // For now, return default admin timeout
    return this.config.adminTimeoutMinutes;
  }

  /**
   * Check for suspicious activity patterns
   */
  private static async checkSuspiciousActivity(
    userId: string,
    sessionId: string,
    action: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const now = new Date();
    const recentWindow = new Date(now.getTime() - 5 * 60 * 1000); // Last 5 minutes

    // Get recent activities for this session
    const recentActivities = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: recentWindow
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Check for rapid-fire actions
    if (recentActivities.length > 15) {
      await this.createSessionWarning(userId, sessionId, 'SUSPICIOUS_ACTIVITY', 
        'High frequency of admin actions detected');
    }

    // Check for unusual IP changes
    const uniqueIPs = new Set(recentActivities.map(a => a.ipAddress));
    if (uniqueIPs.size > 3) {
      await this.createSessionWarning(userId, sessionId, 'SUSPICIOUS_ACTIVITY',
        'Multiple IP addresses detected in short time');
    }

    // Check for sensitive actions
    const sensitiveActions = ['USER_DELETE', 'ROLE_CHANGE', 'SYSTEM_CONFIG_UPDATE', 'DATA_EXPORT'];
    const sensitiveCount = recentActivities.filter(a => sensitiveActions.includes(a.action)).length;
    
    if (sensitiveCount > 5) {
      await this.createSessionWarning(userId, sessionId, 'SUSPICIOUS_ACTIVITY',
        'Multiple sensitive actions performed in short time');
    }
  }

  /**
   * Check for timeout warnings
   */
  private static async checkTimeoutWarnings(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) return;

    const now = new Date();
    const timeUntilExpiry = session.expires.getTime() - now.getTime();
    const warningTime = this.config.warningMinutes * 60 * 1000;

    // Check if warning should be sent
    if (timeUntilExpiry <= warningTime && timeUntilExpiry > 0) {
      const existingWarning = await this.getActiveWarning(userId, sessionId, 'TIMEOUT_WARNING');
      
      if (!existingWarning) {
        await this.createSessionWarning(userId, sessionId, 'TIMEOUT_WARNING',
          `Session will expire in ${Math.ceil(timeUntilExpiry / 60000)} minutes`);
      }
    }

    // Check for inactivity
    const lastActivity = await this.getLastActivity(userId, sessionId);
    if (lastActivity) {
      const inactiveTime = now.getTime() - lastActivity.getTime();
      const maxInactiveTime = this.config.maxInactiveMinutes * 60 * 1000;

      if (inactiveTime > maxInactiveTime) {
        const existingWarning = await this.getActiveWarning(userId, sessionId, 'INACTIVITY_WARNING');
        
        if (!existingWarning) {
          await this.createSessionWarning(userId, sessionId, 'INACTIVITY_WARNING',
            `Session inactive for ${Math.ceil(inactiveTime / 60000)} minutes`);
        }
      }
    }
  }

  /**
   * Create session warning
   */
  private static async createSessionWarning(
    userId: string,
    sessionId: string,
    warningType: string,
    message: string
  ): Promise<void> {
    // Store warning in database (would need a SessionWarning table)
    // For now, log it
    console.log(`Session Warning: ${warningType} for user ${userId}, session ${sessionId}: ${message}`);
    
    // Send notification to user
    await this.sendSessionNotification(userId, sessionId, warningType, message);
  }

  /**
   * Get active warning for session
   */
  private static async getActiveWarning(
    userId: string,
    sessionId: string,
    warningType: string
  ): Promise<SessionWarning | null> {
    // This would query a SessionWarning table
    // For now, return null
    return null;
  }

  /**
   * Get last activity for session
   */
  private static async getLastActivity(userId: string, sessionId: string): Promise<Date | null> {
    const lastActivity = await prisma.auditLog.findFirst({
      where: {
        userId,
        details: {
          path: ['sessionId'],
          equals: sessionId
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    });

    return lastActivity?.createdAt || null;
  }

  /**
   * Send session notification
   */
  private static async sendSessionNotification(
    userId: string,
    sessionId: string,
    warningType: string,
    message: string
  ): Promise<void> {
    // Implementation would send real-time notification to user
    console.log(`Sending notification to user ${userId}: ${message}`);
  }

  /**
   * Force logout user session
   */
  static async forceLogout(userId: string, sessionId: string, reason: string): Promise<void> {
    // Invalidate session
    await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId
      }
    });

    // Log the forced logout
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'FORCED_LOGOUT',
        resource: 'SESSION',
        details: {
          sessionId,
          reason
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });

    // Send notification
    await this.sendSessionNotification(userId, sessionId, 'FORCED_LOGOUT', 
      `Session terminated: ${reason}`);
  }

  /**
   * Get active admin sessions
   */
  static async getActiveAdminSessions(): Promise<AdminSession[]> {
    const now = new Date();
    
    // Get all active sessions for admin users
    const sessions = await prisma.session.findMany({
      where: {
        expires: {
          gt: now
        },
        user: {
          role: {
            in: ['ADMIN', 'SUPER_ADMIN']
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        expires: 'desc'
      }
    });

    const adminSessions: AdminSession[] = [];

    for (const session of sessions) {
      const lastActivity = await this.getLastActivity(session.userId, session.id);
      const activityCount = await this.getActivityCount(session.userId, session.id);
      const suspiciousCount = await this.getSuspiciousActivityCount(session.userId, session.id);

      adminSessions.push({
        id: session.id,
        userId: session.userId,
        sessionId: session.id,
        ipAddress: 'unknown', // Would need to track this
        userAgent: 'unknown', // Would need to track this
        lastActivity: lastActivity || session.createdAt,
        createdAt: session.createdAt,
        expiresAt: session.expires,
        isActive: true,
        warningSent: false, // Would check from warnings table
        activityCount,
        suspiciousActivityCount: suspiciousCount
      });
    }

    return adminSessions;
  }

  /**
   * Get activity count for session
   */
  private static async getActivityCount(userId: string, sessionId: string): Promise<number> {
    const count = await prisma.auditLog.count({
      where: {
        userId,
        details: {
          path: ['sessionId'],
          equals: sessionId
        }
      }
    });

    return count;
  }

  /**
   * Get suspicious activity count for session
   */
  private static async getSuspiciousActivityCount(userId: string, sessionId: string): Promise<number> {
    // This would count suspicious activities
    // For now, return 0
    return 0;
  }

  /**
   * Extend session timeout
   */
  static async extendSession(userId: string, sessionId: string, minutes: number): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const newExpiry = new Date(session.expires.getTime() + minutes * 60 * 1000);

    await prisma.session.update({
      where: { id: sessionId },
      data: { expires: newExpiry }
    });

    // Log the extension
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SESSION_EXTENDED',
        resource: 'SESSION',
        details: {
          sessionId,
          extensionMinutes: minutes,
          newExpiry
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });
  }

  /**
   * Get session monitoring configuration
   */
  static getConfig(): SessionTimeoutConfig {
    return { ...this.config };
  }

  /**
   * Update session monitoring configuration
   */
  static updateConfig(updates: Partial<SessionTimeoutConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        expires: {
          lt: now
        }
      }
    });

    return deletedSessions.count;
  }

  /**
   * Get session statistics
   */
  static async getSessionStatistics(): Promise<{
    activeSessions: number;
    expiredSessions: number;
    averageSessionDuration: number;
    suspiciousSessions: number;
  }> {
    const now = new Date();
    
    const activeSessions = await prisma.session.count({
      where: {
        expires: { gt: now },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    const expiredSessions = await prisma.session.count({
      where: {
        expires: { lt: now },
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      }
    });

    // Calculate average session duration
    const sessions = await prisma.session.findMany({
      where: {
        user: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      },
      select: {
        createdAt: true,
        expires: true
      }
    });

    const totalDuration = sessions.reduce((sum, session) => {
      return sum + (session.expires.getTime() - session.createdAt.getTime());
    }, 0);

    const averageSessionDuration = sessions.length > 0 
      ? totalDuration / sessions.length / (1000 * 60) // Convert to minutes
      : 0;

    return {
      activeSessions,
      expiredSessions,
      averageSessionDuration,
      suspiciousSessions: 0 // Would calculate from suspicious activity
    };
  }

  /**
   * Acknowledge session warning
   */
  static async acknowledgeWarning(
    userId: string,
    sessionId: string,
    warningType: string
  ): Promise<void> {
    // This would update the warning status in database
    console.log(`Warning acknowledged: ${warningType} for user ${userId}, session ${sessionId}`);
  }

  /**
   * Get session activity history
   */
  static async getSessionActivityHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<SessionActivity[]> {
    const activities = await prisma.auditLog.findMany({
      where: {
        details: {
          path: ['sessionId'],
          equals: sessionId
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return activities.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      sessionId: sessionId,
      action: activity.action,
      resource: activity.resource,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent,
      timestamp: activity.createdAt,
      metadata: activity.details
    }));
  }
}
