import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock authOptions import
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    challenge: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    challengeParticipant: {
      create: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/challenges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return challenges for authenticated user', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockChallenges = [
        {
          id: 'challenge1',
          name: 'Speed Challenge',
          description: 'Complete 10 puzzles quickly',
          type: 'speed',
          target: 10,
          duration: 24,
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
          endTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
          rewardPoints: 500,
          rewardBadge: 'Speed Demon',
          participants: [
            {
              userId: 'user1',
              user: {
                id: 'user1',
                name: 'Alice',
                image: 'https://example.com/alice.jpg',
              },
              progress: 5,
              rank: 1,
            },
          ],
          creator: {
            id: 'user2',
            name: 'Bob',
            image: 'https://example.com/bob.jpg',
          },
        },
      ];

      mockPrisma.challenge.findMany.mockResolvedValue(mockChallenges as any);

      const request = new NextRequest('http://localhost:3000/api/challenges');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.challenges).toHaveLength(1);
      expect(data.challenges[0]).toEqual({
        id: 'challenge1',
        name: 'Speed Challenge',
        description: 'Complete 10 puzzles quickly',
        type: 'speed',
        target: 10,
        duration: 24,
        participants: [
          {
            userId: 'user1',
            userName: 'Alice',
            userAvatar: 'https://example.com/alice.jpg',
            progress: 5,
            rank: 1,
            isCurrentUser: true,
          },
        ],
        status: 'upcoming',
        startTime: expect.any(String),
        endTime: expect.any(String),
        reward: {
          points: 500,
          badge: 'Speed Demon',
        },
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/challenges');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockPrisma.challenge.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/challenges');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch challenges');
    });
  });

  describe('POST', () => {
    it('should create a challenge successfully', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockChallenge = {
        id: 'challenge1',
        name: 'Test Challenge',
        description: 'Test Description',
        type: 'puzzle_count',
        target: 5,
        duration: 12,
        startTime: new Date('2024-01-15T10:00:00Z'),
        endTime: new Date('2024-01-16T10:00:00Z'),
        rewardPoints: 250,
        rewardBadge: 'Test Badge',
        status: 'upcoming',
      };

      mockPrisma.challenge.create.mockResolvedValue(mockChallenge as any);
      mockPrisma.challengeParticipant.create.mockResolvedValue({} as any);

      const request = new NextRequest('http://localhost:3000/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Challenge',
          description: 'Test Description',
          type: 'puzzle_count',
          target: 5,
          duration: 12,
          rewardPoints: 250,
          rewardBadge: 'Test Badge',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.challenge).toBeDefined();
      expect(mockPrisma.challengeParticipant.create).toHaveBeenCalledWith({
        data: {
          challengeId: 'challenge1',
          userId: 'user1',
          progress: 0,
          rank: 1,
        },
      });
    });

    it('should return 400 for missing required fields', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Challenge',
          // Missing description, type, target, duration
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should return 400 for invalid challenge type', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Challenge',
          description: 'Test Description',
          type: 'invalid_type',
          target: 5,
          duration: 12,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid challenge type');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Challenge',
          description: 'Test Description',
          type: 'puzzle_count',
          target: 5,
          duration: 12,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockPrisma.challenge.create.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/challenges', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Challenge',
          description: 'Test Description',
          type: 'puzzle_count',
          target: 5,
          duration: 12,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create challenge');
    });
  });
});
