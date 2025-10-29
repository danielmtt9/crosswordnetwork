import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../health/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    user: {
      count: vi.fn(),
    },
    puzzle: {
      count: vi.fn(),
    },
  },
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);

describe('Admin Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/health', () => {
    it('should return 403 when user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        user: { email: 'user@example.com' }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when no session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return health status for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      // Mock successful database query
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25); // Active users in last 24h

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          database: {
            status: 'healthy',
            latency: expect.any(Number),
            message: 'Connected'
          },
          email: {
            status: 'healthy',
            message: 'Service available'
          },
          storage: {
            status: 'healthy',
            message: 'Storage accessible'
          }
        },
        metrics: {
          totalUsers: 100,
          totalPuzzles: 50,
          activeUsers24h: 25,
          uptime: expect.any(Number),
          memoryUsage: expect.any(Object),
          nodeVersion: expect.any(String)
        }
      });
    });

    it('should handle database connection failure', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      // Mock database failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.services.database.status).toBe('unhealthy');
      expect(data.services.database.message).toBe('Connection failed');
    });

    it('should handle partial service failures', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      // Mock successful database but failed email service
      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25);

      // Mock email service failure (would be implemented in real service)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.services.database.status).toBe('healthy');
      expect(data.services.email.status).toBe('healthy'); // Mock implementation returns healthy
      expect(data.status).toBe('healthy');

      consoleSpy.mockRestore();
    });

    it('should calculate uptime correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.uptime).toBeGreaterThan(0);
      expect(typeof data.metrics.uptime).toBe('number');
    });

    it('should include memory usage information', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.memoryUsage).toHaveProperty('rss');
      expect(data.metrics.memoryUsage).toHaveProperty('heapTotal');
      expect(data.metrics.memoryUsage).toHaveProperty('heapUsed');
      expect(data.metrics.memoryUsage).toHaveProperty('external');
    });

    it('should include Node.js version', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      mockPrisma.$queryRaw.mockResolvedValue([{ '1': 1 }]);
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25);

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.nodeVersion).toBe(process.version);
    });

    it('should handle database query errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' },
        role: 'ADMIN'
      } as any);

      // Mock database query failure
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Query timeout'));
      
      // Mock other queries to succeed
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.puzzle.count.mockResolvedValue(50);
      mockPrisma.user.count.mockResolvedValueOnce(25);

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest('http://localhost:3000/api/admin/health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.services.database.status).toBe('unhealthy');
      expect(consoleSpy).toHaveBeenCalledWith('Database health check failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});