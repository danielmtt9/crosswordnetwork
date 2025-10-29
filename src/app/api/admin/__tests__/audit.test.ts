import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../audit/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

describe('Admin Audit API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/audit', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
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

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return audit logs for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      const mockAuditLogs = [
        {
          id: 'log1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user123',
          actor: {
            name: 'Admin User',
            email: 'admin@example.com'
          },
          before: null,
          after: { name: 'New User', email: 'user@example.com' },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
        {
          id: 'log2',
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: 'user456',
          actor: {
            name: 'Admin User',
            email: 'admin@example.com'
          },
          before: { role: 'FREE' },
          after: { role: 'PREMIUM' },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T11:00:00Z'),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);
      mockPrisma.auditLog.count.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toEqual(mockAuditLogs);
      expect(data.pagination.total).toBe(2);
    });

    it('should handle search parameters correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      const mockAuditLogs = [
        {
          id: 'log1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user123',
          actor: {
            name: 'Admin User',
            email: 'admin@example.com'
          },
          before: null,
          after: { name: 'New User', email: 'user@example.com' },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
        },
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/audit?action=USER_CREATED&entityType=User&page=1&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: 'USER_CREATED',
          entityType: 'User',
        },
        include: {
          actor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
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

      const mockAuditLogs = [];
      mockPrisma.auditLog.findMany.mockResolvedValue(mockAuditLogs as any);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const request = new NextRequest(`http://localhost:3000/api/admin/audit?startDate=${startDate}&endDate=${endDate}`);
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        include: {
          actor: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
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

      mockPrisma.auditLog.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/admin/audit', () => {
    it('should create audit log entry for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      const newAuditLog = {
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

      mockPrisma.auditLog.create.mockResolvedValue(newAuditLog as any);

      const request = new NextRequest('http://localhost:3000/api/admin/audit', {
        method: 'POST',
        body: JSON.stringify({
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: 'user456',
          before: { role: 'FREE' },
          after: { role: 'PREMIUM' },
          ip: '192.168.1.1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.log).toEqual(newAuditLog);
    });

    it('should return 403 when non-admin tries to create audit log', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/audit', {
        method: 'POST',
        body: JSON.stringify({
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: 'user456',
          before: { role: 'FREE' },
          after: { role: 'PREMIUM' },
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

      const request = new NextRequest('http://localhost:3000/api/admin/audit', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          entityId: 'user456',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should handle database errors during creation', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockPrisma.auditLog.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/audit', {
        method: 'POST',
        body: JSON.stringify({
          action: 'USER_UPDATED',
          entityType: 'User',
          entityId: 'user456',
          before: { role: 'FREE' },
          after: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});