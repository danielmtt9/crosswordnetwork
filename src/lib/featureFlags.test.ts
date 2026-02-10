import {
  isFeatureEnabled,
  getUserFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  toggleFeatureFlag,
  rollbackFeatureFlag,
  getSystemConfig,
  setSystemConfig,
  isMaintenanceMode,
  setMaintenanceMode,
  getMaintenanceMessage,
  getFeatureFlagHistory,
  getAllFeatureFlags
} from './featureFlags';
import { prisma } from './prisma';

// Mock Prisma
jest.mock('./prisma', () => ({
  prisma: {
    featureFlag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    featureFlagHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Feature Flags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isFeatureEnabled', () => {
    it('should return false for non-existent flag', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await isFeatureEnabled('non_existent_flag', 'user123');
      expect(result).toBe(false);
    });

    it('should return false for disabled flag', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag1',
        name: 'test_flag',
        enabled: false,
        rolloutPercentage: 0,
        targetUsers: null,
        targetRoles: null,
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1
      } as any);

      const result = await isFeatureEnabled('test_flag', 'user123');
      expect(result).toBe(false);
    });

    it('should return true for enabled flag with 100% rollout', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag1',
        name: 'test_flag',
        enabled: true,
        rolloutPercentage: 100,
        targetUsers: null,
        targetRoles: null,
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1
      } as any);

      const result = await isFeatureEnabled('test_flag', 'user123');
      expect(result).toBe(true);
    });

    it('should return true for targeted user', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag1',
        name: 'test_flag',
        enabled: true,
        rolloutPercentage: 0,
        targetUsers: ['user123', 'user456'],
        targetRoles: null,
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1
      } as any);

      const result = await isFeatureEnabled('test_flag', 'user123');
      expect(result).toBe(true);
    });

    it('should return true for targeted role', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue({
        id: 'flag1',
        name: 'test_flag',
        enabled: true,
        rolloutPercentage: 0,
        targetUsers: null,
        targetRoles: ['PREMIUM'],
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1
      } as any);

      const result = await isFeatureEnabled('test_flag', 'user123', 'PREMIUM');
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.featureFlag.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await isFeatureEnabled('test_flag', 'user123');
      expect(result).toBe(false);
    });
  });

  describe('getUserFeatureFlags', () => {
    it('should return all enabled flags for user', async () => {
      const mockFlags = [
        {
          id: 'flag1',
          name: 'flag1',
          enabled: true,
          rolloutPercentage: 100,
          targetUsers: null,
          targetRoles: null,
          conditions: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          version: 1
        },
        {
          id: 'flag2',
          name: 'flag2',
          enabled: true,
          rolloutPercentage: 0,
          targetUsers: ['user123'],
          targetRoles: null,
          conditions: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          version: 1
        }
      ];

      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFlags as any);
      mockPrisma.featureFlag.findUnique
        .mockResolvedValueOnce(mockFlags[0] as any)
        .mockResolvedValueOnce(mockFlags[1] as any);

      const result = await getUserFeatureFlags('user123', 'PREMIUM');
      expect(result).toEqual({
        flag1: true,
        flag2: true
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.featureFlag.findMany.mockRejectedValue(new Error('Database error'));

      const result = await getUserFeatureFlags('user123', 'PREMIUM');
      expect(result).toEqual({});
    });
  });

  describe('createFeatureFlag', () => {
    it('should create a new feature flag', async () => {
      const mockFlag = {
        id: 'flag1',
        name: 'test_flag',
        description: 'Test flag',
        enabled: false,
        rolloutPercentage: 0,
        targetUsers: null,
        targetRoles: null,
        conditions: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin',
        version: 1
      };

      mockPrisma.featureFlag.create.mockResolvedValue(mockFlag as any);
      mockPrisma.featureFlagHistory.create.mockResolvedValue({} as any);

      const result = await createFeatureFlag('test_flag', 'Test flag', 'admin');
      expect(result).toEqual(mockFlag);
      expect(mockPrisma.featureFlagHistory.create).toHaveBeenCalled();
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update an existing feature flag', async () => {
      const previousFlag = {
        id: 'flag1',
        name: 'test_flag',
        enabled: false,
        rolloutPercentage: 0,
        version: 1
      };

      const updatedFlag = {
        ...previousFlag,
        enabled: true,
        rolloutPercentage: 50,
        version: 2
      };

      mockPrisma.featureFlag.findUnique.mockResolvedValue(previousFlag as any);
      mockPrisma.featureFlag.update.mockResolvedValue(updatedFlag as any);
      mockPrisma.featureFlagHistory.create.mockResolvedValue({} as any);

      const result = await updateFeatureFlag('flag1', { enabled: true, rolloutPercentage: 50 }, 'admin');
      expect(result).toEqual(updatedFlag);
      expect(mockPrisma.featureFlagHistory.create).toHaveBeenCalled();
    });

    it('should throw error for non-existent flag', async () => {
      mockPrisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(updateFeatureFlag('non_existent', {}, 'admin')).rejects.toThrow('Feature flag not found');
    });
  });

  describe('toggleFeatureFlag', () => {
    it('should toggle feature flag enabled state', async () => {
      const flag = {
        id: 'flag1',
        name: 'test_flag',
        enabled: false,
        rolloutPercentage: 0,
        version: 1
      };

      const toggledFlag = {
        ...flag,
        enabled: true,
        version: 2
      };

      mockPrisma.featureFlag.findUnique.mockResolvedValue(flag as any);
      mockPrisma.featureFlag.update.mockResolvedValue(toggledFlag as any);
      mockPrisma.featureFlagHistory.create.mockResolvedValue({} as any);

      const result = await toggleFeatureFlag('flag1', 'admin');
      expect(result).toEqual(toggledFlag);
    });
  });

  describe('System Configuration', () => {
    describe('getSystemConfig', () => {
      it('should return config value', async () => {
        mockPrisma.systemConfig.findUnique.mockResolvedValue({
          id: 'config1',
          key: 'test_key',
          value: { setting: 'value' },
          description: 'Test config',
          category: 'general',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        } as any);

        const result = await getSystemConfig('test_key');
        expect(result).toEqual({ setting: 'value' });
      });

      it('should return null for non-existent config', async () => {
        mockPrisma.systemConfig.findUnique.mockResolvedValue(null);

        const result = await getSystemConfig('non_existent');
        expect(result).toBeNull();
      });

      it('should handle errors gracefully', async () => {
        mockPrisma.systemConfig.findUnique.mockRejectedValue(new Error('Database error'));

        const result = await getSystemConfig('test_key');
        expect(result).toBeNull();
      });
    });

    describe('setSystemConfig', () => {
      it('should create or update system config', async () => {
        const mockConfig = {
          id: 'config1',
          key: 'test_key',
          value: { setting: 'value' },
          description: 'Test config',
          category: 'general',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        };

        mockPrisma.systemConfig.upsert.mockResolvedValue(mockConfig as any);

        const result = await setSystemConfig('test_key', { setting: 'value' }, 'Test config', 'general', false, 'admin');
        expect(result).toEqual(mockConfig);
      });
    });
  });

  describe('Maintenance Mode', () => {
    describe('isMaintenanceMode', () => {
      it('should return true when maintenance mode is enabled', async () => {
        mockPrisma.systemConfig.findUnique.mockResolvedValue({
          id: 'config1',
          key: 'maintenance_mode',
          value: true,
          description: 'Maintenance mode',
          category: 'system',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        } as any);

        const result = await isMaintenanceMode();
        expect(result).toBe(true);
      });

      it('should return false when maintenance mode is disabled', async () => {
        mockPrisma.systemConfig.findUnique.mockResolvedValue({
          id: 'config1',
          key: 'maintenance_mode',
          value: false,
          description: 'Maintenance mode',
          category: 'system',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        } as any);

        const result = await isMaintenanceMode();
        expect(result).toBe(false);
      });
    });

    describe('setMaintenanceMode', () => {
      it('should set maintenance mode', async () => {
        mockPrisma.systemConfig.upsert.mockResolvedValue({} as any);

        await setMaintenanceMode(true, 'System maintenance', 'admin');
        expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(2); // maintenance_mode and maintenance_message
      });
    });

    describe('getMaintenanceMessage', () => {
      it('should return custom maintenance message', async () => {
        mockPrisma.systemConfig.findUnique.mockResolvedValue({
          id: 'config1',
          key: 'maintenance_message',
          value: 'Custom maintenance message',
          description: 'Maintenance message',
          category: 'system',
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          updatedBy: 'admin'
        } as any);

        const result = await getMaintenanceMessage();
        expect(result).toBe('Custom maintenance message');
      });

      it('should return default message when no custom message', async () => {
        mockPrisma.systemConfig.findUnique.mockResolvedValue(null);

        const result = await getMaintenanceMessage();
        expect(result).toBe('The system is currently under maintenance. Please try again later.');
      });
    });
  });

  describe('getFeatureFlagHistory', () => {
    it('should return feature flag history', async () => {
      const mockHistory = [
        {
          id: 'history1',
          featureFlagId: 'flag1',
          action: 'CREATED',
          previousState: null,
          newState: { enabled: false },
          actorUserId: 'admin',
          createdAt: new Date()
        }
      ];

      mockPrisma.featureFlagHistory.findMany.mockResolvedValue(mockHistory as any);

      const result = await getFeatureFlagHistory('flag1');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getAllFeatureFlags', () => {
    it('should return all feature flags', async () => {
      const mockFlags = [
        {
          id: 'flag1',
          name: 'flag1',
          enabled: true,
          rolloutPercentage: 100,
          targetUsers: null,
          targetRoles: null,
          conditions: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'admin',
          version: 1
        }
      ];

      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFlags as any);

      const result = await getAllFeatureFlags();
      expect(result).toEqual(mockFlags);
    });
  });
});
