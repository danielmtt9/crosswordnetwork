/**
 * Tests for room banning API endpoints
 */

import { NextRequest } from 'next/server';
import { POST, GET } from './route';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerRoom: {
      findUnique: jest.fn(),
    },
    roomParticipant: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    roomBannedUser: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
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

describe('/api/multiplayer/rooms/[roomId]/ban', () => {
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

  describe('POST /api/multiplayer/rooms/[roomId]/ban', () => {
    it('allows host to ban user from room', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockTargetParticipant = {
        id: 'participant-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        role: 'PLAYER',
        user: { name: 'Target User' }
      };

      const mockBannedUser = {
        id: 'ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Target User',
        bannedBy: mockHostId,
        bannedByUserName: 'Host User',
        bannedUntil: new Date(Date.now() + 3600000), // 1 hour from now
        reason: 'Inappropriate behavior'
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockTargetParticipant as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(null);
      mockPrisma.roomBannedUser.create.mockResolvedValue(mockBannedUser as any);
      mockPrisma.roomParticipant.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000, // 1 hour
          reason: 'Inappropriate behavior' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bannedUser.userId).toBe(mockUserId);
      expect(data.bannedUser.reason).toBe('Inappropriate behavior');
    });

    it('allows moderator to ban user from room', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: 'other-host-123',
        participants: [{ role: 'MODERATOR', isOnline: true }]
      };

      const mockTargetParticipant = {
        id: 'participant-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        role: 'PLAYER',
        user: { name: 'Target User' }
      };

      const mockBannedUser = {
        id: 'ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Target User',
        bannedBy: mockHostId,
        bannedByUserName: 'Moderator User',
        bannedUntil: new Date(Date.now() + 1800000), // 30 minutes from now
        reason: 'Spam'
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockTargetParticipant as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(null);
      mockPrisma.roomBannedUser.create.mockResolvedValue(mockBannedUser as any);
      mockPrisma.roomParticipant.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 1800000, // 30 minutes
          reason: 'Spam' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.bannedUser.userId).toBe(mockUserId);
    });

    it('returns 401 for unauthorized user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
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

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
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

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only hosts and moderators can ban users');
    });

    it('returns 404 for non-existent target participant', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('User is not a participant in this room');
    });

    it('returns 400 for trying to ban host', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId, // Same as target user
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockTargetParticipant = {
        id: 'participant-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        role: 'HOST',
        user: { name: 'Host User' }
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockTargetParticipant as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Cannot ban the room host');
    });

    it('returns 400 for already banned user', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockTargetParticipant = {
        id: 'participant-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        role: 'PLAYER',
        user: { name: 'Target User' }
      };

      const mockExistingBan = {
        id: 'existing-ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        bannedUntil: new Date(Date.now() + 3600000)
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockTargetParticipant as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(mockExistingBan as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Test ban' 
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User is already banned from this room');
    });

    it('creates audit log for ban', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockTargetParticipant = {
        id: 'participant-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        role: 'PLAYER',
        user: { name: 'Target User' }
      };

      const mockBannedUser = {
        id: 'ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Target User',
        bannedBy: mockHostId,
        bannedByUserName: 'Host User',
        bannedUntil: new Date(Date.now() + 3600000),
        reason: 'Inappropriate behavior'
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockTargetParticipant as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(null);
      mockPrisma.roomBannedUser.create.mockResolvedValue(mockBannedUser as any);
      mockPrisma.roomParticipant.deleteMany.mockResolvedValue({ count: 1 } as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ 
          userId: mockUserId, 
          duration: 3600000,
          reason: 'Inappropriate behavior' 
        }),
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
          action: 'BAN_USER_FROM_ROOM',
          entityType: 'ROOM_PARTICIPANT',
          entityId: mockUserId,
          before: JSON.stringify({ 
            roomId: 'room-id-123', 
            roomCode: mockRoomId,
            participantRole: 'PLAYER' 
          }),
          after: expect.stringContaining('"bannedUntil"'),
          ip: '192.168.1.1'
        }
      });
    });
  });

  describe('GET /api/multiplayer/rooms/[roomId]/ban', () => {
    it('allows host to view banned users', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockBannedUsers = [
        {
          id: 'ban-123',
          roomId: 'room-id-123',
          userId: mockUserId,
          userName: 'Banned User',
          bannedBy: mockHostId,
          bannedByUserName: 'Host User',
          bannedUntil: new Date(Date.now() + 3600000),
          reason: 'Inappropriate behavior',
          createdAt: new Date()
        }
      ];

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomBannedUser.findMany.mockResolvedValue(mockBannedUsers as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.bannedUsers).toHaveLength(1);
      expect(data.bannedUsers[0].userId).toBe(mockUserId);
      expect(data.bannedUsers[0].reason).toBe('Inappropriate behavior');
    });

    it('returns 403 for non-host, non-moderator trying to view banned users', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: 'other-host-123',
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban`);

      const response = await GET(request, { 
        params: Promise.resolve({ roomId: mockRoomId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only hosts and moderators can view banned users');
    });
  });
});
