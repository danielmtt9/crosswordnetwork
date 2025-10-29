import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../feature-flags/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/superAdmin';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    featureFlag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

describe('Admin Feature Flags API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/feature-flags', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags');
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

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return feature flags for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockFeatureFlags = [
        {
          id: 'flag1',
          name: 'new_ui',
          enabled: true,
          rolloutPercentage: 100,
          targetUsers: [],
          conditions: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'flag2',
          name: 'beta_features',
          enabled: false,
          rolloutPercentage: 0,
          targetUsers: [],
          conditions: null,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFeatureFlags as any);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.flags).toEqual(mockFeatureFlags);
    });

    it('should return feature flags for super admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'superadmin123',
        user: { email: 'superadmin@crossword.network' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'superadmin@crossword.network'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(true);

      const mockFeatureFlags = [
        {
          id: 'flag1',
          name: 'new_ui',
          enabled: true,
          rolloutPercentage: 100,
          targetUsers: [],
          conditions: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.featureFlag.findMany.mockResolvedValue(mockFeatureFlags as any);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.flags).toEqual(mockFeatureFlags);
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

      mockPrisma.featureFlag.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/admin/feature-flags', () => {
    it('should create feature flag for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const newFeatureFlag = {
        id: 'flag123',
        name: 'new_feature',
        enabled: false,
        rolloutPercentage: 0,
        targetUsers: [],
        conditions: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.featureFlag.create.mockResolvedValue(newFeatureFlag as any);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          name: 'new_feature',
          enabled: false,
          rolloutPercentage: 0,
          targetUsers: [],
          conditions: null,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.flag).toEqual(newFeatureFlag);
    });

    it('should return 403 when non-admin tries to create feature flag', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'FREE',
        email: 'user@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          name: 'new_feature',
          enabled: false,
          rolloutPercentage: 0,
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

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          // Missing name
          enabled: false,
          rolloutPercentage: 0,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should validate rollout percentage range', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({
          name: 'new_feature',
          enabled: false,
          rolloutPercentage: 150, // Invalid: > 100
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Rollout percentage must be between 0 and 100');
    });
  });

  describe('PUT /api/admin/feature-flags/[flagId]', () => {
    it('should update feature flag for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const updatedFeatureFlag = {
        id: 'flag123',
        name: 'new_feature',
        enabled: true,
        rolloutPercentage: 50,
        targetUsers: ['user1', 'user2'],
        conditions: { userRole: 'PREMIUM' },
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.featureFlag.update.mockResolvedValue(updatedFeatureFlag as any);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags/flag123', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: true,
          rolloutPercentage: 50,
          targetUsers: ['user1', 'user2'],
          conditions: { userRole: 'PREMIUM' },
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.flag).toEqual(updatedFeatureFlag);
    });

    it('should return 404 when feature flag not found', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.featureFlag.update.mockRejectedValue(new Error('Record not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({
          enabled: true,
          rolloutPercentage: 50,
        }),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Feature flag not found');
    });
  });

  describe('DELETE /api/admin/feature-flags/[flagId]', () => {
    it('should delete feature flag for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.featureFlag.delete.mockResolvedValue({ id: 'flag123' } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags/flag123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Feature flag deleted successfully');
    });

    it('should return 404 when feature flag not found', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.featureFlag.delete.mockRejectedValue(new Error('Record not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/feature-flags/nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Feature flag not found');
    });
  });
});