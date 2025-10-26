import { NextRequest } from 'next/server';
import { GET } from './route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    room: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/rooms/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/rooms/summary', () => {
    it('should return rooms summary data successfully', async () => {
      const mockRooms = [
        {
          id: 'room-1',
          code: 'ABC123',
          status: 'ACTIVE',
          maxParticipants: 8,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          difficulty: 'Medium',
          theme: 'Cozy',
          _count: { participants: 3 },
        },
        {
          id: 'room-2',
          code: 'DEF456',
          status: 'WAITING',
          maxParticipants: 6,
          createdAt: new Date('2024-01-15T10:15:00Z'),
          difficulty: 'Easy',
          theme: 'Social',
          _count: { participants: 2 },
        },
      ];

      mockPrisma.room.findMany.mockResolvedValue(mockRooms);
      mockPrisma.room.count
        .mockResolvedValueOnce(156) // total rooms
        .mockResolvedValueOnce(144); // completed rooms

      const request = new NextRequest('http://localhost:3000/api/rooms/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        activeRooms: [
          {
            id: 'room-1',
            code: 'ABC123',
            status: 'ACTIVE',
            participantCount: 3,
            maxParticipants: 8,
            createdAt: expect.any(String),
            difficulty: 'Medium',
            theme: 'Cozy',
          },
          {
            id: 'room-2',
            code: 'DEF456',
            status: 'WAITING',
            participantCount: 2,
            maxParticipants: 6,
            createdAt: expect.any(String),
            difficulty: 'Easy',
            theme: 'Social',
          },
        ],
        statistics: {
          totalRooms: 156,
          activeRooms: 2,
          completedRooms: 144,
        },
      });
      expect(mockPrisma.room.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.room.count).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully and return fallback data', async () => {
      mockPrisma.room.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/rooms/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        activeRooms: expect.arrayContaining([
          expect.objectContaining({
            id: 'fallback-1',
            code: 'ABC123',
            status: 'ACTIVE',
            participantCount: 4,
            maxParticipants: 8,
            difficulty: 'Medium',
            theme: 'Cozy',
          }),
          expect.objectContaining({
            id: 'fallback-2',
            code: 'DEF456',
            status: 'WAITING',
            participantCount: 2,
            maxParticipants: 6,
            difficulty: 'Easy',
            theme: 'Social',
          }),
        ]),
        statistics: {
          totalRooms: 156,
          activeRooms: 12,
          completedRooms: 144,
        },
      });
    });

    it('should return empty data when no rooms are active', async () => {
      mockPrisma.room.findMany.mockResolvedValue([]);
      mockPrisma.room.count
        .mockResolvedValueOnce(0) // total rooms
        .mockResolvedValueOnce(0); // completed rooms

      const request = new NextRequest('http://localhost:3000/api/rooms/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        activeRooms: [],
        statistics: {
          totalRooms: 0,
          activeRooms: 0,
          completedRooms: 0,
        },
      });
    });

    it('should handle database connection errors and return fallback data', async () => {
      mockPrisma.room.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/rooms/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activeRooms).toHaveLength(2);
      expect(data.statistics.totalRooms).toBe(156);
    });

    it('should handle large numbers of active rooms', async () => {
      const largeRoomList = Array.from({ length: 10 }, (_, i) => ({
        id: `room-${i}`,
        code: `ROOM${i.toString().padStart(2, '0')}`,
        status: 'ACTIVE',
        maxParticipants: 8,
        createdAt: new Date(Date.now() - Math.random() * 3600000),
        difficulty: 'Medium',
        theme: 'Cozy',
        _count: { participants: Math.floor(Math.random() * 5) + 1 },
      }));

      mockPrisma.room.findMany.mockResolvedValue(largeRoomList);
      mockPrisma.room.count
        .mockResolvedValueOnce(100) // total rooms
        .mockResolvedValueOnce(90); // completed rooms

      const request = new NextRequest('http://localhost:3000/api/rooms/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.statistics.activeRooms).toBe(10);
      expect(data.activeRooms).toHaveLength(10);
      expect(data.statistics.totalRooms).toBe(100);
    });

    it('should handle rooms with different statuses', async () => {
      const mixedRooms = [
        {
          id: 'active-room',
          code: 'ACT123',
          status: 'ACTIVE',
          maxParticipants: 8,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          difficulty: 'Medium',
          theme: 'Cozy',
          _count: { participants: 4 },
        },
        {
          id: 'waiting-room',
          code: 'WAI456',
          status: 'WAITING',
          maxParticipants: 6,
          createdAt: new Date('2024-01-15T10:15:00Z'),
          difficulty: 'Easy',
          theme: 'Social',
          _count: { participants: 2 },
        },
      ];

      mockPrisma.room.findMany.mockResolvedValue(mixedRooms);
      mockPrisma.room.count
        .mockResolvedValueOnce(10) // total rooms
        .mockResolvedValueOnce(8); // completed rooms

      const request = new NextRequest('http://localhost:3000/api/rooms/summary');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.activeRooms).toHaveLength(2);
      expect(data.activeRooms[0].status).toBe('ACTIVE');
      expect(data.activeRooms[1].status).toBe('WAITING');
    });
  });
});
