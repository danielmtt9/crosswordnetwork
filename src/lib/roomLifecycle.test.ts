import { RoomLifecycleManager } from './roomLifecycle';
import { PrismaClient, RoomStatus } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    multiplayerRoom: {
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    roomParticipant: {
      deleteMany: jest.fn(),
    },
    roomMessage: {
      deleteMany: jest.fn(),
    },
    roomInvite: {
      deleteMany: jest.fn(),
    },
    joinRequest: {
      deleteMany: jest.fn(),
    },
    roomHintUsage: {
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      createMany: jest.fn(),
    },
  })),
}));

describe('RoomLifecycleManager', () => {
  let lifecycleManager: RoomLifecycleManager;
  let mockPrisma: any;

  beforeEach(() => {
    lifecycleManager = new RoomLifecycleManager();
    mockPrisma = new (require('@prisma/client').PrismaClient)();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidTransition', () => {
    it('should allow valid transitions', () => {
      // Use reflection to access private method
      const isValidTransition = (lifecycleManager as any).isValidTransition.bind(lifecycleManager);
      
      expect(isValidTransition('WAITING', 'ACTIVE')).toBe(true);
      expect(isValidTransition('WAITING', 'EXPIRED')).toBe(true);
      expect(isValidTransition('ACTIVE', 'WAITING')).toBe(true);
      expect(isValidTransition('ACTIVE', 'COMPLETED')).toBe(true);
      expect(isValidTransition('ACTIVE', 'EXPIRED')).toBe(true);
      expect(isValidTransition('COMPLETED', 'EXPIRED')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      const isValidTransition = (lifecycleManager as any).isValidTransition.bind(lifecycleManager);
      
      expect(isValidTransition('EXPIRED', 'ACTIVE')).toBe(false);
      expect(isValidTransition('COMPLETED', 'ACTIVE')).toBe(false);
      expect(isValidTransition('WAITING', 'COMPLETED')).toBe(false);
    });
  });

  describe('transitionRoomStatus', () => {
    it('should successfully transition room status', async () => {
      const roomId = 'room-123';
      const roomCode = 'ABC123';
      
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.roomParticipant.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'user-2' }
      ]);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        roomCode: 'ABC123',
        name: 'Test Room'
      });
      mockPrisma.notification.createMany.mockResolvedValue({});

      const result = await lifecycleManager.transitionRoomStatus(
        roomId,
        roomCode,
        'WAITING',
        'ACTIVE',
        'Test transition',
        'user-123'
      );

      expect(result).toBe(true);
      expect(mockPrisma.multiplayerRoom.update).toHaveBeenCalledWith({
        where: { id: roomId },
        data: {
          status: 'ACTIVE',
          updatedAt: expect.any(Date),
          startedAt: expect.any(Date)
        }
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
      expect(mockPrisma.notification.createMany).toHaveBeenCalled();
    });

    it('should reject invalid transitions', async () => {
      const result = await lifecycleManager.transitionRoomStatus(
        'room-123',
        'ABC123',
        'EXPIRED',
        'ACTIVE',
        'Invalid transition'
      );

      expect(result).toBe(false);
      expect(mockPrisma.multiplayerRoom.update).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.multiplayerRoom.update.mockRejectedValue(new Error('Database error'));

      const result = await lifecycleManager.transitionRoomStatus(
        'room-123',
        'ABC123',
        'WAITING',
        'ACTIVE',
        'Test transition'
      );

      expect(result).toBe(false);
    });
  });

  describe('getNotificationTitle', () => {
    it('should return correct titles for different statuses', () => {
      const getNotificationTitle = (lifecycleManager as any).getNotificationTitle.bind(lifecycleManager);
      
      expect(getNotificationTitle('ACTIVE')).toBe('Session Started');
      expect(getNotificationTitle('COMPLETED')).toBe('Session Completed');
      expect(getNotificationTitle('EXPIRED')).toBe('Room Expired');
    });
  });

  describe('getNotificationMessage', () => {
    it('should return correct messages for different statuses', () => {
      const getNotificationMessage = (lifecycleManager as any).getNotificationMessage.bind(lifecycleManager);
      
      expect(getNotificationMessage('ACTIVE', 'Started by host', 'Test Room'))
        .toBe('The session in "Test Room" has started!');
      expect(getNotificationMessage('COMPLETED', 'Completed by host', 'Test Room'))
        .toBe('The session in "Test Room" has been completed.');
      expect(getNotificationMessage('EXPIRED', 'No activity', 'Test Room'))
        .toBe('The room "Test Room" has expired. Reason: No activity');
    });
  });

  describe('expireOldRooms', () => {
    it('should expire rooms older than max age', async () => {
      const maxAge = new Date('2023-01-01');
      const oldRooms = [
        {
          id: 'room-1',
          roomCode: 'ABC123',
          status: 'WAITING',
          createdAt: new Date('2022-12-01'),
          participants: []
        },
        {
          id: 'room-2',
          roomCode: 'DEF456',
          status: 'ACTIVE',
          createdAt: new Date('2022-11-01'),
          participants: []
        }
      ];

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(oldRooms);
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.roomParticipant.findMany.mockResolvedValue([]);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        roomCode: 'ABC123',
        name: 'Test Room'
      });
      mockPrisma.notification.createMany.mockResolvedValue({});

      const expireOldRooms = (lifecycleManager as any).expireOldRooms.bind(lifecycleManager);
      await expireOldRooms(maxAge);

      expect(mockPrisma.multiplayerRoom.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: maxAge },
          status: { in: ['WAITING', 'ACTIVE'] }
        },
        include: { participants: true }
      });
      expect(mockPrisma.multiplayerRoom.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('expireInactiveRooms', () => {
    it('should expire rooms that have been inactive', async () => {
      const maxInactiveTime = new Date('2023-01-01');
      const inactiveRooms = [
        {
          id: 'room-1',
          roomCode: 'ABC123',
          status: 'WAITING',
          updatedAt: new Date('2022-12-01'),
          participants: []
        }
      ];

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(inactiveRooms);
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.roomParticipant.findMany.mockResolvedValue([]);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        roomCode: 'ABC123',
        name: 'Test Room'
      });
      mockPrisma.notification.createMany.mockResolvedValue({});

      const expireInactiveRooms = (lifecycleManager as any).expireInactiveRooms.bind(lifecycleManager);
      await expireInactiveRooms(maxInactiveTime);

      expect(mockPrisma.multiplayerRoom.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              status: 'WAITING',
              updatedAt: { lt: maxInactiveTime }
            },
            {
              status: 'ACTIVE',
              updatedAt: { lt: maxInactiveTime }
            }
          ]
        },
        include: { participants: true }
      });
    });
  });

  describe('cleanupEmptyRooms', () => {
    it('should expire rooms with no participants', async () => {
      const emptyRooms = [
        {
          id: 'room-1',
          roomCode: 'ABC123',
          status: 'WAITING',
          participants: []
        }
      ];

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(emptyRooms);
      mockPrisma.multiplayerRoom.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});
      mockPrisma.roomParticipant.findMany.mockResolvedValue([]);
      mockPrisma.multiplayerRoom.findUnique.mockResolvedValue({
        roomCode: 'ABC123',
        name: 'Test Room'
      });
      mockPrisma.notification.createMany.mockResolvedValue({});

      const cleanupEmptyRooms = (lifecycleManager as any).cleanupEmptyRooms.bind(lifecycleManager);
      await cleanupEmptyRooms();

      expect(mockPrisma.multiplayerRoom.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['WAITING', 'ACTIVE'] },
          participants: { none: {} }
        }
      });
    });
  });

  describe('cleanupExpiredRooms', () => {
    it('should delete expired rooms and related data', async () => {
      const expiredRooms = [
        {
          id: 'room-1',
          roomCode: 'ABC123',
          status: 'EXPIRED',
          completedAt: new Date('2022-12-01')
        }
      ];

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(expiredRooms);
      mockPrisma.roomParticipant.deleteMany.mockResolvedValue({});
      mockPrisma.roomMessage.deleteMany.mockResolvedValue({});
      mockPrisma.roomInvite.deleteMany.mockResolvedValue({});
      mockPrisma.joinRequest.deleteMany.mockResolvedValue({});
      mockPrisma.roomHintUsage.deleteMany.mockResolvedValue({});
      mockPrisma.multiplayerRoom.delete.mockResolvedValue({});

      const cleanupExpiredRooms = (lifecycleManager as any).cleanupExpiredRooms.bind(lifecycleManager);
      await cleanupExpiredRooms();

      expect(mockPrisma.roomParticipant.deleteMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1' }
      });
      expect(mockPrisma.multiplayerRoom.delete).toHaveBeenCalledWith({
        where: { id: 'room-1' }
      });
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const mockStats = {
        totalRooms: 100,
        activeRooms: 10,
        waitingRooms: 20,
        completedRooms: 50,
        expiredRooms: 20
      };

      const mockRoomAges = [
        { createdAt: new Date('2023-01-01') },
        { createdAt: new Date('2023-01-02') }
      ];

      const mockSessionDurations = [
        { startedAt: new Date('2023-01-01T10:00:00'), completedAt: new Date('2023-01-01T11:00:00') },
        { startedAt: new Date('2023-01-02T10:00:00'), completedAt: new Date('2023-01-02T10:30:00') }
      ];

      mockPrisma.multiplayerRoom.count
        .mockResolvedValueOnce(mockStats.totalRooms)
        .mockResolvedValueOnce(mockStats.activeRooms)
        .mockResolvedValueOnce(mockStats.waitingRooms)
        .mockResolvedValueOnce(mockStats.completedRooms)
        .mockResolvedValueOnce(mockStats.expiredRooms);

      mockPrisma.multiplayerRoom.findMany
        .mockResolvedValueOnce(mockRoomAges)
        .mockResolvedValueOnce(mockSessionDurations);

      const stats = await lifecycleManager.getStatistics();

      expect(stats.totalRooms).toBe(100);
      expect(stats.activeRooms).toBe(10);
      expect(stats.waitingRooms).toBe(20);
      expect(stats.completedRooms).toBe(50);
      expect(stats.expiredRooms).toBe(20);
      expect(stats.averageRoomAge).toBeGreaterThan(0);
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
    });
  });

  describe('start and stop', () => {
    it('should start and stop the lifecycle manager', () => {
      const startSpy = jest.spyOn(lifecycleManager, 'start');
      const stopSpy = jest.spyOn(lifecycleManager, 'stop');

      lifecycleManager.start();
      expect(startSpy).toHaveBeenCalled();

      lifecycleManager.stop();
      expect(stopSpy).toHaveBeenCalled();
    });
  });
});
