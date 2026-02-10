import { SuspiciousActivityDetector, ActivityContext } from './suspiciousActivity';

// Mock prisma
const mockPrisma = {
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn()
  }
};

jest.mock('./prisma', () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn()
    }
  }
}));

describe('SuspiciousActivityDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeActivity', () => {
    it('should detect rapid admin actions', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'USER_SUSPEND',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock recent activities to trigger frequency condition
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: '1', userId: 'admin1', action: 'USER_SUSPEND', createdAt: new Date() },
        { id: '2', userId: 'admin1', action: 'USER_BAN', createdAt: new Date() },
        { id: '3', userId: 'admin1', action: 'USER_DELETE', createdAt: new Date() },
        { id: '4', userId: 'admin1', action: 'ROLE_CHANGE', createdAt: new Date() },
        { id: '5', userId: 'admin1', action: 'SYSTEM_CONFIG', createdAt: new Date() },
        { id: '6', userId: 'admin1', action: 'DATA_EXPORT', createdAt: new Date() },
        { id: '7', userId: 'admin1', action: 'FEATURE_FLAG', createdAt: new Date() },
        { id: '8', userId: 'admin1', action: 'AUDIT_EXPORT', createdAt: new Date() },
        { id: '9', userId: 'admin1', action: 'USER_SUSPEND', createdAt: new Date() },
        { id: '10', userId: 'admin1', action: 'USER_BAN', createdAt: new Date() },
        { id: '11', userId: 'admin1', action: 'USER_DELETE', createdAt: new Date() }
      ]);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('rapid_admin_actions');
      expect(alerts[0].severity).toBe('MEDIUM');
    });

    it('should detect bulk user operations', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'USER_SUSPEND',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock recent activities to trigger bulk operations pattern
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: '1', userId: 'admin1', action: 'USER_SUSPEND', createdAt: new Date() },
        { id: '2', userId: 'admin1', action: 'USER_BAN', createdAt: new Date() },
        { id: '3', userId: 'admin1', action: 'USER_DELETE', createdAt: new Date() },
        { id: '4', userId: 'admin1', action: 'USER_SUSPEND', createdAt: new Date() },
        { id: '5', userId: 'admin1', action: 'USER_BAN', createdAt: new Date() },
        { id: '6', userId: 'admin1', action: 'USER_DELETE', createdAt: new Date() }
      ]);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('bulk_user_operations');
      expect(alerts[0].severity).toBe('HIGH');
    });

    it('should detect privilege escalation attempts', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'ROLE_CHANGE',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {
          changes: {
            role: 'ADMIN'
          }
        }
      };

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('privilege_escalation_attempts');
      expect(alerts[0].severity).toBe('CRITICAL');
    });

    it('should detect off-hours admin activity', async () => {
      // Set time to 2 AM
      const offHoursTime = new Date();
      offHoursTime.setHours(2, 0, 0, 0);

      const context: ActivityContext = {
        userId: 'admin1',
        action: 'USER_SUSPEND',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: offHoursTime,
        metadata: {}
      };

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('off_hours_admin_activity');
      expect(alerts[0].severity).toBe('LOW');
    });

    it('should detect unusual IP address', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'USER_SUSPEND',
        resource: 'user123',
        ipAddress: '203.0.113.1', // New IP address
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock no known IP addresses
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('unusual_ip_address');
      expect(alerts[0].severity).toBe('MEDIUM');
    });

    it('should detect mass data export', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'DATA_EXPORT',
        resource: 'users',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock recent export activities
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: '1', userId: 'admin1', action: 'DATA_EXPORT', createdAt: new Date() },
        { id: '2', userId: 'admin1', action: 'AUDIT_EXPORT', createdAt: new Date() },
        { id: '3', userId: 'admin1', action: 'DATA_EXPORT', createdAt: new Date() },
        { id: '4', userId: 'admin1', action: 'AUDIT_EXPORT', createdAt: new Date() }
      ]);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('mass_data_export');
      expect(alerts[0].severity).toBe('HIGH');
    });

    it('should detect system configuration changes', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'SYSTEM_CONFIG_UPDATE',
        resource: 'maintenance_mode',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {
          changes: {
            maintenanceMode: true
          }
        }
      };

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('system_configuration_changes');
      expect(alerts[0].severity).toBe('HIGH');
    });

    it('should detect failed login attempts', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'LOGIN_FAILED',
        resource: 'authentication',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock recent failed login attempts
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: '1', userId: 'admin1', action: 'LOGIN_FAILED', createdAt: new Date() },
        { id: '2', userId: 'admin1', action: 'LOGIN_FAILED', createdAt: new Date() },
        { id: '3', userId: 'admin1', action: 'LOGIN_FAILED', createdAt: new Date() },
        { id: '4', userId: 'admin1', action: 'LOGIN_FAILED', createdAt: new Date() },
        { id: '5', userId: 'admin1', action: 'LOGIN_FAILED', createdAt: new Date() },
        { id: '6', userId: 'admin1', action: 'LOGIN_FAILED', createdAt: new Date() }
      ]);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].patternId).toBe('failed_login_attempts');
      expect(alerts[0].severity).toBe('MEDIUM');
    });

    it('should not trigger alerts for normal activity', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'USER_VIEW',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock minimal recent activities
      mockPrisma.auditLog.findMany.mockResolvedValue([
        { id: '1', userId: 'admin1', action: 'USER_VIEW', createdAt: new Date() }
      ]);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(0);
    });

    it('should respect cooldown periods', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'ROLE_CHANGE',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {
          changes: {
            role: 'ADMIN'
          }
        }
      };

      // Mock recent alert within cooldown period
      const recentAlert = {
        id: 'alert1',
        patternId: 'privilege_escalation_attempts',
        userId: 'admin1',
        triggeredAt: new Date(Date.now() - 30 * 1000) // 30 seconds ago
      };

      // Mock the getLastAlert method to return recent alert
      jest.spyOn(SuspiciousActivityDetector as any, 'getLastAlert').mockResolvedValue(recentAlert);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(0);
    });

    it('should respect max occurrences', async () => {
      const context: ActivityContext = {
        userId: 'admin1',
        action: 'USER_SUSPEND',
        resource: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
        metadata: {}
      };

      // Mock recent alerts exceeding max occurrences
      const recentAlerts = [
        { id: 'alert1', patternId: 'bulk_user_operations', userId: 'admin1', triggeredAt: new Date() },
        { id: 'alert2', patternId: 'bulk_user_operations', userId: 'admin1', triggeredAt: new Date() },
        { id: 'alert3', patternId: 'bulk_user_operations', userId: 'admin1', triggeredAt: new Date() }
      ];

      // Mock the getRecentAlerts method
      jest.spyOn(SuspiciousActivityDetector as any, 'getRecentAlerts').mockResolvedValue(recentAlerts);

      const alerts = await SuspiciousActivityDetector.analyzeActivity(context);

      expect(alerts).toHaveLength(0);
    });
  });

  describe('getPatterns', () => {
    it('should return all security patterns', () => {
      const patterns = SuspiciousActivityDetector.getPatterns();
      
      expect(patterns).toHaveLength(8);
      expect(patterns[0]).toHaveProperty('id');
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('description');
      expect(patterns[0]).toHaveProperty('severity');
      expect(patterns[0]).toHaveProperty('enabled');
    });
  });

  describe('updatePattern', () => {
    it('should update pattern configuration', () => {
      const patterns = SuspiciousActivityDetector.getPatterns();
      const originalPattern = patterns.find(p => p.id === 'rapid_admin_actions');
      
      expect(originalPattern?.enabled).toBe(true);
      
      SuspiciousActivityDetector.updatePattern('rapid_admin_actions', { enabled: false });
      
      const updatedPattern = patterns.find(p => p.id === 'rapid_admin_actions');
      expect(updatedPattern?.enabled).toBe(false);
    });
  });

  describe('getAlerts', () => {
    it('should return alerts with filters', async () => {
      const result = await SuspiciousActivityDetector.getAlerts({
        status: 'ACTIVE',
        severity: 'HIGH',
        limit: 10,
        offset: 0
      });

      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.alerts)).toBe(true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await SuspiciousActivityDetector.acknowledgeAlert('alert1', 'admin1');
      
      expect(consoleSpy).toHaveBeenCalledWith('Alert alert1 acknowledged by admin1');
      
      consoleSpy.mockRestore();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await SuspiciousActivityDetector.resolveAlert('alert1', 'admin1', 'False positive');
      
      expect(consoleSpy).toHaveBeenCalledWith('Alert alert1 resolved by admin1: False positive');
      
      consoleSpy.mockRestore();
    });
  });
});
