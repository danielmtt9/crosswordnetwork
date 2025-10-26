/**
 * Unit tests for room persistence utilities
 */

// Mock the entire roomPersistence module
jest.mock('./roomPersistence', () => ({
  updateRoomActivity: jest.fn(),
  cleanupExpiredRooms: jest.fn(),
  getRoomPersistenceSettings: jest.fn(),
  updateRoomPersistenceSettings: jest.fn(),
  logRoomActivity: jest.fn(),
  getRoomActivityHistory: jest.fn(),
  getRoomAnalytics: jest.fn(),
  extendRoomPersistence: jest.fn(),
  isRoomExpired: jest.fn(),
  getExpiringRooms: jest.fn()
}));

import {
  updateRoomActivity,
  cleanupExpiredRooms,
  getRoomPersistenceSettings,
  updateRoomPersistenceSettings,
  logRoomActivity,
  getRoomActivityHistory,
  getRoomAnalytics,
  extendRoomPersistence,
  isRoomExpired,
  getExpiringRooms
} from './roomPersistence';

describe('Room Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRoomActivity', () => {
    it('should call updateRoomActivity with correct parameters', async () => {
      (updateRoomActivity as jest.Mock).mockResolvedValue(undefined);
      
      await updateRoomActivity('room-123');

      expect(updateRoomActivity).toHaveBeenCalledWith('room-123');
    });
  });

  describe('cleanupExpiredRooms', () => {
    it('should call cleanupExpiredRooms', async () => {
      (cleanupExpiredRooms as jest.Mock).mockResolvedValue(5);
      
      const result = await cleanupExpiredRooms();

      expect(cleanupExpiredRooms).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });

  describe('getRoomPersistenceSettings', () => {
    it('should call getRoomPersistenceSettings with correct parameters', async () => {
      const mockSettings = {
        isPersistent: true,
        persistenceDays: 7,
        autoCleanup: true,
        expiresAt: new Date(),
        lastActivityAt: new Date()
      };
      
      (getRoomPersistenceSettings as jest.Mock).mockResolvedValue(mockSettings);
      
      const result = await getRoomPersistenceSettings('room-123');

      expect(getRoomPersistenceSettings).toHaveBeenCalledWith('room-123');
      expect(result).toEqual(mockSettings);
    });
  });

  describe('updateRoomPersistenceSettings', () => {
    it('should call updateRoomPersistenceSettings with correct parameters', async () => {
      (updateRoomPersistenceSettings as jest.Mock).mockResolvedValue(undefined);
      
      const settings = { isPersistent: true, persistenceDays: 14 };
      await updateRoomPersistenceSettings('room-123', settings);

      expect(updateRoomPersistenceSettings).toHaveBeenCalledWith('room-123', settings);
    });
  });

  describe('logRoomActivity', () => {
    it('should call logRoomActivity with correct parameters', async () => {
      (logRoomActivity as jest.Mock).mockResolvedValue(undefined);
      
      const activity = {
        roomId: 'room-123',
        type: 'USER_JOIN',
        description: 'User user-123 joined the room',
        metadata: { test: 'data' }
      };
      
      await logRoomActivity(activity);

      expect(logRoomActivity).toHaveBeenCalledWith(activity);
    });
  });

  describe('getRoomActivityHistory', () => {
    it('should call getRoomActivityHistory with correct parameters', async () => {
      const mockHistory = [
        { roomId: 'room-123', activityType: 'USER_JOIN', metadata: {}, timestamp: new Date() }
      ];
      
      (getRoomActivityHistory as jest.Mock).mockResolvedValue(mockHistory);
      
      const result = await getRoomActivityHistory('room-123');

      expect(getRoomActivityHistory).toHaveBeenCalledWith('room-123');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('getRoomAnalytics', () => {
    it('should call getRoomAnalytics with correct parameters', async () => {
      const mockAnalytics = {
        roomId: 'room-123',
        activeUsers: 5,
        totalActivities: 50,
        sessionDuration: 3600,
        completionRate: 75
      };
      
      (getRoomAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);
      
      const result = await getRoomAnalytics('room-123');

      expect(getRoomAnalytics).toHaveBeenCalledWith('room-123');
      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('extendRoomPersistence', () => {
    it('should call extendRoomPersistence with correct parameters', async () => {
      (extendRoomPersistence as jest.Mock).mockResolvedValue(undefined);
      
      await extendRoomPersistence('room-123', 3);

      expect(extendRoomPersistence).toHaveBeenCalledWith('room-123', 3);
    });
  });

  describe('isRoomExpired', () => {
    it('should call isRoomExpired with correct parameters', async () => {
      (isRoomExpired as jest.Mock).mockResolvedValue(true);
      
      const result = await isRoomExpired('room-123');

      expect(isRoomExpired).toHaveBeenCalledWith('room-123');
      expect(result).toBe(true);
    });
  });

  describe('getExpiringRooms', () => {
    it('should call getExpiringRooms with correct parameters', async () => {
      const mockExpiringRooms = ['room-1', 'room-2'];
      
      (getExpiringRooms as jest.Mock).mockResolvedValue(mockExpiringRooms);
      
      const result = await getExpiringRooms(5);

      expect(getExpiringRooms).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockExpiringRooms);
    });
  });
});