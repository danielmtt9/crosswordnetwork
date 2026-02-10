import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { requireAdminAccess } from '@/lib/accessControl';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock authOptions import
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    puzzle: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/lib/accessControl', () => ({
  requireAdminAccess: jest.fn(),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as any;
const mockRequireAdminAccess = requireAdminAccess as jest.MockedFunction<typeof requireAdminAccess>;

describe('/api/admin/puzzles/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return puzzle details for admin', async () => {
      const mockSession = { userId: 'admin123' };
      const mockPuzzle = {
        id: 'puzzle1',
        title: 'Test Puzzle',
        content: 'Test content',
        difficulty: 'EASY',
        category: 'General',
        _count: {
          userProgress: 5,
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRequireAdminAccess.mockResolvedValue(undefined);
      mockPrisma.puzzle.findUnique.mockResolvedValue(mockPuzzle);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1');
      const response = await GET(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPuzzle);
      expect(mockPrisma.puzzle.findUnique).toHaveBeenCalledWith({
        where: { id: 'puzzle1' },
        include: {
          _count: {
            select: {
              userProgress: true,
            },
          },
        },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1');
      const response = await GET(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for non-admin user', async () => {
      const mockSession = { userId: 'user123' };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRequireAdminAccess.mockRejectedValue(new Error('Access denied'));

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1');
      const response = await GET(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
    });

    it('should return 404 for non-existent puzzle', async () => {
      const mockSession = { userId: 'admin123' };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRequireAdminAccess.mockResolvedValue(undefined);
      mockPrisma.puzzle.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/nonexistent');
      const response = await GET(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Puzzle not found');
    });
  });

  describe('PUT', () => {
    it('should update puzzle for admin', async () => {
      const mockSession = { userId: 'admin123' };
      const mockPuzzle = {
        id: 'puzzle1',
        title: 'Updated Puzzle',
        content: 'Updated content',
        difficulty: 'MEDIUM',
        category: 'Updated',
      };

      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRequireAdminAccess.mockResolvedValue(undefined);
      mockPrisma.puzzle.update.mockResolvedValue(mockPuzzle);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1', {
        method: 'PUT',
        body: JSON.stringify({
          title: 'Updated Puzzle',
          content: 'Updated content',
          difficulty: 'MEDIUM',
          category: 'Updated',
        }),
      });

      const response = await PUT(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockPuzzle);
      expect(mockPrisma.puzzle.update).toHaveBeenCalledWith({
        where: { id: 'puzzle1' },
        data: {
          title: 'Updated Puzzle',
          content: 'Updated content',
          difficulty: 'MEDIUM',
          category: 'Updated',
        },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated' }),
      });

      const response = await PUT(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('DELETE', () => {
    it('should delete puzzle for admin', async () => {
      const mockSession = { userId: 'admin123' };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockRequireAdminAccess.mockResolvedValue(undefined);
      mockPrisma.puzzle.delete.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Puzzle deleted successfully');
      expect(mockPrisma.puzzle.delete).toHaveBeenCalledWith({
        where: { id: 'puzzle1' },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles/puzzle1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: { id: 'puzzle1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});