import { SessionMonitoringManager } from './sessionMonitoring';

// Mock prisma
const mockPrisma = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn()
  },
  session: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  }
};

jest.mock('./prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn()
    },
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}));

describe('SessionMonitoringManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trackActivity', () => {
    it('should track admin activity', async () => {
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'session1',
        userId: 'user1',
        expires: new Date(Date.now() + 3600000)
      });
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await SessionMonitoringManager.trackActivity(
        'user1',
        'session1',
        'USER_VIEW',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
        { test: 'data' }
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          action: 'USER_VIEW',
          resource: 'user123',
          details: {
            sessionId: 'session1',
            test: 'data'
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      });
    });

    it('should not track activity if tracking is disabled', async () => {
      // Temporarily disable activity tracking
      const originalConfig = SessionMonitoringManager.getConfig();
      SessionMonitoringManager.updateConfig({ enableActivityTracking: false });

      await SessionMonitoringManager.trackActivity(
        'user1',
        'session1',
        'USER_VIEW',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();

      // Restore original config
      SessionMonitoringManager.updateConfig(originalConfig);
    });
  });

  describe('checkSuspiciousActivity', () => {
    it('should detect rapid-fire actions', async () => {
      const recentActivities = Array(20).fill(null).map((_, i) => ({
        id: `activity${i}`,
        userId: 'user1',
        action: 'USER_VIEW',
        ipAddress: '192.168.1.1',
        createdAt: new Date()
      }));

      mockPrisma.auditLog.findMany.mockResolvedValue(recentActivities);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SessionMonitoringManager.trackActivity(
        'user1',
        'session1',
        'USER_VIEW',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('High frequency of admin actions detected')
      );

      consoleSpy.mockRestore();
    });

    it('should detect multiple IP addresses', async () => {
      const recentActivities = [
        { id: '1', userId: 'user1', action: 'USER_VIEW', ipAddress: '192.168.1.1', createdAt: new Date() },
        { id: '2', userId: 'user1', action: 'USER_VIEW', ipAddress: '192.168.1.2', createdAt: new Date() },
        { id: '3', userId: 'user1', action: 'USER_VIEW', ipAddress: '192.168.1.3', createdAt: new Date() },
        { id: '4', userId: 'user1', action: 'USER_VIEW', ipAddress: '192.168.1.4', createdAt: new Date() }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(recentActivities);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SessionMonitoringManager.trackActivity(
        'user1',
        'session1',
        'USER_VIEW',
        'user123',
        '192.168.1.5',
        'Mozilla/5.0'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple IP addresses detected')
      );

      consoleSpy.mockRestore();
    });

    it('should detect sensitive actions', async () => {
      const recentActivities = [
        { id: '1', userId: 'user1', action: 'USER_DELETE', ipAddress: '192.168.1.1', createdAt: new Date() },
        { id: '2', userId: 'user1', action: 'ROLE_CHANGE', ipAddress: '192.168.1.1', createdAt: new Date() },
        { id: '3', userId: 'user1', action: 'SYSTEM_CONFIG_UPDATE', ipAddress: '192.168.1.1', createdAt: new Date() },
        { id: '4', userId: 'user1', action: 'DATA_EXPORT', ipAddress: '192.168.1.1', createdAt: new Date() },
        { id: '5', userId: 'user1', action: 'USER_DELETE', ipAddress: '192.168.1.1', createdAt: new Date() },
        { id: '6', userId: 'user1', action: 'ROLE_CHANGE', ipAddress: '192.168.1.1', createdAt: new Date() }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(recentActivities);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SessionMonitoringManager.trackActivity(
        'user1',
        'session1',
        'USER_DELETE',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple sensitive actions performed')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('forceLogout', () => {
    it('should force logout user session', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await SessionMonitoringManager.forceLogout('user1', 'session1', 'Security violation');

      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'session1',
          userId: 'user1'
        }
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          action: 'FORCED_LOGOUT',
          resource: 'SESSION',
          details: {
            sessionId: 'session1',
            reason: 'Security violation'
          },
          ipAddress: 'system',
          userAgent: 'system'
        }
      });
    });
  });

  describe('getActiveAdminSessions', () => {
    it('should return active admin sessions', async () => {
      const mockSessions = [
        {
          id: 'session1',
          userId: 'user1',
          createdAt: new Date(),
          expires: new Date(Date.now() + 3600000),
          user: {
            id: 'user1',
            name: 'Admin User',
            email: 'admin@example.com',
            role: 'ADMIN'
          }
        }
      ];

      mockPrisma.session.findMany.mockResolvedValue(mockSessions);
      mockPrisma.auditLog.findFirst.mockResolvedValue({
        createdAt: new Date()
      });
      mockPrisma.auditLog.count.mockResolvedValue(5);

      const sessions = await SessionMonitoringManager.getActiveAdminSessions();

      expect(sessions).toHaveLength(1);
      expect(sessions[0].userId).toBe('user1');
      expect(sessions[0].sessionId).toBe('session1');
      expect(sessions[0].isActive).toBe(true);
    });
  });

  describe('extendSession', () => {
    it('should extend session timeout', async () => {
      const mockSession = {
        id: 'session1',
        userId: 'user1',
        expires: new Date(Date.now() + 3600000)
      };

      mockPrisma.session.findUnique.mockResolvedValue(mockSession);
      mockPrisma.session.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await SessionMonitoringManager.extendSession('user1', 'session1', 30);

      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session1' },
        data: {
          expires: expect.any(Date)
        }
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          action: 'SESSION_EXTENDED',
          resource: 'SESSION',
          details: {
            sessionId: 'session1',
            extensionMinutes: 30,
            newExpiry: expect.any(Date)
          },
          ipAddress: 'system',
          userAgent: 'system'
        }
      });
    });

    it('should throw error if session not found', async () => {
      mockPrisma.session.findUnique.mockResolvedValue(null);

      await expect(
        SessionMonitoringManager.extendSession('user1', 'session1', 30)
      ).rejects.toThrow('Session not found');
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = SessionMonitoringManager.getConfig();

      expect(config).toHaveProperty('adminTimeoutMinutes');
      expect(config).toHaveProperty('superAdminTimeoutMinutes');
      expect(config).toHaveProperty('warningMinutes');
      expect(config).toHaveProperty('maxInactiveMinutes');
      expect(config).toHaveProperty('enableActivityTracking');
      expect(config).toHaveProperty('enableAutoLogout');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = {
        adminTimeoutMinutes: 90,
        enableActivityTracking: false
      };

      SessionMonitoringManager.updateConfig(newConfig);
      const updatedConfig = SessionMonitoringManager.getConfig();

      expect(updatedConfig.adminTimeoutMinutes).toBe(90);
      expect(updatedConfig.enableActivityTracking).toBe(false);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should cleanup expired sessions', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 5 });

      const deletedCount = await SessionMonitoringManager.cleanupExpiredSessions();

      expect(deletedCount).toBe(5);
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: {
          expires: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics', async () => {
      mockPrisma.session.count
        .mockResolvedValueOnce(3) // activeSessions
        .mockResolvedValueOnce(10); // expiredSessions

      mockPrisma.session.findMany.mockResolvedValue([
        {
          createdAt: new Date(Date.now() - 3600000),
          expires: new Date(Date.now() + 3600000)
        },
        {
          createdAt: new Date(Date.now() - 7200000),
          expires: new Date(Date.now() + 7200000)
        }
      ]);

      const statistics = await SessionMonitoringManager.getSessionStatistics();

      expect(statistics).toHaveProperty('activeSessions');
      expect(statistics).toHaveProperty('expiredSessions');
      expect(statistics).toHaveProperty('averageSessionDuration');
      expect(statistics).toHaveProperty('suspiciousSessions');
      expect(statistics.activeSessions).toBe(3);
      expect(statistics.expiredSessions).toBe(10);
    });
  });

  describe('acknowledgeWarning', () => {
    it('should acknowledge session warning', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await SessionMonitoringManager.acknowledgeWarning('user1', 'session1', 'TIMEOUT_WARNING');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning acknowledged: TIMEOUT_WARNING for user user1, session session1'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getSessionActivityHistory', () => {
    it('should return session activity history', async () => {
      const mockActivities = [
        {
          id: 'activity1',
          userId: 'user1',
          action: 'USER_VIEW',
          resource: 'user123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          details: { sessionId: 'session1' }
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockActivities);

      const activities = await SessionMonitoringManager.getSessionActivityHistory('session1');

      expect(activities).toHaveLength(1);
      expect(activities[0].sessionId).toBe('session1');
      expect(activities[0].action).toBe('USER_VIEW');
    });
  });
});
