/**
 * Tests for message deletion API endpoints
 */

import { NextRequest } from 'next/server';
import { DELETE, PATCH } from './route';

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

describe('/api/multiplayer/rooms/[roomId]/messages/[messageId]', () => {
  const mockRoomId = 'room-123';
  const mockMessageId = 'msg-123';
  const mockUserId = 'user-123';
  const mockOtherUserId = 'user-456';
  const mockSession = {
    userId: mockUserId,
    user: { name: 'Test User' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession as any);
  });

  describe('DELETE /api/multiplayer/rooms/[roomId]/messages/[messageId]', () => {
    it('allows message owner to delete their own message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false
      };

      const mockDeletedMessage = {
        id: mockMessageId,
        isDeleted: true,
        deletedBy: mockUserId,
        deletedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);
      mockPrisma.roomMessage.update.mockResolvedValue(mockDeletedMessage as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isDeleted).toBe(true);
      expect(data.deletedBy).toBe(mockUserId);
      expect(data.deletedAt).toBeDefined();
    });

    it('allows host to delete any message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockOtherUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false
      };

      const mockDeletedMessage = {
        id: mockMessageId,
        isDeleted: true,
        deletedBy: mockUserId,
        deletedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);
      mockPrisma.roomMessage.update.mockResolvedValue(mockDeletedMessage as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isDeleted).toBe(true);
      expect(data.deletedBy).toBe(mockUserId);
    });

    it('allows moderator to delete any message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockOtherUserId,
        participants: [{ role: 'MODERATOR', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockOtherUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false
      };

      const mockDeletedMessage = {
        id: mockMessageId,
        isDeleted: true,
        deletedBy: mockUserId,
        deletedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);
      mockPrisma.roomMessage.update.mockResolvedValue(mockDeletedMessage as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.isDeleted).toBe(true);
      expect(data.deletedBy).toBe(mockUserId);
    });

    it('returns 401 for unauthorized user', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(404);
    });

    it('returns 403 for non-participant', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockOtherUserId,
        participants: [] // Empty participants array
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(403);
    });

    it('returns 404 for non-existent message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(404);
    });

    it('returns 403 for non-owner, non-host, non-moderator', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockOtherUserId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockOtherUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('You can only delete your own messages or be a host/moderator');
    });

    it('returns 400 for already deleted message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: true
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Message is already deleted');
    });

    it('creates audit log for message deletion', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'HOST', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false
      };

      const mockDeletedMessage = {
        id: mockMessageId,
        isDeleted: true,
        deletedBy: mockUserId,
        deletedAt: new Date()
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);
      mockPrisma.roomMessage.update.mockResolvedValue(mockDeletedMessage as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'DELETE',
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });

      const response = await DELETE(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(200);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorUserId: mockUserId,
          action: 'DELETE_CHAT_MESSAGE',
          entityType: 'ROOM_MESSAGE',
          entityId: mockMessageId,
          before: JSON.stringify({ content: 'Hello world!', type: 'text' }),
          after: null,
          ip: '192.168.1.1'
        }
      });
    });
  });

  describe('PATCH /api/multiplayer/rooms/[roomId]/messages/[messageId]', () => {
    it('allows message owner to edit their own message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false,
        createdAt: new Date(Date.now() - 60000) // 1 minute ago
      };

      const mockUpdatedMessage = {
        id: mockMessageId,
        userId: mockUserId,
        userName: 'Test User',
        content: 'Hello updated world!',
        type: 'text',
        metadata: null,
        createdAt: mockMessage.createdAt,
        editedAt: new Date(),
        isEdited: true
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);
      mockPrisma.roomMessage.update.mockResolvedValue(mockUpdatedMessage as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Hello updated world!' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PATCH(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.content).toBe('Hello updated world!');
      expect(data.isEdited).toBe(true);
      expect(data.editedAt).toBeDefined();
    });

    it('returns 400 for message too old to edit', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false,
        createdAt: new Date(Date.now() - 400000) // 6+ minutes ago
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Hello updated world!' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PATCH(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Message can only be edited within 5 minutes');
    });

    it('returns 403 for non-owner trying to edit message', async () => {
      const mockRoom = {
        id: 'room-id-123',
        roomCode: mockRoomId,
        hostUserId: mockUserId,
        participants: [{ role: 'PLAYER', isOnline: true }]
      };

      const mockMessage = {
        id: mockMessageId,
        roomId: 'room-id-123',
        userId: mockOtherUserId,
        content: 'Hello world!',
        type: 'text',
        isDeleted: false,
        createdAt: new Date(Date.now() - 60000)
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom as any);
      mockPrisma.roomMessage.findFirst.mockResolvedValue(mockMessage as any);

      const request = new NextRequest(`http://localhost:3000/api/multiplayer/rooms/${mockRoomId}/messages/${mockMessageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: 'Hello updated world!' }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await PATCH(request, { 
        params: Promise.resolve({ roomId: mockRoomId, messageId: mockMessageId }) 
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('You can only edit your own messages');
    });
  });
});
