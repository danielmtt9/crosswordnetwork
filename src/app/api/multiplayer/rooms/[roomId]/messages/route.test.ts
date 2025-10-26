/**
 * Tests for chat API endpoints
 */

import { NextRequest } from 'next/server';
import { GET, POST } from './route';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerRoom: {
      findUnique: jest.fn(),
    },
    roomMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    roomMutedUser: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/roomPermissions', () => ({
  RoomPermissionManager: {
    validateAction: jest.fn(),
  },
  createPermissionContext: jest.fn(),
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { RoomPermissionManager, createPermissionContext } from '@/lib/roomPermissions';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockRoomPermissionManager = RoomPermissionManager as jest.Mocked<typeof RoomPermissionManager>;
const mockCreatePermissionContext = createPermissionContext as jest.MockedFunction<typeof createPermissionContext>;

describe('/api/multiplayer/rooms/[roomId]/messages', () => {
  const mockRoomId = 'room-123';
  const mockUserId = 'user-123';
  const mockSession = {
    userId: mockUserId,
    user: { name: 'Test User' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession as any);
  });

  describe('GET /api/multiplayer/rooms/[roomId]/messages', () => {
    it('returns chat messages for authorized user', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      const mockMessages = [
        {
          id: 'msg-1',
          userId: mockUserId,
          userName: 'Test User',
          content: 'Hello world!',
          type: 'text',
          metadata: null,
          createdAt: new Date('2023-01-01T00:00:00Z'),
          isDeleted: false,
          deletedBy: null,
          deletedAt: null
        }
      ];

      const mockMutedUsers = [];

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findMany.mockResolvedValue(mockMessages as any);
      mockPrisma.roomMutedUser.findMany.mockResolvedValue(mockMutedUsers as any);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages');
      const response = await GET(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].content).toBe('Hello world!');
    });

    it('returns 401 for unauthorized user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages');
      const response = await GET(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages');
      const response = await GET(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(404);
    });

    it('returns 403 for non-participant', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        participants: [] // Empty participants array
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages');
      const response = await GET(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/multiplayer/rooms/[roomId]/messages', () => {
    it('creates a new message for authorized user', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        status: 'ACTIVE',
        isPrivate: false,
        password: null,
        participants: [{ 
          role: 'PLAYER', 
          isOnline: true, 
          displayName: 'Test User' 
        }]
      };

      const mockMessage = {
        id: 'msg-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Test User',
        content: 'Hello world!',
        type: 'text',
        metadata: null,
        createdAt: new Date('2023-01-01T00:00:00Z')
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMutedUser.findFirst.mockResolvedValue(null);
      mockPrisma.roomMessage.count.mockResolvedValue(0);
      mockPrisma.roomMessage.create.mockResolvedValue(mockMessage as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      mockCreatePermissionContext.mockReturnValue({} as any);
      mockRoomPermissionManager.validateAction.mockReturnValue({ allowed: true });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello world!' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toBe('Hello world!');
    });

    it('returns 400 for missing content', async () => {
      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(400);
    });

    it('returns 400 for message too long', async () => {
      const longContent = 'a'.repeat(501);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: longContent }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(400);
    });

    it('returns 403 for muted user', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        status: 'ACTIVE',
        isPrivate: false,
        password: null,
        participants: [{ 
          role: 'PLAYER', 
          isOnline: true, 
          displayName: 'Test User' 
        }]
      };

      const mockMutedUser = {
        id: 'mute-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        mutedUntil: new Date(Date.now() + 300000) // 5 minutes from now
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMutedUser.findFirst.mockResolvedValue(mockMutedUser as any);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello world!' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(403);
    });

    it('returns 429 for rate limit exceeded', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        status: 'ACTIVE',
        isPrivate: false,
        password: null,
        participants: [{ 
          role: 'PLAYER', 
          isOnline: true, 
          displayName: 'Test User' 
        }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMutedUser.findFirst.mockResolvedValue(null);
      mockPrisma.roomMessage.count.mockResolvedValue(10); // Rate limit exceeded

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-123/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello world!' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: mockRoomId }) });

      expect(response.status).toBe(429);
    });
  });
});
