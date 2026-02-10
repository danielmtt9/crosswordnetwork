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
      create: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession;
const mockPrisma = prisma;

describe('/api/admin/audit/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export');
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

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should export audit logs as JSON', async () => {
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
        }
      ];

      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs );
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?format=json');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Content-Disposition')).toContain('audit-logs-');
      expect(response.headers.get('Content-Disposition')).toContain('.json');

      const blob = await response.blob();
      const text = await blob.text();
      const data = JSON.parse(text);

      expect(data.exportInfo).toEqual({
        exportedAt: expect.any(String),
        exportedBy: 'admin123',
        totalRecords: 1,
        filters: {
          startDate: null,
          endDate: null,
          action: null,
          entityType: null,
          actorUserId: null
        }
      });

      expect(data.logs).toHaveLength(1);
      expect(data.logs[0]).toEqual({
        id: 'log1',
        timestamp: '2024-01-01T10:00:00.000Z',
        actor: {
          name: 'Admin User',
          email: 'admin@example.com'
        },
        action: 'USER_CREATED',
        entityType: 'USER',
        entityId: 'user456',
        before: null,
        after: { name: 'Test User', email: 'test@example.com' },
        ip: '192.168.1.1'
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'AUDIT_LOG_EXPORTED',
          entityType: 'AUDIT_LOG',
          entityId: 'bulk_export',
          actorUserId: 'admin123',
          details: expect.objectContaining({
            format: 'json',
            recordCount: 1
          })
        }
      });
    });

    it('should export audit logs as CSV', async () => {
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
        }
      ];

      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue(mockLogs );
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?format=csv');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('audit-logs-');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');

      const blob = await response.blob();
      const text = await blob.text();
      const lines = text.split('\n');

      expect(lines[0]).toBe('Timestamp,Actor Name,Actor Email,Action,Entity Type,Entity ID,Before State,After State,IP Address');
      expect(lines[1]).toContain('2024-01-01T10:00:00.000Z');
      expect(lines[1]).toContain('Admin User');
      expect(lines[1]).toContain('admin@example.com');
      expect(lines[1]).toContain('USER_CREATED');
    });

    it('should apply date filters', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?startDate=2024-01-01&endDate=2024-01-31');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31')
            }
          })
        })
      );
    });

    it('should apply action filter', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?action=USER_CREATED');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'USER_CREATED'
          })
        })
      );
    });

    it('should apply entity type filter', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?entityType=USER');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entityType: 'USER'
          })
        })
      );
    });

    it('should apply actor user ID filter', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?actorUserId=admin123');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            actorUserId: 'admin123'
          })
        })
      );
    });

    it('should return 400 for invalid format', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export?format=xml');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid format. Supported formats: json, csv');
    });

    it('should limit results to 10000 records', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue({} );

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10000
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.auditLog.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/audit/export');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to export audit logs');
    });
  });
});
