import { describe, it, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../sessions/route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { isSuperAdmin } from '@/lib/superAdmin';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/superAdmin', () => ({
  isSuperAdmin: vi.fn(),
}));

const mockGetServerSession = vi.mocked(getServerSession);
const mockPrisma = vi.mocked(prisma);
const mockIsSuperAdmin = vi.mocked(isSuperAdmin);

describe('Admin Sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/admin/sessions', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions');
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

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return sessions for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockSessions = [
        {
          id: 'session1',
          sessionCode: 'ABC123',
          host: {
            name: 'Host User',
            email: 'host@example.com',
          },
          puzzle: {
            title: 'Test Puzzle',
            difficulty: 'MEDIUM',
          },
          maxPlayers: 4,
          activePlayersCount: 2,
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          participants: [
            {
              id: 'participant1',
              user: {
                name: 'Player 1',
                email: 'player1@example.com',
              },
              role: 'HOST',
              score: 100,
              joinedAt: new Date('2024-01-01T10:00:00Z'),
            },
            {
              id: 'participant2',
              user: {
                name: 'Player 2',
                email: 'player2@example.com',
              },
              role: 'PLAYER',
              score: 80,
              joinedAt: new Date('2024-01-01T10:05:00Z'),
            },
          ],
        },
        {
          id: 'session2',
          sessionCode: 'DEF456',
          host: {
            name: 'Another Host',
            email: 'another@example.com',
          },
          puzzle: {
            title: 'Another Puzzle',
            difficulty: 'HARD',
          },
          maxPlayers: 6,
          activePlayersCount: 1,
          status: 'WAITING',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          participants: [
            {
              id: 'participant3',
              user: {
                name: 'Player 3',
                email: 'player3@example.com',
              },
              role: 'HOST',
              score: 0,
              joinedAt: new Date('2024-01-01T11:00:00Z'),
            },
          ],
        },
      ];

      mockPrisma.multiplayerSession.findMany.mockResolvedValue(mockSessions as any);
      mockPrisma.multiplayerSession.count.mockResolvedValue(2);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.sessions).toEqual(mockSessions);
      expect(data.pagination.total).toBe(2);
    });

    it('should handle search parameters correctly', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockSessions = [];
      mockPrisma.multiplayerSession.findMany.mockResolvedValue(mockSessions as any);
      mockPrisma.multiplayerSession.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions?status=ACTIVE&page=1&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.multiplayerSession.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
        },
        include: {
          host: {
            select: {
              name: true,
              email: true,
            },
          },
          puzzle: {
            select: {
              title: true,
              difficulty: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
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

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.multiplayerSession.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/admin/sessions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('POST /api/admin/sessions', () => {
    it('should terminate session for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockSession = {
        id: 'session1',
        sessionCode: 'ABC123',
        status: 'COMPLETED',
        updatedAt: new Date('2024-01-01T12:00:00Z'),
      };

      mockPrisma.multiplayerSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.multiplayerSession.update.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'terminate',
          sessionId: 'session1',
          reason: 'Admin terminated session',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Session terminated successfully');
      expect(mockPrisma.multiplayerSession.update).toHaveBeenCalledWith({
        where: { id: 'session1' },
        data: { status: 'COMPLETED' },
      });
    });

    it('should kick participant from session for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const mockSession = {
        id: 'session1',
        sessionCode: 'ABC123',
        status: 'ACTIVE',
        participants: [
          {
            id: 'participant1',
            userId: 'user1',
            role: 'PLAYER',
          },
        ],
      };

      mockPrisma.multiplayerSession.findUnique.mockResolvedValue(mockSession as any);
      mockPrisma.multiplayerSession.update.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'kick_participant',
          sessionId: 'session1',
          participantId: 'participant1',
          reason: 'Inappropriate behavior',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Participant kicked successfully');
    });

    it('should return 404 when session not found', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.multiplayerSession.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'terminate',
          sessionId: 'nonexistent',
          reason: 'Admin terminated session',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
    });

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          // Missing action and sessionId
          reason: 'Some reason',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should validate action type', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid_action',
          sessionId: 'session1',
          reason: 'Some reason',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action type');
    });
  });

  describe('DELETE /api/admin/sessions', () => {
    it('should delete session for admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.multiplayerSession.delete.mockResolvedValue({ id: 'session1' } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/sessions?id=session1', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Session deleted successfully');
    });

    it('should return 404 when session not found', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        user: { email: 'admin@example.com' }
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@example.com'
      } as any);

      mockIsSuperAdmin.mockResolvedValue(false);

      mockPrisma.multiplayerSession.delete.mockRejectedValue(new Error('Record not found'));

      const request = new NextRequest('http://localhost:3000/api/admin/sessions?id=nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Session not found');
    });
  });
});