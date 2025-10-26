import { NextRequest } from 'next/server';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerRoom: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    roomParticipant: {
      count: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession ;
const mockPrisma = prisma ;

describe('/api/admin/room-lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/room-lifecycle');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        role: 'USER'
      } );

      const request = new NextRequest('http://localhost:3000/api/admin/room-lifecycle');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return room lifecycle statistics for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock room counts by status
      mockPrisma.multiplayerRoom.count
        .mockResolvedValueOnce(5)  // WAITING
        .mockResolvedValueOnce(3)  // ACTIVE
        .mockResolvedValueOnce(10) // COMPLETED
        .mockResolvedValueOnce(2); // EXPIRED

      // Mock recent rooms
      const mockRecentRooms = [
        {
          id: 'room1',
          name: 'Test Room 1',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          _count: { participants: 3 }
        },
        {
          id: 'room2',
          name: 'Test Room 2',
          status: 'COMPLETED',
          createdAt: new Date('2024-01-01T09:00:00Z'),
          _count: { participants: 2 }
        }
      ];

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(mockRecentRooms );

      // Mock total participants
      mockPrisma.roomParticipant.count.mockResolvedValue(15);

      const request = new NextRequest('http://localhost:3000/api/admin/room-lifecycle');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.stats).toEqual({
        totalRooms: 20,
        waitingRooms: 5,
        activeRooms: 3,
        completedRooms: 10,
        expiredRooms: 2,
        totalParticipants: 15
      });

      expect(data.recentRooms).toEqual(mockRecentRooms);
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock database error
      mockPrisma.multiplayerRoom.count.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/room-lifecycle');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch room lifecycle statistics');
    });

    it('should return empty statistics when no rooms exist', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock empty results
      mockPrisma.multiplayerRoom.count.mockResolvedValue(0);
      mockPrisma.multiplayerRoom.findMany.mockResolvedValue([]);
      mockPrisma.roomParticipant.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/room-lifecycle');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.stats).toEqual({
        totalRooms: 0,
        waitingRooms: 0,
        activeRooms: 0,
        completedRooms: 0,
        expiredRooms: 0,
        totalParticipants: 0
      });

      expect(data.recentRooms).toEqual([]);
    });
  });
});
