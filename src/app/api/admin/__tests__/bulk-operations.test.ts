import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '../users/bulk/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/superAdmin';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

describe('Admin Bulk Operations API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/admin/users/bulk', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: ['user1', 'user2'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
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

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: ['user1', 'user2'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should perform bulk role update for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: ['user1', 'user2'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Bulk operation completed successfully');
      expect(data.updatedCount).toBe(2);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user1', 'user2'] },
          email: { not: { in: ['superadmin@crossword.network'] } },
        },
        data: { role: 'PREMIUM' },
      });
    });

    it('should perform bulk status update for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 2 });

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_status',
          userIds: ['user1', 'user2'],
          data: { accountStatus: 'SUSPENDED' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Bulk operation completed successfully');
      expect(data.updatedCount).toBe(2);
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user1', 'user2'] },
          email: { not: { in: ['superadmin@crossword.network'] } },
        },
        data: { accountStatus: 'SUSPENDED' },
      });
    });

    it('should perform bulk delete for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.deleteMany.mockResolvedValue({ count: 2 });

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'delete',
          userIds: ['user1', 'user2'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Bulk operation completed successfully');
      expect(data.deletedCount).toBe(2);
      expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['user1', 'user2'] },
          email: { not: { in: ['superadmin@crossword.network'] } },
        },
      });
    });

    it('should prevent bulk operations on super admin accounts', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'superadmin123', email: 'superadmin@crossword.network' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 }); // Only 1 updated (superadmin excluded)

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: ['user1', 'superadmin123'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Bulk operation completed successfully');
      expect(data.updatedCount).toBe(1);
      expect(data.skippedCount).toBe(1);
      expect(data.skippedUsers).toContain('superadmin123');
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

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          // Missing operation and userIds
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should validate operation type', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'invalid_operation',
          userIds: ['user1', 'user2'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid operation type');
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

      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: ['user1', 'user2'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle empty userIds array', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: [],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No users selected');
    });

    it('should handle transaction rollback on partial failure', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({
          operation: 'update_role',
          userIds: ['user1', 'user2'],
          data: { role: 'PREMIUM' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});