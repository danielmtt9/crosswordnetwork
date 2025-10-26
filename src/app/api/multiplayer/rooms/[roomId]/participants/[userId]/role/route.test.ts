import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from './route';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerRoom: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    roomParticipant: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    roomActivityLog: {
      create: jest.fn()
    }
  }
}));

const mockGetServerSession = require('next-auth').getServerSession;
const mockPrisma = require('@/lib/prisma').prisma;

describe('/api/multiplayer/rooms/[roomId]/participants/[userId]/role', () => {
  const mockSession = {
    user: { id: 'host-user-id', name: 'Host User', email: 'host@example.com' }
  };

  const mockRoom = {
    id: 'room-id',
    hostId: 'host-user-id',
    host: {
      id: 'host-user-id',
      name: 'Host User',
      email: 'host@example.com'
    }
  };

  const mockParticipant = {
    id: 'participant-id',
    userId: 'participant-user-id',
    userName: 'Participant User',
    userEmail: 'participant@example.com',
    role: 'PLAYER',
    isOnline: true,
    joinedAt: new Date(),
    lastSeenAt: new Date(),
    user: {
      id: 'participant-user-id',
      name: 'Participant User',
      email: 'participant@example.com',
      role: 'USER',
      subscriptionStatus: 'ACTIVE'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET', () => {
    it('should return participant role for host', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role');
      const response = await GET(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.participant).toBeDefined();
      expect(data.participant.userId).toBe('participant-user-id');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role');
      const response = await GET(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-host user', async () => {
      const nonHostSession = {
        user: { id: 'non-host-user-id', name: 'Non Host', email: 'nonhost@example.com' }
      };
      mockGetServerSession.mockResolvedValue(nonHostSession);

      const roomWithDifferentHost = {
        ...mockRoom,
        hostId: 'different-host-id'
      };
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(roomWithDifferentHost);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role');
      const response = await GET(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role');
      const response = await GET(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent participant', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role');
      const response = await GET(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH', () => {
    it('should update participant role', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant);
      mockPrisma.roomParticipant.update.mockResolvedValue({
        ...mockParticipant,
        role: 'MODERATOR'
      });
      mockPrisma.roomActivityLog.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'MODERATOR',
          reason: 'Promoting to moderator'
        })
      });

      const response = await PATCH(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.participant.role).toBe('MODERATOR');
    });

    it('should return 400 for invalid role', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'INVALID_ROLE',
          reason: 'Invalid role'
        })
      });

      const response = await PATCH(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for trying to assign HOST role', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'HOST',
          reason: 'Trying to assign host role'
        })
      });

      const response = await PATCH(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 for host trying to change their own role', async () => {
      const hostParticipant = {
        ...mockParticipant,
        userId: 'host-user-id'
      };
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(hostParticipant);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/host-user-id/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'MODERATOR',
          reason: 'Changing own role'
        })
      });

      const response = await PATCH(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'host-user-id'
        })
      });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE', () => {
    it('should remove participant', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(mockParticipant);
      mockPrisma.roomParticipant.delete.mockResolvedValue({});
      mockPrisma.roomActivityLog.create.mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/participant-user-id/role', {
        method: 'DELETE'
      });

      const response = await DELETE(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'participant-user-id'
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should return 400 for host trying to remove themselves', async () => {
      const hostParticipant = {
        ...mockParticipant,
        userId: 'host-user-id'
      };
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(hostParticipant);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/room-id/participants/host-user-id/role', {
        method: 'DELETE'
      });

      const response = await DELETE(request, {
        params: Promise.resolve({
          roomId: 'room-id',
          userId: 'host-user-id'
        })
      });

      expect(response.status).toBe(400);
    });
  });
});
