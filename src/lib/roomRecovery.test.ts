import { RoomRecoveryManager, RecoveryResult } from './roomRecovery';

// Mock Prisma
const mockPrisma = {
  multiplayerRoom: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  roomParticipant: {
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
  },
  roomStateVersion: {
    deleteMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    multiplayerRoom: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    roomParticipant: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  })),      
}));

// Mock roomPersistenceManager
jest.mock('./roomPersistence', () => ({
  roomPersistenceManager: {
    loadRoomState: jest.fn(),
  },
}));

describe('RoomRecoveryManager', () => {
  let recoveryManager: RoomRecoveryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    recoveryManager = new RoomRecoveryManager();
  });

  const mockRoom = {
    id: 'room1',
    roomCode: 'ABC123',
    status: 'ACTIVE',
    hostUserId: 'user1',
    name: 'Test Room',
    participants: [
      {
        userId: 'user1',
        displayName: 'Alice',
        role: 'HOST',
        isOnline: true,
        lastSeen: new Date('2023-01-01T10:00:00Z'),
      },
      {
        userId: 'user2',
        displayName: 'Bob',
        role: 'PLAYER',
        isOnline: false,
        lastSeen: new Date('2023-01-01T09:30:00Z'),
      },
    ],
  };

  const mockRoomState = {
    gridState: { 'A1': 'C', 'A2': 'A' },
    participants: mockRoom.participants,
    sessionState: {
      status: 'ACTIVE',
      startedAt: new Date('2023-01-01T10:00:00Z'),
      currentHost: 'user1',
    },
    chatHistory: [],
    metadata: {
      lastSaved: new Date('2023-01-01T10:00:00Z'),
      version: 1,
      checksum: 'abc123',
    },
  };

  describe('recoverAllRooms', () => {
    it('should recover all active rooms successfully', async () => {
      const mockRooms = [mockRoom];
      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(mockRooms);
      
      const { roomPersistenceManager } = require('./roomPersistence');
      roomPersistenceManager.loadRoomState.mockResolvedValue(mockRoomState);
      
      mockPrisma.roomParticipant.updateMany.mockResolvedValue({});
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.notification.createMany.mockResolvedValue({});

      const results = await recoveryManager.recoverAllRooms();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        roomId: 'room1',
        roomCode: 'ABC123',
        recovered: true,
        participants: ['user1', 'user2'],
        lastActivity: mockRoomState.metadata.lastSaved,
      });

      expect(mockPrisma.roomParticipant.updateMany).toHaveBeenCalledWith({
        where: { roomId: 'room1' },
        data: { 
          isOnline: false,
          lastSeen: expect.any(Date)
        }
      });
    });

    it('should handle recovery failures gracefully', async () => {
      const mockRooms = [mockRoom];
      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(mockRooms);
      
      const { roomPersistenceManager } = require('./roomPersistence');
      roomPersistenceManager.loadRoomState.mockRejectedValue(new Error('State not found'));

      const results = await recoveryManager.recoverAllRooms();

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        roomId: 'room1',
        roomCode: 'ABC123',
        recovered: false,
        participants: ['user1', 'user2'],
        error: 'State not found',
      });
    });

    it('should filter rooms by update time', async () => {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue([]);

      await recoveryManager.recoverAllRooms();

      expect(mockPrisma.multiplayerRoom.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['WAITING', 'ACTIVE'] },
          updatedAt: { gte: expect.any(Date) }
        },
        include: expect.any(Object)
      });
    });
  });

  describe('recoverRoom', () => {
    it('should recover a specific room successfully', async () => {
      const { roomPersistenceManager } = require('./roomPersistence');
      roomPersistenceManager.loadRoomState.mockResolvedValue(mockRoomState);
      
      mockPrisma.roomParticipant.updateMany.mockResolvedValue({});
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.notification.createMany.mockResolvedValue({});

      const result = await recoveryManager.recoverRoom('room1', 'ABC123');

      expect(result).toEqual({
        roomId: 'room1',
        roomCode: 'ABC123',
        recovered: true,
        participants: ['user1', 'user2'],
        lastActivity: mockRoomState.metadata.lastSaved,
      });
    });

    it('should mark room as expired if recovery fails', async () => {
      const { roomPersistenceManager } = require('./roomPersistence');
      roomPersistenceManager.loadRoomState.mockResolvedValue(null);
      
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});

      const result = await recoveryManager.recoverRoom('room1', 'ABC123');

      expect(result.recovered).toBe(false);
      expect(mockPrisma.multiplayerRoom.update).toHaveBeenCalledWith({
        where: { id: 'room1' },
        data: {
          status: 'EXPIRED',
          completedAt: expect.any(Date)
        }
      });
    });

    it('should change active rooms to waiting status', async () => {
      const { roomPersistenceManager } = require('./roomPersistence');
      roomPersistenceManager.loadRoomState.mockResolvedValue(mockRoomState);
      
      mockPrisma.roomParticipant.updateMany.mockResolvedValue({});
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.notification.createMany.mockResolvedValue({});

      await recoveryManager.recoverRoom('room1', 'ABC123');

      expect(mockPrisma.multiplayerRoom.update).toHaveBeenCalledWith({
        where: { id: 'room1' },
        data: {
          status: 'WAITING',
          updatedAt: expect.any(Date),
          startedAt: mockRoomState.sessionState.startedAt,
        }
      });
    });
  });

  describe('handleParticipantReconnection', () => {
    it('should handle successful reconnection', async () => {
      const mockRoom = {
        id: 'room1',
        status: 'WAITING',
        participants: [
          {
            id: 'participant1',
            userId: 'user1',
            role: 'HOST',
            isOnline: false,
          }
        ]
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.roomParticipant.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await recoveryManager.handleParticipantReconnection('room1', 'user1');

      expect(result).toBe(true);
      expect(mockPrisma.roomParticipant.update).toHaveBeenCalledWith({
        where: { id: 'participant1' },
        data: { 
          isOnline: true,
          lastSeen: expect.any(Date)
        }
      });
    });

    it('should return false for non-existent room', async () => {
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(null);

      const result = await recoveryManager.handleParticipantReconnection('nonexistent', 'user1');

      expect(result).toBe(false);
    });

    it('should return false for expired room', async () => {
      const mockRoom = {
        id: 'room1',
        status: 'EXPIRED',
        participants: []
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);

      const result = await recoveryManager.handleParticipantReconnection('room1', 'user1');

      expect(result).toBe(false);
    });

    it('should return false for non-participant', async () => {
      const mockRoom = {
        id: 'room1',
        status: 'WAITING',
        participants: []
      };

      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue(mockRoom);

      const result = await recoveryManager.handleParticipantReconnection('room1', 'user1');

      expect(result).toBe(false);
    });
  });

  describe('getRecoveryStats', () => {
    it('should return recovery statistics', async () => {
      mockPrisma.multiplayerRoom.count
        .mockResolvedValueOnce(100) // totalRooms
        .mockResolvedValueOnce(10)  // activeRooms
        .mockResolvedValueOnce(20)  // waitingRooms
        .mockResolvedValueOnce(5);  // expiredRooms

      mockPrisma.auditLog.count.mockResolvedValue(3); // recoveredToday

      const stats = await recoveryManager.getRecoveryStats();

      expect(stats).toEqual({
        totalRooms: 100,
        activeRooms: 10,
        waitingRooms: 20,
        expiredRooms: 5,
        recoveredToday: 3,
      });
    });
  });

  describe('cleanupOldRecoveryData', () => {
    it('should clean up old state versions and audit logs', async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const mockOldStateVersions = [{ id: 'version1' }, { id: 'version2' }];
      const mockOldRecoveryLogs = [{ id: 'log1' }, { id: 'log2' }];

      mockPrisma.roomStateVersion.findMany.mockResolvedValue(mockOldStateVersions);
      mockPrisma.roomStateVersion.deleteMany.mockResolvedValue({});
      mockPrisma.auditLog.findMany.mockResolvedValue(mockOldRecoveryLogs);
      mockPrisma.auditLog.deleteMany.mockResolvedValue({});

      await recoveryManager.cleanupOldRecoveryData();

      expect(mockPrisma.roomStateVersion.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['version1', 'version2'] } }
      });

      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['log1', 'log2'] } }
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      mockPrisma.roomStateVersion.findMany.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(recoveryManager.cleanupOldRecoveryData()).resolves.toBeUndefined();
    });
  });
});
