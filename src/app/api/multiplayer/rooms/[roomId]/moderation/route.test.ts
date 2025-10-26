/**
 * Tests for moderation API endpoints
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
    roomMutedUser: {
      findMany: jest.fn(),
    },
    roomBannedUser: {
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/multiplayer/rooms/[roomId]/moderation', () => {
  const mockRoomId = 'room-123';
  const mockUserId = 'user-123';
  const mockHostId = 'host-123';
  const mockSession = {
    userId: mockHostId,
    user: { name: 'Host User' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession as any);
  });

  describe('GET /api/multiplayer/rooms/[roomId]/moderation', () => {
    it('allows host to view moderation data', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockMutedUsers = [
        {
          id: 'mute-123',
          roomId: 'room-id-123',
          userId: 'user-456',
          userName: 'Muted User',
          mutedBy: mockHostId,
          mutedByUserName: 'Host User',
          mutedUntil: new Date(Date.now() + 3600000),
          reason: 'Spam',
          createdAt: new Date()
        }
      ];

      const mockBannedUsers = [
        {
          id: 'ban-123',
          roomId: 'room-id-123',
          userId: 'user-789',
          userName: 'Banned User',
          bannedBy: mockHostId,
          bannedByUserName: 'Host User',
          bannedUntil: new Date(Date.now() + 7200000),
          reason: 'Inappropriate behavior',
          createdAt: new Date()
        }
      ];

      const mockRecentActions = [
        {
          id: 'action-123',
          action: 'MUTE_USER',
          entityType: 'ROOM_PARTICIPANT',
          entityId: 'user-456',
          actorUserId: mockHostId,
          before: '{}',
          after: '{"muted": true}',
          createdAt: new Date(),
          ip: '192.168.1.1'
        }
      ];

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMutedUser.findMany.mockResolvedValue(mockMutedUsers as any);
      mockPrisma.roomBannedUser.findMany.mockResolvedValue(mockBannedUsers as any);
      mockPrisma.auditLog.findMany.mockResolvedValue(mockRecentActions as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.roomId).toBe('room-id-123');
      expect(data.moderationStats.mutedUsers).toBe(1);
      expect(data.moderationStats.bannedUsers).toBe(1);
      expect(data.mutedUsers).toHaveLength(1);
      expect(data.bannedUsers).toHaveLength(1);
      expect(data.recentActions).toHaveLength(1);
    });

    it('allows moderator to view moderation data', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: 'other-host-123',
        participants: [{ role: 'MODERATOR', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMutedUser.findMany.mockResolvedValue([]);
      mockPrisma.roomBannedUser.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.moderationStats.mutedUsers).toBe(0);
      expect(data.moderationStats.bannedUsers).toBe(0);
    });

    it('returns 401 for unauthorized user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(404);
    });

    it('returns 403 for non-participant', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [] // Empty participants array
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(403);
    });

    it('returns 403 for non-host, non-moderator', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: 'other-host-123',
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only hosts and moderators can view moderation settings');
    });
  });

  describe('POST /api/multiplayer/rooms/[roomId]/moderation', () => {
    it('allows host to update moderation settings', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const moderationSettings = {
        enableModeration: true,
        strictMode: false,
        maxWarnings: 3,
        warningCooldown: 300000, // 5 minutes
        customFilters: ['spam', 'scam'],
        whitelist: ['user-123']
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`, {
        method: 'POST',
        body: JSON.stringify(moderationSettings),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Moderation settings updated successfully');
    });

    it('returns 403 for non-host trying to update settings', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: 'other-host-123',
        participants: [{ role: 'MODERATOR', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`, {
        method: 'POST',
        body: JSON.stringify({ enableModeration: true }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only the host can update moderation settings');
    });

    it('returns 400 for invalid max warnings', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`, {
        method: 'POST',
        body: JSON.stringify({ maxWarnings: 15 }), // Invalid: > 10
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Max warnings must be between 1 and 10');
    });

    it('returns 400 for invalid warning cooldown', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`, {
        method: 'POST',
        body: JSON.stringify({ warningCooldown: 30000 }), // Invalid: < 60000 (1 minute)
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Warning cooldown must be between 1 minute and 1 hour');
    });

    it('creates audit log for settings update', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const moderationSettings = {
        enableModeration: true,
        strictMode: true,
        maxWarnings: 5
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/moderation`, {
        method: 'POST',
        body: JSON.stringify(moderationSettings),
        headers: { 
          'Content-Type': 'application/json',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorUserId: mockHostId,
          action: 'UPDATE_MODERATION_SETTINGS',
          entityType: 'MULTIPLAYER_ROOM',
          entityId: 'room-id-123',
          before: '{}',
          after: JSON.stringify(moderationSettings),
          ip: '192.168.1.1'
        }
      });
    });
  });
});
