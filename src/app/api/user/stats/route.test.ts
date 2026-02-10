import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    userStats: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/user/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/user/stats');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should return user stats when user exists', async () => {
      const mockUserStats = {
        id: 'stats-1',
        userId: 'user-1',
        totalPuzzlesStarted: 10,
        totalPuzzlesCompleted: 8,
        totalPlayTime: 3600,
        averageAccuracy: 95.5,
        averageCompletionTime: 450,
        currentStreak: 5,
        longestStreak: 10,
        totalScore: 1000,
        achievementPoints: 50,
        globalRank: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.findUnique.mockResolvedValueOnce(mockUserStats);
      mockPrisma.userStats.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/user/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        ...mockUserStats,
        globalRank: 1,
      });
    });

    it('should create initial stats if user stats do not exist', async () => {
      const mockCreatedStats = {
        id: 'stats-1',
        userId: 'user-1',
        totalPuzzlesStarted: 0,
        totalPuzzlesCompleted: 0,
        totalPlayTime: 0,
        averageAccuracy: 100.0,
        averageCompletionTime: 0.0,
        currentStreak: 0,
        longestStreak: 0,
        totalScore: 0,
        achievementPoints: 0,
        globalRank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.findUnique.mockResolvedValueOnce(null);
      mockPrisma.userStats.create.mockResolvedValueOnce(mockCreatedStats);
      mockPrisma.userStats.findMany.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost:3000/api/user/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.userStats.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          totalPuzzlesStarted: 0,
          totalPuzzlesCompleted: 0,
          totalPlayTime: 0,
          averageAccuracy: 100.0,
          averageCompletionTime: 0.0,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 0,
          achievementPoints: 0,
        },
      });
    });

    it('should update rank if it has changed', async () => {
      const mockUserStats = {
        id: 'stats-1',
        userId: 'user-1',
        totalPuzzlesStarted: 10,
        totalPuzzlesCompleted: 8,
        totalPlayTime: 3600,
        averageAccuracy: 95.5,
        averageCompletionTime: 450,
        currentStreak: 5,
        longestStreak: 10,
        totalScore: 1000,
        achievementPoints: 50,
        globalRank: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedStats = { ...mockUserStats, globalRank: 1 };

      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.findUnique.mockResolvedValueOnce(mockUserStats);
      mockPrisma.userStats.findMany.mockResolvedValueOnce([]);
      mockPrisma.userStats.update.mockResolvedValueOnce(updatedStats);

      const request = new NextRequest('http://localhost:3000/api/user/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.userStats.update).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { globalRank: 1 },
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.findUnique.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/stats');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch user stats');
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/user/stats', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Authentication required');
    });

    it('should update user stats with provided data', async () => {
      const updateData = {
        puzzlesCompleted: 1,
        totalScore: 100,
        playTime: 300,
        accuracy: 95.0,
        completionTime: 300,
      };

      const mockUpdatedStats = {
        id: 'stats-1',
        userId: 'user-1',
        totalPuzzlesStarted: 0,
        totalPuzzlesCompleted: 1,
        totalPlayTime: 300,
        averageAccuracy: 95.0,
        averageCompletionTime: 300,
        currentStreak: 0,
        longestStreak: 0,
        totalScore: 100,
        achievementPoints: 0,
        globalRank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.upsert.mockResolvedValueOnce(mockUpdatedStats);

      const request = new NextRequest('http://localhost:3000/api/user/stats', {
        method: 'POST',
        body: JSON.stringify(updateData),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.userStats.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {
          totalPuzzlesCompleted: { increment: 1 },
          totalScore: { increment: 100 },
          totalPlayTime: { increment: 300 },
          averageAccuracy: 95.0,
          averageCompletionTime: 300,
          lastPlayedDate: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          totalPuzzlesStarted: 0,
          totalPuzzlesCompleted: 1,
          totalPlayTime: 300,
          averageAccuracy: 95.0,
          averageCompletionTime: 300,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 100,
          achievementPoints: 0,
          lastPlayedDate: expect.any(Date),
        },
      });
    });

    it('should create new stats if user stats do not exist', async () => {
      const updateData = {
        puzzlesCompleted: 1,
        totalScore: 100,
      };

      const mockCreatedStats = {
        id: 'stats-1',
        userId: 'user-1',
        totalPuzzlesStarted: 0,
        totalPuzzlesCompleted: 1,
        totalPlayTime: 0,
        averageAccuracy: 100.0,
        averageCompletionTime: 0.0,
        currentStreak: 0,
        longestStreak: 0,
        totalScore: 100,
        achievementPoints: 0,
        globalRank: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.upsert.mockResolvedValueOnce(mockCreatedStats);

      const request = new NextRequest('http://localhost:3000/api/user/stats', {
        method: 'POST',
        body: JSON.stringify(updateData),
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.userStats.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: {
          totalPuzzlesCompleted: { increment: 1 },
          totalScore: { increment: 100 },
          lastPlayedDate: expect.any(Date),
        },
        create: {
          userId: 'user-1',
          totalPuzzlesStarted: 0,
          totalPuzzlesCompleted: 1,
          totalPlayTime: 0,
          averageAccuracy: 100.0,
          averageCompletionTime: 0.0,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 100,
          achievementPoints: 0,
          lastPlayedDate: expect.any(Date),
        },
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValueOnce({ userId: 'user-1' });
      mockPrisma.userStats.upsert.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/stats', {
        method: 'POST',
        body: JSON.stringify({ puzzlesCompleted: 1 }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update user stats');
    });
  });
});
