import { prisma } from './prisma';

export interface SuspiciousActivityPattern {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  conditions: ActivityCondition[];
  cooldownMinutes: number;
  maxOccurrences: number;
  timeWindowMinutes: number;
}

export interface ActivityCondition {
  type: 'ACTION_TYPE' | 'USER_ID' | 'IP_ADDRESS' | 'TIME_RANGE' | 'FREQUENCY' | 'DATA_CHANGE';
  operator: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN' | 'LESS_THAN' | 'IN' | 'NOT_IN';
  value: any;
  field?: string;
}

export interface SuspiciousActivityAlert {
  id: string;
  patternId: string;
  userId: string;
  severity: string;
  title: string;
  description: string;
  details: any;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
}

export interface ActivityContext {
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: any;
}

export class SuspiciousActivityDetector {
  private static patterns: SuspiciousActivityPattern[] = [
    {
      id: 'rapid_admin_actions',
      name: 'Rapid Admin Actions',
      description: 'Multiple admin actions performed in quick succession',
      severity: 'MEDIUM',
      enabled: true,
      conditions: [
        { type: 'FREQUENCY', operator: 'GREATER_THAN', value: 10 },
        { type: 'TIME_RANGE', operator: 'LESS_THAN', value: 5 }
      ],
      cooldownMinutes: 30,
      maxOccurrences: 3,
      timeWindowMinutes: 10
    },
    {
      id: 'bulk_user_operations',
      name: 'Bulk User Operations',
      description: 'Large number of user operations performed simultaneously',
      severity: 'HIGH',
      enabled: true,
      conditions: [
        { type: 'ACTION_TYPE', operator: 'IN', value: ['USER_SUSPEND', 'USER_BAN', 'USER_DELETE'] },
        { type: 'FREQUENCY', operator: 'GREATER_THAN', value: 5 },
        { type: 'TIME_RANGE', operator: 'LESS_THAN', value: 2 }
      ],
      cooldownMinutes: 60,
      maxOccurrences: 2,
      timeWindowMinutes: 5
    },
    {
      id: 'off_hours_admin_activity',
      name: 'Off-Hours Admin Activity',
      description: 'Admin activity during unusual hours (outside 9 AM - 6 PM)',
      severity: 'LOW',
      enabled: true,
      conditions: [
        { type: 'TIME_RANGE', operator: 'NOT_IN', value: { start: '09:00', end: '18:00' } }
      ],
      cooldownMinutes: 120,
      maxOccurrences: 5,
      timeWindowMinutes: 60
    },
    {
      id: 'privilege_escalation_attempts',
      name: 'Privilege Escalation Attempts',
      description: 'Attempts to modify admin roles or permissions',
      severity: 'CRITICAL',
      enabled: true,
      conditions: [
        { type: 'ACTION_TYPE', operator: 'EQUALS', value: 'ROLE_CHANGE' },
        { type: 'DATA_CHANGE', operator: 'CONTAINS', value: 'role', field: 'newValue' }
      ],
      cooldownMinutes: 0,
      maxOccurrences: 1,
      timeWindowMinutes: 1
    },
    {
      id: 'unusual_ip_address',
      name: 'Unusual IP Address',
      description: 'Admin activity from new or unusual IP addresses',
      severity: 'MEDIUM',
      enabled: true,
      conditions: [
        { type: 'IP_ADDRESS', operator: 'NOT_IN', value: [] } // Will be populated with known IPs
      ],
      cooldownMinutes: 60,
      maxOccurrences: 3,
      timeWindowMinutes: 30
    },
    {
      id: 'mass_data_export',
      name: 'Mass Data Export',
      description: 'Large data exports or downloads',
      severity: 'HIGH',
      enabled: true,
      conditions: [
        { type: 'ACTION_TYPE', operator: 'IN', value: ['DATA_EXPORT', 'AUDIT_EXPORT'] },
        { type: 'FREQUENCY', operator: 'GREATER_THAN', value: 3 },
        { type: 'TIME_RANGE', operator: 'LESS_THAN', value: 10 }
      ],
      cooldownMinutes: 120,
      maxOccurrences: 2,
      timeWindowMinutes: 15
    },
    {
      id: 'system_configuration_changes',
      name: 'System Configuration Changes',
      description: 'Changes to critical system settings',
      severity: 'HIGH',
      enabled: true,
      conditions: [
        { type: 'ACTION_TYPE', operator: 'IN', value: ['SYSTEM_CONFIG_UPDATE', 'FEATURE_FLAG_UPDATE'] }
      ],
      cooldownMinutes: 30,
      maxOccurrences: 5,
      timeWindowMinutes: 10
    },
    {
      id: 'failed_login_attempts',
      name: 'Failed Admin Login Attempts',
      description: 'Multiple failed login attempts for admin accounts',
      severity: 'MEDIUM',
      enabled: true,
      conditions: [
        { type: 'ACTION_TYPE', operator: 'EQUALS', value: 'LOGIN_FAILED' },
        { type: 'FREQUENCY', operator: 'GREATER_THAN', value: 5 },
        { type: 'TIME_RANGE', operator: 'LESS_THAN', value: 15 }
      ],
      cooldownMinutes: 60,
      maxOccurrences: 3,
      timeWindowMinutes: 20
    }
  ];

