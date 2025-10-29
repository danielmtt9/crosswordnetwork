import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../security/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/superAdmin';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    loginAttempt: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

describe('Admin Security API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/security', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return security dashboard data for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockSecurityData = {
        failedLogins: [
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
        ],
        suspiciousActivities: [
          {
            id: 'activity1',
            type: 'MULTIPLE_FAILED_LOGINS',
            description: 'Multiple failed login attempts from same IP',
            severity: 'HIGH',
            createdAt: new Date('2024-01-01T12:00:00Z'),
          },
        ],
        securityAlerts: [
          {
            id: 'alert1',
            type: 'BRUTE_FORCE_ATTEMPT',
            message: 'Potential brute force attack detected',
            severity: 'CRITICAL',
            createdAt: new Date('2024-01-01T13:00:00Z'),
          },
        ],
        recentAuditLogs: [
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
            createdAt: new Date('2024-01-01T14:00:00Z'),
          },
        ],
        securityMetrics: {
          totalFailedLogins: 25,
          totalSuspiciousActivities: 5,
          totalSecurityAlerts: 3,
          lastSecurityScan: new Date('2024-01-01T15:00:00Z'),
        },
      };

      mockPrisma.loginAttempt.findMany.mockResolvedValue(mockSecurityData.failedLogins as any);
      mockPrisma.auditLog.findMany.mockResolvedValue(mockSecurityData.recentAuditLogs as any);
      mockPrisma.loginAttempt.count.mockResolvedValue(25);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        failedLogins: mockSecurityData.failedLogins,
        suspiciousActivities: expect.any(Array),
        securityAlerts: expect.any(Array),
        recentAuditLogs: mockSecurityData.recentAuditLogs,
        securityMetrics: expect.objectContaining({
          totalFailedLogins: 25,
          totalSuspiciousActivities: expect.any(Number),
          totalSecurityAlerts: expect.any(Number),
          lastSecurityScan: expect.any(String),
        }),
      });
    });

    it('should return security dashboard data for super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'superadmin123',
        user: { email: 'superadmin@crossword.network' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'superadmin@crossword.network'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(true);

      const mockSecurityData = {
        failedLogins: [],
        suspiciousActivities: [],
        securityAlerts: [],
        recentAuditLogs: [],
        securityMetrics: {
          totalFailedLogins: 0,
          totalSuspiciousActivities: 0,
          totalSecurityAlerts: 0,
          lastSecurityScan: new Date('2024-01-01T15:00:00Z'),
        },
      };

      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.loginAttempt.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.failedLogins).toEqual([]);
      expect(data.suspiciousActivities).toEqual([]);
      expect(data.securityAlerts).toEqual([]);
      expect(data.recentAuditLogs).toEqual([]);
    });

    it('should handle date range filtering', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.loginAttempt.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.loginAttempt.count.mockResolvedValue(0);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const request = new NextRequest(`http://localhost:3000/api/admin/security?startDate=${startDate}&endDate=${endDate}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.loginAttempt.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          success: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.loginAttempt.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/security');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/admin/security', () => {
    it('should create security alert for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const newSecurityAlert = {
        id: 'alert123',
        type: 'MANUAL_ALERT',
        message: 'Manual security alert created',
        severity: 'MEDIUM',
        createdAt: new Date('2024-01-01T16:00:00Z'),
      };

      // Mock the security alert creation (would be implemented in real system)
      const request = new NextRequest('http://localhost:3000/api/admin/security', {
        method: 'POST',
        body: JSON.stringify({
          type: 'MANUAL_ALERT',
          message: 'Manual security alert created',
          severity: 'MEDIUM',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Security alert created successfully');
    });

    it('should return 403 when non-admin tries to create security alert', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/security', {
        method: 'POST',
        body: JSON.stringify({
          type: 'MANUAL_ALERT',
          message: 'Manual security alert created',
          severity: 'MEDIUM',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/security', {
        method: 'POST',
        body: JSON.stringify({
          // Missing type and message
          severity: 'MEDIUM',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should validate severity level', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/security', {
        method: 'POST',
        body: JSON.stringify({
          type: 'MANUAL_ALERT',
          message: 'Manual security alert created',
          severity: 'INVALID_SEVERITY',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid severity level');
    });
  });
});