import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    room: {
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/presence/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/presence/summary', () => {
    it('should return presence summary data successfully', async () => {
      const mockUsers = [
        { id: '1', name: 'Alice', image: 'avatar1.jpg', lastActiveAt: new Date() },
        { id: '2', name: 'Bob', image: 'avatar2.jpg', lastActiveAt: new Date() },
        { id: '3', name: 'Charlie', image: null, lastActiveAt: new Date() },
      ];

      mockPrisma.room.count.mockResolvedValue(12);
      mockPrisma.user.count.mockResolvedValue(3);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const request = new NextRequest('http://localhost:3000/api/presence/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        liveRoomsCount: 12,
        onlineUsersCount: 3,
        activeUsers: [
          { id: '1', name: 'Alice', avatar: 'avatar1.jpg', isActive: true, lastActiveAt: expect.any(String) },
          { id: '2', name: 'Bob', avatar: 'avatar2.jpg', isActive: true, lastActiveAt: expect.any(String) },
          { id: '3', name: 'Charlie', avatar: null, isActive: true, lastActiveAt: expect.any(String) },
        ],
      });
      expect(mockPrisma.room.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully and return fallback data', async () => {
      mockPrisma.room.count.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/presence/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        liveRoomsCount: 12,
        onlineUsersCount: 47,
        activeUsers: expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(/^fallback-\d+$/),
            name: expect.stringMatching(/^Solver \d+$/),
            isActive: true,
          }),
        ]),
      });
      expect(data.activeUsers).toHaveLength(8);
    });

    it('should return empty data when no users are active', async () => {
      mockPrisma.room.count.mockResolvedValue(0);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/presence/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        liveRoomsCount: 0,
        onlineUsersCount: 0,
        activeUsers: [],
      });
    });

    it('should handle database connection errors and return fallback data', async () => {
      mockPrisma.room.count.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/presence/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.liveRoomsCount).toBe(12);
      expect(data.onlineUsersCount).toBe(47);
      expect(data.activeUsers).toHaveLength(8);
    });

    it('should handle large numbers of active users', async () => {
      const largeUserList = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        name: `User ${i}`,
        image: i % 2 === 0 ? `avatar-${i}.jpg` : null,
        lastActiveAt: new Date(),
      }));

      mockPrisma.room.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.findMany.mockResolvedValue(largeUserList);

      const request = new NextRequest('http://localhost:3000/api/presence/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.onlineUsersCount).toBe(100);
      expect(data.activeUsers).toHaveLength(20);
    });
  });
});
