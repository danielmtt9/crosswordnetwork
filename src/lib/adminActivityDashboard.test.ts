// Mock prisma
const mockPrisma = {
  auditLog: {
    count: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    groupBy: jest.fn()
  },
  user: {
    findUnique: jest.fn()
  }
};

import { AdminActivityDashboard } from './adminActivityDashboard';

jest.mock('./prisma', () => ({
  prisma: {
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}));

describe('AdminActivityDashboard', () => {
  const mockPrisma = require('./prisma').prisma;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getActivityMetrics', () => {
    it('should return comprehensive activity metrics', async () => {
      // Mock total actions
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(1000) // totalActions
        .mockResolvedValueOnce(50)   // actionsToday
        .mockResolvedValueOnce(200)  // actionsThisWeek
        .mockResolvedValueOnce(800); // actionsThisMonth

      // Mock unique admins
      mockPrisma.auditLog.findMany.mockResolvedValueOnce([
        { userId: 'admin1' },
        { userId: 'admin2' },
        { userId: 'admin3' }
      ]);

      // Mock top actions
      mockPrisma.auditLog.groupBy.mockResolvedValueOnce([
        { action: 'USER_VIEW', _count: { action: 300 } },
        { action: 'USER_UPDATE', _count: { action: 200 } },
        { action: 'SYSTEM_CONFIG', _count: { action: 100 } }
      ]);

      // Mock top admins
      mockPrisma.auditLog.groupBy.mockResolvedValueOnce([
        {
          userId: 'admin1',
          _count: { userId: 500 },
          _max: { createdAt: new Date() }
        },
        {
          userId: 'admin2',
          _count: { userId: 300 },
          _max: { createdAt: new Date() }
        }
      ]);

      // Mock user details
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ name: 'Admin One' })
        .mockResolvedValueOnce({ name: 'Admin Two' });

      // Mock hourly distribution
      mockPrisma.auditLog.findMany.mockResolvedValueOnce(
        Array(24).fill(null).map((_, i) => ({
          createdAt: new Date(2024, 0, 1, i, 0, 0)
        }))
      );

      // Mock daily trend data
      mockPrisma.auditLog.findMany.mockResolvedValueOnce(
        Array(30).fill(null).map((_, i) => ({
          createdAt: new Date(2024, 0, i + 1, 10, 0, 0)
        }))
      );

      const metrics = await AdminActivityDashboard.getActivityMetrics('30d');

      expect(metrics.totalActions).toBe(1000);
      expect(metrics.actionsToday).toBe(50);
      expect(metrics.actionsThisWeek).toBe(200);
      expect(metrics.actionsThisMonth).toBe(800);
      expect(metrics.uniqueAdmins).toBe(3);
      expect(metrics.averageActionsPerDay).toBeCloseTo(33.33, 2);
      expect(metrics.topActions).toHaveLength(3);
      expect(metrics.topAdmins).toHaveLength(2);
      expect(metrics.hourlyDistribution).toHaveLength(24);
      expect(metrics.dailyTrend).toBeDefined();
    });

    it('should calculate correct percentages for top actions', async () => {
      mockPrisma.auditLog.count.mockResolvedValue(1000);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'USER_VIEW', _count: { action: 500 } },
          { action: 'USER_UPDATE', _count: { action: 300 } }
        ])
        .mockResolvedValueOnce([]);

      const metrics = await AdminActivityDashboard.getActivityMetrics('30d');

      expect(metrics.topActions[0].percentage).toBe(50);
      expect(metrics.topActions[1].percentage).toBe(30);
    });
  });

  describe('getActivityAlerts', () => {
    it('should detect high activity alerts', async () => {
      // Mock high activity detection
      mockPrisma.auditLog.groupBy.mockResolvedValueOnce([
        {
          userId: 'admin1',
          _count: { userId: 150 } // Above threshold of 100
        }
      ]);

      mockPrisma.user.findUnique.mockResolvedValue({
        name: 'High Activity Admin'
      });

      // Mock other detection methods to return empty
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const alerts = await AdminActivityDashboard.getActivityAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('HIGH_ACTIVITY');
      expect(alerts[0].severity).toBe('MEDIUM');
      expect(alerts[0].title).toBe('High Admin Activity Detected');
      expect(alerts[0].adminName).toBe('High Activity Admin');
    });

    it('should detect unusual patterns', async () => {
      // Mock off-hours activity
      const offHoursActivities = Array(15).fill(null).map((_, i) => ({
        userId: 'admin1',
        createdAt: new Date(2024, 0, 1, 23, i, 0), // 11 PM
        user: { name: 'Night Admin' }
      }));

      mockPrisma.auditLog.findMany.mockResolvedValue(offHoursActivities);
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const alerts = await AdminActivityDashboard.getActivityAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('UNUSUAL_PATTERN');
      expect(alerts[0].severity).toBe('LOW');
      expect(alerts[0].title).toBe('Off-Hours Admin Activity');
    });

    it('should detect security events', async () => {
      // Mock failed logins
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(10) // Failed logins above threshold
        .mockResolvedValueOnce(0); // Privilege escalations

      // Mock other detection methods
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const alerts = await AdminActivityDashboard.getActivityAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('SECURITY_EVENT');
      expect(alerts[0].severity).toBe('HIGH');
      expect(alerts[0].title).toBe('Multiple Failed Admin Login Attempts');
    });

    it('should detect system issues', async () => {
      // Mock system configuration changes
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(0) // Failed logins
        .mockResolvedValueOnce(0); // Privilege escalations

      // Mock system config changes
      mockPrisma.auditLog.count.mockResolvedValueOnce(8); // Above threshold

      // Mock other detection methods
      mockPrisma.auditLog.groupBy.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const alerts = await AdminActivityDashboard.getActivityAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('SYSTEM_ISSUE');
      expect(alerts[0].severity).toBe('MEDIUM');
      expect(alerts[0].title).toBe('Multiple System Configuration Changes');
    });
  });

  describe('generateActivityReport', () => {
    it('should generate comprehensive activity report', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock summary data
      mockPrisma.auditLog.count
        .mockResolvedValueOnce(2000) // totalActions
        .mockResolvedValueOnce(5)    // securityEvents
        .mockResolvedValueOnce(10);  // systemChanges

      mockPrisma.auditLog.findMany
        .mockResolvedValueOnce([
          { userId: 'admin1' },
          { userId: 'admin2' }
        ]) // uniqueAdmins
        .mockResolvedValueOnce([
          {
            createdAt: new Date(),
            userId: 'admin1',
            action: 'USER_VIEW',
            resource: 'user123',
            details: { test: 'data' },
            user: { name: 'Admin One' }
          }
        ]); // timeline

      // Mock top actions
      mockPrisma.auditLog.groupBy
        .mockResolvedValueOnce([
          { action: 'USER_VIEW', _count: { action: 1000 } },
          { action: 'USER_UPDATE', _count: { action: 500 } }
        ]) // topActions
        .mockResolvedValueOnce([
          {
            userId: 'admin1',
            _count: { userId: 1000 },
            _max: { createdAt: new Date() }
          }
        ]) // adminActivity
        .mockResolvedValueOnce([
          { action: 'USER_VIEW', _count: { action: 800 } },
          { action: 'USER_UPDATE', _count: { action: 200 } }
        ]) // admin top actions
        .mockResolvedValueOnce([
          { action: 'USER_VIEW', _count: { action: 1000 } },
          { action: 'USER_UPDATE', _count: { action: 500 } }
        ]); // action breakdown

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ name: 'Admin One' })
        .mockResolvedValueOnce({ name: 'Admin One' });

      const report = await AdminActivityDashboard.generateActivityReport(startDate, endDate);

      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.summary.totalActions).toBe(2000);
      expect(report.summary.uniqueAdmins).toBe(2);
      expect(report.summary.securityEvents).toBe(5);
      expect(report.summary.systemChanges).toBe(10);
      expect(report.admins).toHaveLength(1);
      expect(report.actions).toHaveLength(2);
      expect(report.timeline).toHaveLength(1);
    });
  });

  describe('getRealTimeActivityFeed', () => {
    it('should return real-time activity feed', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          createdAt: new Date(),
          userId: 'admin1',
          action: 'USER_VIEW',
          resource: 'user123',
          details: { test: 'data' },
          user: { name: 'Admin One' }
        },
        {
          id: 'activity2',
          createdAt: new Date(),
          userId: 'admin2',
          action: 'SYSTEM_CONFIG_UPDATE',
          resource: 'config',
          details: { setting: 'value' },
          user: { name: 'Admin Two' }
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockActivities);

      const feed = await AdminActivityDashboard.getRealTimeActivityFeed();

      expect(feed).toHaveLength(2);
      expect(feed[0].adminName).toBe('Admin One');
      expect(feed[0].action).toBe('USER_VIEW');
      expect(feed[0].severity).toBe('LOW');
      expect(feed[1].adminName).toBe('Admin Two');
      expect(feed[1].action).toBe('SYSTEM_CONFIG_UPDATE');
      expect(feed[1].severity).toBe('CRITICAL');
    });
  });

  describe('getAdminActivityStats', () => {
    it('should return admin-specific activity statistics', async () => {
      const adminId = 'admin1';
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Mock total actions
      mockPrisma.auditLog.count.mockResolvedValueOnce(500);

      // Mock top actions
      mockPrisma.auditLog.groupBy.mockResolvedValueOnce([
        { action: 'USER_VIEW', _count: { action: 300 } },
        { action: 'USER_UPDATE', _count: { action: 200 } }
      ]);

      // Mock last activity
      mockPrisma.auditLog.findFirst.mockResolvedValue({
        createdAt: new Date()
      });

      const stats = await AdminActivityDashboard.getAdminActivityStats(adminId, '30d');

      expect(stats.totalActions).toBe(500);
      expect(stats.topActions).toHaveLength(2);
      expect(stats.topActions[0].action).toBe('USER_VIEW');
      expect(stats.topActions[0].count).toBe(300);
      expect(stats.lastActivity).toBeDefined();
      expect(stats.averageActionsPerDay).toBeCloseTo(16.67, 2);
    });
  });

  describe('getActionSeverity', () => {
    it('should correctly classify action severity', () => {
      const getActionSeverity = AdminActivityDashboard.getActionSeverity;

      expect(getActionSeverity('ROLE_CHANGE')).toBe('CRITICAL');
      expect(getActionSeverity('USER_DELETE')).toBe('CRITICAL');
      expect(getActionSeverity('SYSTEM_CONFIG_UPDATE')).toBe('CRITICAL');
      expect(getActionSeverity('USER_SUSPEND')).toBe('HIGH');
      expect(getActionSeverity('USER_BAN')).toBe('HIGH');
      expect(getActionSeverity('DATA_EXPORT')).toBe('HIGH');
      expect(getActionSeverity('USER_UPDATE')).toBe('MEDIUM');
      expect(getActionSeverity('PUZZLE_DELETE')).toBe('MEDIUM');
      expect(getActionSeverity('USER_VIEW')).toBe('LOW');
      expect(getActionSeverity('UNKNOWN_ACTION')).toBe('LOW');
    });
  });

  describe('getHourlyDistribution', () => {
    it('should return hourly distribution data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      // Mock activities with different hours
      const mockActivities = [
        { createdAt: new Date('2024-01-01T09:00:00') },
        { createdAt: new Date('2024-01-01T09:30:00') },
        { createdAt: new Date('2024-01-01T14:00:00') },
        { createdAt: new Date('2024-01-01T14:15:00') },
        { createdAt: new Date('2024-01-01T14:30:00') }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockActivities);

      const hourlyData = await (AdminActivityDashboard as any).getHourlyDistribution(startDate, endDate);

      expect(hourlyData).toHaveLength(24);
      expect(hourlyData[9].count).toBe(2); // 9 AM
      expect(hourlyData[14].count).toBe(3); // 2 PM
    });
  });

  describe('getDailyTrend', () => {
    it('should return daily trend data', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');

      // Mock activities for different days
      const mockActivities = [
        { createdAt: new Date('2024-01-01T10:00:00') },
        { createdAt: new Date('2024-01-01T11:00:00') },
        { createdAt: new Date('2024-01-02T10:00:00') },
        { createdAt: new Date('2024-01-02T11:00:00') },
        { createdAt: new Date('2024-01-02T12:00:00') }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockActivities);

      const dailyTrend = await (AdminActivityDashboard as any).getDailyTrend(startDate, endDate);

      expect(dailyTrend).toHaveLength(3); // 3 days
      expect(dailyTrend[0].count).toBe(2); // Jan 1
      expect(dailyTrend[1].count).toBe(3); // Jan 2
      expect(dailyTrend[2].count).toBe(0); // Jan 3
    });
  });
});
