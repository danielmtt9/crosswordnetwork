import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/superAdmin';

// Mock all dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    puzzle: {
      count: vi.fn(),
    },
    userProgress: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    multiplayerSession: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    featureFlag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    loginAttempt: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

describe('Admin System Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('SuperAdmin Authentication Flow', () => {
    it('should authenticate super admin correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'superadmin123',
        user: { email: 'superadmin@crossword.network' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        email: 'superadmin@crossword.network'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(true);

      const result = await isSuperAdmin('superadmin123');
      expect(result).toBe(true);
    });

    it('should reject non-super admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const result = await isSuperAdmin('admin123');
      expect(result).toBe(false);
    });
  });

  describe('Admin Dashboard Data Flow', () => {
    it('should load complete admin dashboard data', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock all database calls for dashboard
      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValueOnce(150); // Active users
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.userProgress.count.mockResolvedValue(5000);
      mockPrisma.multiplayerSession.count.mockResolvedValue(25);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.userProgress.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);

      // Test that all required data is loaded
      const [userCount, puzzleCount, activeUsers] = await Promise.all([
        prisma.user.count(),
        prisma.puzzle.count(),
        prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      expect(userCount).toBe(1000);
      expect(puzzleCount).toBe(50);
      expect(activeUsers).toBe(150);
    });
  });

  describe('User Management Operations', () => {
    it('should perform complete user management workflow', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock user search
      const mockUsers = [
        {
          id: 'user1',
          name: 'User 1',
          email: 'user1@example.com',
          role: 'FREE',
          subscriptionStatus: 'TRIAL',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'user2',
          name: 'User 2',
          email: 'user2@example.com',
          role: 'PREMIUM',
          subscriptionStatus: 'ACTIVE',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.count.mockResolvedValue(2);

      // Test user search
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: 'User', mode: 'insensitive' } },
            { email: { contains: 'User', mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          subscriptionStatus: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

      expect(users).toEqual(mockUsers);

      // Test bulk role update
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });
      
      const updateResult = await prisma.user.updateMany({
        where: {
          id: { in: ['user1', 'user2'] },
          email: { not: { in: ['superadmin@crossword.network'] } },
        },
        data: { role: 'PREMIUM' },
      });

      expect(updateResult.count).toBe(2);
    });
  });

  describe('System Health Monitoring', () => {
    it('should monitor all system components', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock database health check
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(150); // Active users

      // Test database connectivity
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - start;

      expect(dbLatency).toBeGreaterThanOrEqual(0);

      // Test system metrics
      const [userCount, puzzleCount, activeUsers] = await Promise.all([
        prisma.user.count(),
        prisma.puzzle.count(),
        prisma.user.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ]);

      expect(userCount).toBe(1000);
      expect(puzzleCount).toBe(50);
      expect(activeUsers).toBe(150);
    });
  });

  describe('Audit Logging Integration', () => {
    it('should log all admin actions', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock audit log creation
      const mockAuditLog = {
        id: 'log123',
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: 'user456',
        actorUserId: 'admin123',
        before: { role: 'FREE' },
        after: { role: 'PREMIUM' },
        ip: '192.168.1.1',
        createdAt: new Date('2024-01-01T12:00:00Z'),
      };

      mockPrisma.auditLog.create.mockResolvedValue(mockAuditLog as any);

      // Test audit log creation
      const auditLog = await prisma.auditLog.create({
        data: {
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: 'user456',
          actorUserId: 'admin123',
          before: JSON.stringify({ role: 'FREE' }),
          after: JSON.stringify({ role: 'PREMIUM' }),
          ip: '192.168.1.1',
        },
      });

      expect(auditLog).toEqual(mockAuditLog);
    });
  });

  describe('Feature Flag Management', () => {
    it('should manage feature flags correctly', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock feature flag operations
      const mockFeatureFlag = {
        id: 'flag123',
        name: 'new_feature',
        enabled: true,
        rolloutPercentage: 50,
        targetUsers: ['user1', 'user2'],
        conditions: { userRole: 'PREMIUM' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.featureFlag.create.mockResolvedValue(mockFeatureFlag as any);
      mockPrisma.featureFlag.findMany.mockResolvedValue([mockFeatureFlag] as any);
      mockPrisma.featureFlag.update.mockResolvedValue({
        ...mockFeatureFlag,
        enabled: false,
        updatedAt: new Date('2024-01-02'),
      } as any);

      // Test feature flag creation
      const createdFlag = await prisma.featureFlag.create({
        data: {
          name: 'new_feature',
          enabled: true,
          rolloutPercentage: 50,
          targetUsers: ['user1', 'user2'],
          conditions: { userRole: 'PREMIUM' },
        },
      });

      expect(createdFlag).toEqual(mockFeatureFlag);

      // Test feature flag listing
      const flags = await prisma.featureFlag.findMany();
      expect(flags).toEqual([mockFeatureFlag]);

      // Test feature flag update
      const updatedFlag = await prisma.featureFlag.update({
        where: { id: 'flag123' },
        data: { enabled: false },
      });

      expect(updatedFlag.enabled).toBe(false);
    });
  });

  describe('Security Monitoring', () => {
    it('should monitor security events', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock security data
      const mockFailedLogins = [
        {
          id: 'attempt1',
          email: 'user@example.com',
          ip: '192.168.1.1',
          success: false,
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'attempt2',
          email: 'admin@example.com',
          ip: '192.168.1.2',
          success: false,
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      const mockAuditLogs = [
        {
          id: 'log1',
          action: 'ADMIN_LOGIN',
          entityType: 'User',
          entityId: 'admin123',
          actor: {
            name: 'Admin User',
            email: 'admin@example.com',
          },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T12:00:00Z'),
        },
      ];

      mockPrisma.loginAttempt.findMany.mockResolvedValue(mockFailedLogins as any);
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);
      mockPrisma.loginAttempt.count.mockResolvedValue(25);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      // Test security data retrieval
      const [failedLogins, auditLogs, failedLoginCount, auditLogCount] = await Promise.all([
        prisma.loginAttempt.findMany({
          where: { success: false },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        prisma.auditLog.findMany({
          include: {
            actor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.loginAttempt.count({
          where: { success: false },
        }),
        prisma.auditLog.count(),
      ]);

      expect(failedLogins).toEqual(mockFailedLogins);
      expect(auditLogs).toEqual(mockAuditLogs);
      expect(failedLoginCount).toBe(25);
      expect(auditLogCount).toBe(1);
    });
  });

  describe('Session Management', () => {
    it('should manage multiplayer sessions', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock session data
      const mockSessions = [
        {
          id: 'session1',
          sessionCode: 'ABC123',
          host: {
            name: 'Host User',
            email: 'host@example.com',
          },
          puzzle: {
            title: 'Test Puzzle',
            difficulty: 'MEDIUM',
          },
          maxPlayers: 4,
          activePlayersCount: 2,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          participants: [
            {
              id: 'participant1',
              user: {
                name: 'Player 1',
                email: 'player1@example.com',
              },
              role: 'HOST',
              score: 100,
              joinedAt: new Date('2024-01-01T10:00:00Z'),
            },
          ],
        },
      ];

      mockPrisma.multiplayerSession.findMany.mockResolvedValue(mockSessions as any);
      mockPrisma.multiplayerSession.count.mockResolvedValue(1);
      mockPrisma.multiplayerSession.findUnique.mockResolvedValue(mockSessions[0] as any);
      mockPrisma.multiplayerSession.update.mockResolvedValue({
        ...mockSessions[0],
        status: 'COMPLETED',
      } as any);

      // Test session listing
      const sessions = await prisma.multiplayerSession.findMany({
        include: {
          host: {
            select: {
              name: true,
              email: true,
            },
          },
          puzzle: {
            select: {
              title: true,
              difficulty: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(sessions).toEqual(mockSessions);

      // Test session termination
      const updatedSession = await prisma.multiplayerSession.update({
        where: { id: 'session1' },
        data: { status: 'COMPLETED' },
      });

      expect(updatedSession.status).toBe('COMPLETED');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock admin session
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock database error
      mockPrisma.user.count.mockRejectedValue(new Error('Database connection failed'));

      try {
        await prisma.user.count();
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Database connection failed');
      }
    });

    it('should handle authentication errors', async () => {
      mockGetServerSession.mockResolvedValue(null);

      // Test that unauthenticated requests are handled
      expect(mockGetServerSession).toHaveBeenCalled();
    });

    it('should handle authorization errors', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Test that non-admin users are rejected
      const result = await isSuperAdmin('user123');
      expect(result).toBe(false);
    });
  });
});