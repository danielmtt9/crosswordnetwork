import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../users/route';
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
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

describe('Admin Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user is not admin or super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return users list for admin user', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockUsers);
      expect(data.pagination.total).toBe(2);
    });

    it('should return users list for super admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'superadmin123',
        user: { email: 'superadmin@crossword.network' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'superadmin@crossword.network'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(true);

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
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual(mockUsers);
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

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockUsers = [
        {
          id: 'user1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'FREE',
          subscriptionStatus: 'TRIAL',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/users?search=john&role=FREE&page=1&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } }
          ],
          role: 'FREE',
        },
        select: expect.any(Object),
        skip: 0,
        take: 10,
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

      mockIsSuperAdmin.mockResolvedValue(false);
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create a new user for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const newUser = {
        id: 'newuser123',
        name: 'New User',
        email: 'newuser@example.com',
        role: 'FREE',
        subscriptionStatus: 'TRIAL',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.user.create.mockResolvedValue(newUser as any);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'FREE',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toEqual(newUser);
    });

    it('should return 403 when non-admin tries to create user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New User',
          email: 'newuser@example.com',
          role: 'FREE',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('PUT /api/admin/users', () => {
    it('should update user for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const updatedUser = {
        id: 'user123',
        name: 'Updated User',
        email: 'user@example.com',
        role: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      const request = new NextRequest('http://localhost:3000/api/admin/users', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'user123',
          name: 'Updated User',
          role: 'PREMIUM',
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual(updatedUser);
    });
  });

  describe('DELETE /api/admin/users', () => {
    it('should delete user for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.user.delete.mockResolvedValue({ id: 'user123' } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/users?id=user123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('User deleted successfully');
    });

    it('should prevent deletion of super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      // Mock the user to be deleted as super admin
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        role: 'ADMIN',
        email: 'superadmin@crossword.network'
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/users?id=superadmin123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Cannot delete super admin account');
    });
  });
});