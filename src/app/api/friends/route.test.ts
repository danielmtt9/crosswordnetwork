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
    friendship: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/friends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return friends list for authenticated user', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockFriends = [
        {
          id: 'friendship1',
          status: 'ACCEPTED',
          createdAt: new Date('2024-01-01'),
          userId: 'user1',
          friendId: 'user2',
          user: {
            id: 'user1',
            name: 'Current User',
            image: 'https://example.com/current.jpg',
            lastActiveAt: new Date('2024-01-15'),
          },
          friend: {
            id: 'user2',
            name: 'Alice',
            image: 'https://example.com/alice.jpg',
            lastActiveAt: new Date('2024-01-15'),
          },
        },
        {
          id: 'friendship2',
          status: 'ACCEPTED',
          createdAt: new Date('2024-01-02'),
          userId: 'user3',
          friendId: 'user1',
          user: {
            id: 'user3',
            name: 'Bob',
            image: 'https://example.com/bob.jpg',
            lastActiveAt: new Date('2024-01-15'),
          },
          friend: {
            id: 'user1',
            name: 'Current User',
            image: 'https://example.com/current.jpg',
            lastActiveAt: new Date('2024-01-15'),
          },
        },
      ];

      mockPrisma.friendship.findMany.mockResolvedValue(mockFriends as any);

      const request = new NextRequest('http://localhost:3000/api/friends');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.friends).toHaveLength(2);
      expect(data.friends[0]).toEqual({
        id: 'user2',
        name: 'Alice',
        image: 'https://example.com/alice.jpg',
        isOnline: false,
        lastActiveAt: '2024-01-15T00:00:00.000Z',
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/friends');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle database errors', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);
      mockPrisma.friendship.findMany.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/friends');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch friends');
    });
  });

  describe('POST', () => {
    it('should send a friend request successfully', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockFriend = {
        id: 'user2',
        name: 'Alice',
        image: 'https://example.com/alice.jpg',
      };

      // Mock user validation
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2', name: 'Alice' });
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      mockPrisma.friendship.create.mockResolvedValue({
        id: 'friendship1',
        status: 'PENDING',
        createdAt: new Date('2024-01-01'),
        friend: mockFriend,
      } as any);

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({ friendId: 'user2', action: 'send_request' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Friend request sent');
    });

    it('should return 400 for missing friendId and action', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Friend ID and action are required');
    });

    it('should return 404 for non-existent friend', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({ friendId: 'nonexistent', action: 'send_request' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 for existing friendship', async () => {
      const mockSession = { userId: 'user1' };
      mockGetServerSession.mockResolvedValue(mockSession as any);

      const mockFriend = {
        id: 'user2',
        name: 'Alice',
        image: 'https://example.com/alice.jpg',
      };

      // Mock user validation
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2', name: 'Alice' });
      mockPrisma.friendship.findFirst.mockResolvedValue({
        id: 'existing-friendship',
        status: 'PENDING',
      } as any);

      const request = new NextRequest('http://localhost:3000/api/friends', {
        method: 'POST',
        body: JSON.stringify({ friendId: 'user2', action: 'send_request' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Friendship already exists or request already sent');
    });
  });
});
