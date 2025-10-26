import { NextRequest } from 'next/server';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      count: jest.fn(),
    },
    puzzle: {
      count: jest.fn(),
    },
    multiplayerRoom: {
      count: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession ;
const mockPrisma = prisma ;

describe('/api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
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

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return admin statistics for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock various counts
      mockPrisma.user.count
        .mockResolvedValueOnce(100)  // totalUsers
        .mockResolvedValueOnce(75)   // activeUsers
        .mockResolvedValueOnce(20)   // newUsersThisMonth
        .mockResolvedValueOnce(15)   // premiumUsers
        .mockResolvedValueOnce(5)    // trialUsers
        .mockResolvedValueOnce(2);   // adminUsers

      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.multiplayerRoom.count.mockResolvedValue(8);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.stats).toEqual({
        totalUsers: 100,
        activeUsers: 75,
        totalPuzzles: 50,
        activeRooms: 8,
        monthlyRevenue: 0, // TODO: Implement Stripe integration
        conversionRate: 15, // 15/100 * 100
        newUsersThisMonth: 20,
        premiumUsers: 15,
        trialUsers: 5,
        adminUsers: 2
      });
    });

    it('should handle zero users correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock zero counts
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.puzzle.count.mockResolvedValue(0);
      mockPrisma.multiplayerRoom.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.stats.conversionRate).toBe(0);
      expect(data.stats.totalUsers).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock database error
      mockPrisma.user.count.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch admin statistics');
    });

    it('should calculate conversion rate correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock counts with specific conversion rate
      mockPrisma.user.count
        .mockResolvedValueOnce(200)  // totalUsers
        .mockResolvedValueOnce(150)  // activeUsers
        .mockResolvedValueOnce(30)   // newUsersThisMonth
        .mockResolvedValueOnce(40)   // premiumUsers (20% conversion)
        .mockResolvedValueOnce(10)   // trialUsers
        .mockResolvedValueOnce(3);   // adminUsers

      mockPrisma.puzzle.count.mockResolvedValue(100);
      mockPrisma.multiplayerRoom.count.mockResolvedValue(12);

      const request = new NextRequest('http://localhost:3000/api/admin/stats');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.stats.conversionRate).toBe(20); // 40/200 * 100
    });
  });
});
