import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    multiplayerRoom: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    roomParticipant: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock authOptions import
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('/api/multiplayer/rooms/[roomId]/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/multiplayer/rooms/[roomId]/join', () => {
    const mockSession = {
      userId: 'user-1',
      user: { id: 'user-1', name: 'Test User' },
    };

    const mockRoom = {
      id: 'room-1',
      roomCode: 'ABC123',
      status: 'WAITING',
      isPrivate: false,
      password: null,
      allowSpectators: true,
      maxPlayers: 8,
      participantCount: 2,
      participants: [
        { id: 'participant-1', userId: 'user-2', role: 'PLAYER' },
        { id: 'participant-2', userId: 'user-3', role: 'SPECTATOR' }
      ],
      puzzle: { id: 'puzzle-1', title: 'Test Puzzle' }
    };

    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      name: 'Test User',
      role: 'FREE',
      subscriptionStatus: 'INACTIVE',
      trialEndsAt: null,
    };

    it('should successfully join a public room', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);
      mockPrisma.roomParticipant.create.mockResolvedValue({
        id: 'participant-1',
        roomId: 'room-1',
        userId: 'user-1',
        displayName: 'Test User',
        role: 'SPECTATOR',
        isOnline: true,
      });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.participant.role).toBe('SPECTATOR');
      expect(mockPrisma.roomParticipant.create).toHaveBeenCalledWith({
        data: {
          roomId: 'room-1',
          userId: 'user-1',
          displayName: 'testuser',
          role: 'SPECTATOR',
          isOnline: true,
        },
      });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if room does not exist', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/INVALID/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'INVALID' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Room not found');
    });

    it('should return 400 if room is not accepting participants', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        ...mockRoom,
        status: 'ACTIVE',
      });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Room is not accepting new players');
    });

    it('should return 400 if room is full', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        ...mockRoom,
        maxPlayers: 2,
        participants: [
          { id: 'participant-1', userId: 'user-2', role: 'PLAYER' },
          { id: 'participant-2', userId: 'user-3', role: 'PLAYER' }
        ]
      });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Room is full');
    });

    it('should return 400 if user is already in the room', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.findFirst.mockResolvedValue({
        id: 'existing-participant',
        roomId: 'room-1',
        userId: 'user-1',
        displayName: 'Test User',
        role: 'PLAYER',
        isOnline: true,
      });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('You are already in this room');
    });

    it('should require password for private rooms', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        ...mockRoom,
        isPrivate: true,
        password: 'hashed-password',
      });
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password required for private room');
    });

    it('should validate password for private rooms', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        ...mockRoom,
        isPrivate: true,
        password: 'hashed-password',
      });
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);
      mockBcrypt.compare.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({ password: 'wrong-password' }),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid password');
    });

    it('should allow premium users to join as players', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: 'PREMIUM',
      });
      mockPrisma.roomParticipant.findFirst.mockResolvedValue(null);
      mockPrisma.roomParticipant.create.mockResolvedValue({
        id: 'participant-1',
        roomId: 'room-1',
        userId: 'user-1',
        displayName: 'Test User',
        role: 'PLAYER',
        isOnline: true,
      });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.participant.role).toBe('PLAYER');
    });

    it('should return 403 if user cannot join and room does not allow spectators', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        ...mockRoom,
        allowSpectators: false,
      });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        role: 'FREE',
        subscriptionStatus: 'INACTIVE',
      });

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("This room doesn't allow spectators and you need a premium subscription to play");
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.multiplayerRoom.findUnique.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/multiplayer/rooms/ABC123/join', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ roomId: 'ABC123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to join room');
    });
  });
});
