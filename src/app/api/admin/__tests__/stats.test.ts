import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../stats/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
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
    },
  },
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

describe('Admin Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/stats', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
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

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return stats for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      // Mock database responses
      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValueOnce(150); // Active users
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.userProgress.count.mockResolvedValue(5000);
      mockPrisma.multiplayerSession.count.mockResolvedValue(25);

      const mockRecentUsers = [
        {
          id: 'user1',
          name: 'User 1',
          email: 'user1@example.com',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'user2',
          name: 'User 2',
          email: 'user2@example.com',
          createdAt: new Date('2024-01-02'),
        },
      ];

      const mockRecentProgress = [
        {
          id: 'progress1',
          user: { name: 'User 1', email: 'user1@example.com' },
          puzzle: { title: 'Puzzle 1' },
          completedAt: new Date('2024-01-01'),
        },
        {
          id: 'progress2',
          user: { name: 'User 2', email: 'user2@example.com' },
          puzzle: { title: 'Puzzle 2' },
          completedAt: new Date('2024-01-02'),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockRecentUsers as any);
      mockPrisma.userProgress.findMany.mockResolvedValue(mockRecentProgress as any);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        totalUsers: 1000,
        activeUsers: 150,
        totalPuzzles: 50,
        totalProgress: 5000,
        activeRooms: 25,
        newUsersThisMonth: expect.any(Number),
        recentUsers: mockRecentUsers,
        recentProgress: mockRecentProgress,
      });
    });

    it('should calculate new users this month correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      // Mock current date to be in January 2024
      const mockDate = new Date('2024-01-15T12:00:00Z');
      vi.setSystemTime(mockDate);

      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValueOnce(150); // Active users
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.userProgress.count.mockResolvedValue(5000);
      mockPrisma.multiplayerSession.count.mockResolvedValue(25);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.userProgress.findMany.mockResolvedValue([]);

      // Mock count for users created this month
      mockPrisma.user.count.mockResolvedValueOnce(25); // New users this month

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.newUsersThisMonth).toBe(25);

      vi.useRealTimers();
    });

    it('should handle different time periods for active users', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockPrisma.user.count.mockResolvedValue(1000);
      mockPrisma.user.count.mockResolvedValueOnce(150); // Active users (last 24h)
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.userProgress.count.mockResolvedValue(5000);
      mockPrisma.multiplayerSession.count.mockResolvedValue(25);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.userProgress.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/stats?period=7d');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activeUsers).toBe(150);
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

      mockPrisma.user.count.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return empty arrays when no recent data', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValueOnce(0); // Active users
      mockPrisma.puzzle.count.mockResolvedValue(0);
      mockPrisma.userProgress.count.mockResolvedValue(0);
      mockPrisma.multiplayerSession.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.userProgress.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(0);
      expect(data.activeUsers).toBe(0);
      expect(data.totalPuzzles).toBe(0);
      expect(data.totalProgress).toBe(0);
      expect(data.activeRooms).toBe(0);
      expect(data.recentUsers).toEqual([]);
      expect(data.recentProgress).toEqual([]);
    });

    it('should handle different user roles in stats', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      // Mock different user counts by role
      mockPrisma.user.count.mockResolvedValue(1000); // Total users
      mockPrisma.user.count.mockResolvedValueOnce(150); // Active users
      mockPrisma.user.count.mockResolvedValueOnce(800); // Free users
      mockPrisma.user.count.mockResolvedValueOnce(200); // Premium users
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.userProgress.count.mockResolvedValue(5000);
      mockPrisma.multiplayerSession.count.mockResolvedValue(25);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.userProgress.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalUsers).toBe(1000);
      expect(data.activeUsers).toBe(150);
    });
  });
});