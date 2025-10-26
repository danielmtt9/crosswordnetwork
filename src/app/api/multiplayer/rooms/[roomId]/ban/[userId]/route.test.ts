/**
 * Tests for room unban API endpoint
 */

import { NextRequest } from 'next/server';
import { DELETE } from './route';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerRoom: {
      findUnique: jest.fn(),
    },
    roomBannedUser: {
      findFirst: jest.fn(),
      update: jest.fn(),
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

describe('/api/multiplayer/rooms/[roomId]/ban/[userId]', () => {
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

  describe('DELETE /api/multiplayer/rooms/[roomId]/ban/[userId]', () => {
    it('allows host to unban user from room', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockActiveBan = {
        id: 'ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Banned User',
        bannedBy: 'other-host-123',
        bannedByUserName: 'Other Host',
        bannedUntil: new Date(Date.now() + 3600000), // 1 hour from now
        reason: 'Inappropriate behavior'
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(mockActiveBan as any);
      mockPrisma.roomBannedUser.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('User has been unbanned from the room');
    });

    it('allows moderator to unban user from room', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: 'other-host-123',
        participants: [{ role: 'MODERATOR', isOnline: true }]
      };

      const mockActiveBan = {
        id: 'ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Banned User',
        bannedBy: 'other-host-123',
        bannedByUserName: 'Other Host',
        bannedUntil: new Date(Date.now() + 3600000),
        reason: 'Spam'
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(mockActiveBan as any);
      mockPrisma.roomBannedUser.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('returns 401 for unauthorized user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
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

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
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

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only hosts and moderators can unban users');
    });

    it('returns 404 for non-banned user', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('User is not currently banned from this room');
    });

    it('creates audit log for unban', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockHostId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockActiveBan = {
        id: 'ban-123',
        roomId: 'room-id-123',
        userId: mockUserId,
        userName: 'Banned User',
        bannedBy: 'other-host-123',
        bannedByUserName: 'Other Host',
        bannedUntil: new Date(Date.now() + 3600000),
        reason: 'Inappropriate behavior'
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomBannedUser.findFirst.mockResolvedValue(mockActiveBan as any);
      mockPrisma.roomBannedUser.update.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/ban/${mockUserId}`, {
        method: 'DELETE',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorUserId: mockHostId,
          action: 'UNBAN_USER_FROM_ROOM',
          entityType: 'ROOM_PARTICIPANT',
          entityId: mockUserId,
          before: expect.stringContaining('"roomId":"room-id-123"'),
          after: expect.stringContaining('"unbannedAt"'),
          ip: '192.168.1.1'
        }
      });
    });
  });
});
