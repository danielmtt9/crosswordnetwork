import { NextRequest } from 'next/server';
import { GET } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession ;
const mockPrisma = prisma ;

describe('/api/admin/audit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
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

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return audit logs with pagination for admin user', async () => {
      const mockLogs = [
        {
          id: 'log1',
          actorUserId: 'admin123',
          action: 'USER_CREATED',
          entityType: 'USER',
          entityId: 'user456',
          before: null,
          after: { name: 'Test User', email: 'test@example.com' },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          actor: {
            name: 'Admin User',
            email: 'admin@example.com'
          }
        },
        {
          id: 'log2',
          actorUserId: 'admin123',
          action: 'USER_UPDATED',
          entityType: 'USER',
          entityId: 'user456',
          before: { role: 'FREE' },
          after: { role: 'PREMIUM' },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          actor: {
            name: 'Admin User',
            email: 'admin@example.com'
          }
        }
      ];

      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs );
      mockPrisma.auditLog.count.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/admin/audit?page=1&limit=50');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.logs).toEqual(mockLogs);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        pages: 1
      });
    });

    it('should filter audit logs by action', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/audit?action=USER_CREATED');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { action: 'USER_CREATED' }
        })
      );
    });

    it('should filter audit logs by entity type', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/audit?entityType=USER');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { entityType: 'USER' }
        })
      );
    });

    it('should filter audit logs by both action and entity type', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/audit?action=USER_CREATED&entityType=USER');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { 
            action: 'USER_CREATED',
            entityType: 'USER'
          }
        })
      );
    });

    it('should use default pagination values', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // (page 1 - 1) * limit 50
          take: 50
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch audit logs');
    });

    it('should include actor information in results', async () => {
      const mockLogs = [
        {
          id: 'log1',
          actorUserId: 'admin123',
          action: 'USER_CREATED',
          entityType: 'USER',
          entityId: 'user456',
          before: null,
          after: { name: 'Test User' },
          ip: '192.168.1.1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          actor: {
            name: 'Admin User',
            email: 'admin@example.com'
          }
        }
      ];

      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs );
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            actor: {
              select: { name: true, email: true }
            }
          }
        })
      );
    });

    it('should order results by creation date descending', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/audit');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }
        })
      );
    });
  });
});
