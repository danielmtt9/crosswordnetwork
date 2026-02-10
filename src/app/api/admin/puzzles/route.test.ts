import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    puzzle: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession ;
const mockPrisma = prisma ;

describe('/api/admin/puzzles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles');
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

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles');
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden');
    });

    it('should return puzzles with pagination for admin user', async () => {
      const mockPuzzles = [
        {
          id: 1,
          title: 'Test Puzzle 1',
          description: 'Test description',
          filename: 'test1.html',
          original_filename: 'test1.html',
          file_path: '/puzzles/test1.html',
          tier: 'free',
          category: 'general',
          difficulty: 'easy',
          tags: 'test,example',
          play_count: 10,
          completion_rate: 85.5,
          estimated_solve_time: 300,
          avg_solve_time: 280,
          best_score: 95,
          upload_date: '2024-01-01T00:00:00Z',
          is_active: true
        }
      ];

      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.puzzle.findMany.mockResolvedValue(mockPuzzles );
      mockPrisma.puzzle.count.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles?page=1&limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.puzzles).toEqual(mockPuzzles);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      });
    });

    it('should handle search and filter parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.puzzle.findMany.mockResolvedValue([]);
      mockPrisma.puzzle.count.mockResolvedValue(0);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles?search=test&category=general&difficulty=easy');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.puzzle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: { contains: 'test', mode: 'insensitive' } }),
              expect.objectContaining({ description: { contains: 'test', mode: 'insensitive' } })
            ]),
            category: 'general',
            difficulty: 'easy'
          })
        })
      );
    });
  });

  describe('POST', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Puzzle',
          description: 'Test description',
          difficulty: 'easy',
          category: 'general',
          tier: 'free'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 403 if user is not admin', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'user123',
        role: 'USER'
      } );

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Puzzle',
          description: 'Test description',
          difficulty: 'easy',
          category: 'general',
          tier: 'free'
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
    });

    it('should create puzzle for admin user', async () => {
      const mockPuzzle = {
        id: 1,
        title: 'Test Puzzle',
        description: 'Test description',
        filename: 'test.html',
        original_filename: 'test.html',
        file_path: '/puzzles/test.html',
        tier: 'free',
        category: 'general',
        difficulty: 'easy',
        tags: null,
        play_count: null,
        completion_rate: null,
        estimated_solve_time: null,
        avg_solve_time: null,
        best_score: null,
        upload_date: '2024-01-01T00:00:00Z',
        is_active: true
      };

      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      mockPrisma.puzzle.create.mockResolvedValue(mockPuzzle );

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Puzzle',
          description: 'Test description',
          difficulty: 'easy',
          category: 'general',
          grid: [['A', 'B'], ['C', 'D']],
          clues: { across: ['1. Test clue'], down: ['2. Another clue'] }
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data).toEqual(mockPuzzle);
    });

    it('should return 400 for missing required fields', async () => {
      mockGetServerSession.mockResolvedValue({
        userId: 'admin123',
        role: 'ADMIN'
      } );

      const request = new NextRequest('http://localhost:3000/api/admin/puzzles', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test description'
          // Missing title
        })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Missing required fields');
    });
  });
});
