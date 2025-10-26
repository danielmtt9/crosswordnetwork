import { NextRequest } from 'next/server';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn(),
    },
    puzzle: {
      count: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession;
const mockPrisma = prisma;

describe('/api/admin/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
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

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return healthy status when all services are working', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(100).mockResolvedValueOnce(25); // For active users

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.status).toBe('healthy');
      expect(data.services.database.status).toBe('healthy');
      expect(data.services.email.status).toBe('healthy');
      expect(data.services.storage.status).toBe('healthy');
      expect(data.metrics.totalUsers).toBe(100);
      expect(data.metrics.totalPuzzles).toBe(50);
      expect(data.metrics.activeUsers24h).toBe(25);
    });

    it('should return degraded status when database is unhealthy', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock database failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.status).toBe('degraded');
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.database.message).toBe('Connection failed');
    });

    it('should include system metrics', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(100).mockResolvedValueOnce(25);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.metrics).toEqual({
        totalUsers: 100,
        totalPuzzles: 50,
        activeUsers24h: 25,
        uptime: expect.any(Number),
        memoryUsage: expect.any(Object),
        nodeVersion: expect.any(String)
      });
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      // Mock unexpected error
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.status).toBe('degraded');
      expect(data.services.database.status).toBe('unhealthy');
    });
  });
});
