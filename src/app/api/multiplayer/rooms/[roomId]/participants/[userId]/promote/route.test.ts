/**
 * Tests for moderator promotion API endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from './route';

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
      update: jest.fn(),
    },
    roomActivityLog: {
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

describe('/api/multiplayer/rooms/[roomId]/participants/[userId]/promote', () => {
  const mockRoomId = 'room-123';
  const mockUserId = 'user-123';
  const mockHostId = 'host-123';
  const mockSession = {
    user: { id: mockHostId, name: 'Host User' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession as any);
  });

  describe('POST /api/multiplayer/rooms/[roomId]/participants/[userId]/promote', () => {
    it('allows host to promote user to moderator', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: mockHostId,
        host: { id: mockHostId, name: 'Host User', email: 'host@example.com' }
      };

      const mockParticipant = {
        id: 'participant-123',
        roomId: mockRoomId,
        userId: mockUserId,
        userName: 'Test User',
        userEmail: 'test@example.com',
        role: 'PLAYER',
        isOnline: true,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
          subscriptionStatus: 'ACTIVE'
        }
      };

      const mockUpdatedParticipant = {
        ...mockParticipant,
        role: 'MODERATOR',
        updatedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant as any);
      mockPrisma.roomParticipant.update.mockResolvedValue(mockUpdatedParticipant as any);
      mockPrisma.roomActivityLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.participant.role).toBe('MODERATOR');
      expect(data.participant.userId).toBe(mockUserId);
    });

    it('returns 401 for unauthorized user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(404);
    });

    it('returns 403 for non-host trying to promote', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: 'other-host-123',
        host: { id: 'other-host-123', name: 'Other Host', email: 'other@example.com' }
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Only the host can promote users');
    });

    it('returns 404 for non-existent participant', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: mockHostId,
        host: { id: mockHostId, name: 'Host User', email: 'host@example.com' }
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Participant not found');
    });

    it('returns 400 for already moderator', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: mockHostId,
        host: { id: mockHostId, name: 'Host User', email: 'host@example.com' }
      };

      const mockParticipant = {
        id: 'participant-123',
        roomId: mockRoomId,
        userId: mockUserId,
        userName: 'Test User',
        userEmail: 'test@example.com',
        role: 'MODERATOR',
        isOnline: true,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
          subscriptionStatus: 'ACTIVE'
        }
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User is already a moderator');
    });

    it('returns 400 for host trying to promote themselves', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: mockHostId,
        host: { id: mockHostId, name: 'Host User', email: 'host@example.com' }
      };

      const mockParticipant = {
        id: 'participant-123',
        roomId: mockRoomId,
        userId: mockHostId, // Same as host
        userName: 'Host User',
        userEmail: 'host@example.com',
        role: 'HOST',
        isOnline: true,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        user: {
          id: mockHostId,
          name: 'Host User',
          email: 'host@example.com',
          role: 'PREMIUM',
          subscriptionStatus: 'ACTIVE'
        }
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockHostId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockHostId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Host cannot promote themselves');
    });

    it('creates activity log for promotion', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: mockHostId,
        host: { id: mockHostId, name: 'Host User', email: 'host@example.com' }
      };

      const mockParticipant = {
        id: 'participant-123',
        roomId: mockRoomId,
        userId: mockUserId,
        userName: 'Test User',
        userEmail: 'test@example.com',
        role: 'PLAYER',
        isOnline: true,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
          subscriptionStatus: 'ACTIVE'
        }
      };

      const mockUpdatedParticipant = {
        ...mockParticipant,
        role: 'MODERATOR',
        updatedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant as any);
      mockPrisma.roomParticipant.update.mockResolvedValue(mockUpdatedParticipant as any);
      mockPrisma.roomActivityLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Promoting for good behavior' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.roomActivityLog.create).toHaveBeenCalledWith({
        data: {
          roomId: mockRoomId,
          userId: mockHostId,
          action: 'USER_PROMOTED',
          details: JSON.stringify({
            promotedUserId: mockUserId,
            promotedUserName: 'Test User',
            newRole: 'MODERATOR',
            reason: 'Promoting for good behavior'
          }),
          timestamp: expect.any(Date)
        }
      });
    });

    it('uses default reason when none provided', async () => {
      const mockRoom = {
        id: mockRoomId,
        hostId: mockHostId,
        host: { id: mockHostId, name: 'Host User', email: 'host@example.com' }
      };

      const mockParticipant = {
        id: 'participant-123',
        roomId: mockRoomId,
        userId: mockUserId,
        userName: 'Test User',
        userEmail: 'test@example.com',
        role: 'PLAYER',
        isOnline: true,
        joinedAt: new Date(),
        lastSeenAt: new Date(),
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
          subscriptionStatus: 'ACTIVE'
        }
      };

      const mockUpdatedParticipant = {
        ...mockParticipant,
        role: 'MODERATOR',
        updatedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant as any);
      mockPrisma.roomParticipant.update.mockResolvedValue(mockUpdatedParticipant as any);
      mockPrisma.roomActivityLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/participants/${mockUserId}/promote`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request, { 
        params: Promise.resolve({ roomId: mockRoomId, userId: mockUserId }) 
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.roomActivityLog.create).toHaveBeenCalledWith({
        data: {
          roomId: mockRoomId,
          userId: mockHostId,
          action: 'USER_PROMOTED',
          details: JSON.stringify({
            promotedUserId: mockUserId,
            promotedUserName: 'Test User',
            newRole: 'MODERATOR',
            reason: 'No reason provided'
          }),
          timestamp: expect.any(Date)
        }
      });
    });
  });
});