  /**
   * Analyze admin activity for suspicious patterns
   */
  static async analyzeActivity(context: ActivityContext): Promise<SuspiciousActivityAlert[]> {
    const alerts: SuspiciousActivityAlert[] = [];

    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;

      // Check if pattern matches current activity
      if (await this.evaluatePattern(pattern, context)) {
        // Check cooldown period
        const lastAlert = await this.getLastAlert(pattern.id, context.userId);
        if (lastAlert && this.isInCooldown(lastAlert, pattern.cooldownMinutes)) {
          continue;
        }

        // Check if max occurrences exceeded
        const recentAlerts = await this.getRecentAlerts(pattern.id, context.userId, pattern.timeWindowMinutes);
        if (recentAlerts.length >= pattern.maxOccurrences) {
          continue;
        }

        // Create alert
        const alert = await this.createAlert(pattern, context);
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Evaluate if activity matches a suspicious pattern
   */
  private static async evaluatePattern(pattern: SuspiciousActivityPattern, context: ActivityContext): Promise<boolean> {
    for (const condition of pattern.conditions) {
      if (!await this.evaluateCondition(condition, context, pattern)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Evaluate individual condition
   */
  private static async evaluateCondition(
    condition: ActivityCondition, 
    context: ActivityContext, 
    pattern: SuspiciousActivityPattern
  ): Promise<boolean> {
    switch (condition.type) {
      case 'ACTION_TYPE':
        return this.compareValues(context.action, condition.operator, condition.value);
      
      case 'USER_ID':
        return this.compareValues(context.userId, condition.operator, condition.value);
      
      case 'IP_ADDRESS':
        return await this.evaluateIPCondition(condition, context);
      
      case 'TIME_RANGE':
        return await this.evaluateTimeCondition(condition, context, pattern);
      
      case 'FREQUENCY':
        return await this.evaluateFrequencyCondition(condition, context, pattern);
      
      case 'DATA_CHANGE':
        return this.evaluateDataChangeCondition(condition, context);
      
      default:
        return false;
    }
  }

  /**
   * Compare values based on operator
   */
  private static compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'EQUALS':
        return actual === expected;
      case 'NOT_EQUALS':
        return actual !== expected;
      case 'CONTAINS':
        return String(actual).includes(String(expected));
      case 'GREATER_THAN':
        return Number(actual) > Number(expected);
      case 'LESS_THAN':
        return Number(actual) < Number(expected);
      case 'IN':
        return Array.isArray(expected) && expected.includes(actual);
      case 'NOT_IN':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  /**
   * Evaluate IP address condition
   */
  private static async evaluateIPCondition(condition: ActivityCondition, context: ActivityContext): Promise<boolean> {
    if (condition.operator === 'NOT_IN') {
      // Get known IP addresses for this user
      const knownIPs = await this.getKnownIPAddresses(context.userId);
      return !knownIPs.includes(context.ipAddress);
    }
    return this.compareValues(context.ipAddress, condition.operator, condition.value);
  }

  /**
   * Evaluate time-based condition
   */
  private static async evaluateTimeCondition(
    condition: ActivityCondition, 
    context: ActivityContext, 
    pattern: SuspiciousActivityPattern
  ): Promise<boolean> {
    if (condition.operator === 'NOT_IN') {
      const hour = context.timestamp.getHours();
      const startHour = parseInt(condition.value.start.split(':')[0]);
      const endHour = parseInt(condition.value.end.split(':')[0]);
      return hour < startHour || hour > endHour;
    }
    
    if (condition.operator === 'LESS_THAN') {
      // Check if this is a frequency-based time condition
      const recentActivities = await this.getRecentActivities(context.userId, condition.value);
      return recentActivities.length > 0;
    }
    
    return true;
  }

  /**
   * Evaluate frequency condition
   */
  private static async evaluateFrequencyCondition(
    condition: ActivityCondition, 
    context: ActivityContext, 
    pattern: SuspiciousActivityPattern
  ): Promise<boolean> {
    const recentActivities = await this.getRecentActivities(context.userId, pattern.timeWindowMinutes);
    return this.compareValues(recentActivities.length, condition.operator, condition.value);
  }

  /**
   * Evaluate data change condition
   */
  private static evaluateDataChangeCondition(condition: ActivityCondition, context: ActivityContext): boolean {
    if (!context.metadata || !context.metadata.changes) {
      return false;
    }
    
    const changes = context.metadata.changes;
    if (condition.field) {
      return this.compareValues(changes[condition.field], condition.operator, condition.value);
    }
    
    return Object.values(changes).some(value => 
      this.compareValues(value, condition.operator, condition.value)
    );
  }

  /**
   * Get known IP addresses for a user
   */
  private static async getKnownIPAddresses(userId: string): Promise<string[]> {
    const activities = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      select: {
        ipAddress: true
      },
      distinct: ['ipAddress']
    });
    
    return activities.map(a => a.ipAddress).filter(Boolean);
  }

  /**
   * Get recent activities for frequency analysis
   */
  private static async getRecentActivities(userId: string, minutes: number): Promise<any[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    return await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: since
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get last alert for pattern and user
   */
  private static async getLastAlert(patternId: string, userId: string): Promise<SuspiciousActivityAlert | null> {
    // This would query a suspicious_activity_alerts table
    // For now, return null as we haven't created the table yet
    return null;
  }

  /**
   * Get recent alerts for pattern and user
   */
  private static async getRecentAlerts(patternId: string, userId: string, minutes: number): Promise<SuspiciousActivityAlert[]> {
    // This would query a suspicious_activity_alerts table
    // For now, return empty array
    return [];
  }

  /**
   * Check if alert is in cooldown period
   */
  private static isInCooldown(lastAlert: SuspiciousActivityAlert, cooldownMinutes: number): boolean {
    if (cooldownMinutes === 0) return false;
    
    const cooldownEnd = new Date(lastAlert.triggeredAt.getTime() + cooldownMinutes * 60 * 1000);
    return new Date() < cooldownEnd;
  }

  /**
   * Create suspicious activity alert
   */
  private static async createAlert(pattern: SuspiciousActivityPattern, context: ActivityContext): Promise<SuspiciousActivityAlert> {
    const alert: SuspiciousActivityAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      patternId: pattern.id,
      userId: context.userId,
      severity: pattern.severity,
      title: pattern.name,
      description: pattern.description,
      details: {
        context,
        pattern,
        triggeredAt: new Date()
      },
      triggeredAt: new Date(),
      status: 'ACTIVE'
    };

    // Store alert in database
    await this.storeAlert(alert);
    
    // Send notifications
    await this.sendNotifications(alert);
    
    return alert;
  }

  /**
   * Store alert in database
   */
  private static async storeAlert(alert: SuspiciousActivityAlert): Promise<void> {
    // This would store in a suspicious_activity_alerts table
    // For now, we'll log it
    console.log('Suspicious Activity Alert:', alert);
  }

  /**
   * Send notifications for alert
   */
  private static async sendNotifications(alert: SuspiciousActivityAlert): Promise<void> {
    // Send email to security team
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      await this.sendEmailNotification(alert);
    }
    
    // Send in-app notification to super admins
    await this.sendInAppNotification(alert);
    
    // Log to security log
    await this.logSecurityEvent(alert);
  }

  /**
   * Send email notification
   */
  private static async sendEmailNotification(alert: SuspiciousActivityAlert): Promise<void> {
    // Implementation would send email to security team
    console.log('Email notification sent for alert:', alert.id);
  }

  /**
   * Send in-app notification
   */
  private static async sendInAppNotification(alert: SuspiciousActivityAlert): Promise<void> {
    // Implementation would create in-app notification for super admins
    console.log('In-app notification sent for alert:', alert.id);
  }

  /**
   * Log security event
   */
  private static async logSecurityEvent(alert: SuspiciousActivityAlert): Promise<void> {
    await prisma.auditLog.create({
      data: {
        userId: alert.userId,
        action: 'SUSPICIOUS_ACTIVITY_ALERT',
        resource: 'SECURITY',
        details: {
          alertId: alert.id,
          patternId: alert.patternId,
          severity: alert.severity,
          title: alert.title
        },
        ipAddress: alert.details.context?.ipAddress || 'system',
        userAgent: alert.details.context?.userAgent || 'system'
      }
    });
  }

  /**
   * Get all suspicious activity patterns
   */
  static getPatterns(): SuspiciousActivityPattern[] {
    return this.patterns;
  }

  /**
   * Update pattern configuration
   */
  static updatePattern(patternId: string, updates: Partial<SuspiciousActivityPattern>): void {
    const patternIndex = this.patterns.findIndex(p => p.id === patternId);
    if (patternIndex !== -1) {
      this.patterns[patternIndex] = { ...this.patterns[patternIndex], ...updates };
    }
  }

  /**
   * Get alerts for admin dashboard
   */
  static async getAlerts(filters?: {
    status?: string;
    severity?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: SuspiciousActivityAlert[]; total: number }> {
    // This would query the suspicious_activity_alerts table
    // For now, return mock data
    return {
      alerts: [],
      total: 0
    };
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    // This would update the alert status in database
    console.log(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
  }

  /**
   * Resolve alert
   */
  static async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    // This would update the alert status in database
    console.log(`Alert ${alertId} resolved by ${resolvedBy}: ${resolution}`);
  }
}
