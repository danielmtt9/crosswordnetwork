import { MultiplayerStatsManager } from './multiplayerStats';
import { ParticipantRole } from '@prisma/client';

// Mock Prisma
jest.mock('./prisma', () => ({
  prisma: {
    userStats: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    roomParticipant: {
      findMany: jest.fn(),
      count: jest.fn()
    },
    multiplayerRoom: {
      findMany: jest.fn()
    },
    friendship: {
      findMany: jest.fn()
    },
    achievement: {
      findMany: jest.fn()
    }
  }
}));

const mockPrisma = require('./prisma').prisma;

describe('MultiplayerStatsManager', () => {
  const mockUserId = 'user1';
  const mockSessionData = {
    roomId: 'room1',
    userId: mockUserId,
    role: 'PLAYER' as ParticipantRole,
    joinedAt: new Date('2023-01-01T10:00:00Z'),
    leftAt: new Date('2023-01-01T11:00:00Z'),
    isCompleted: true,
    score: 100,
    hintsUsed: 2,
    sessionDuration: 3600
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserStats', () => {
    it('should create new user stats if they do not exist', async () => {
      mockPrisma.userStats.findUnique.mockResolvedValue(null);
      mockPrisma.userStats.create.mockResolvedValue({
        userId: mockUserId,
        totalPlayTime: 0,
        totalScore: 0
      });
      mockPrisma.userStats.update.mockResolvedValue({});

      await MultiplayerStatsManager.updateUserStats(mockUserId, mockSessionData);

      expect(mockPrisma.userStats.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          totalPuzzlesStarted: 0,
          totalPuzzlesCompleted: 0,
          totalPlayTime: 0,
          averageAccuracy: 100.0,
          averageCompletionTime: 0.0,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 0,
          achievementPoints: 0
        }
      });
    });

    it('should update existing user stats', async () => {
      const existingStats = {
        userId: mockUserId,
        totalPlayTime: 1000,
        totalScore: 50
      };

      mockPrisma.userStats.findUnique.mockResolvedValue(existingStats);
      mockPrisma.userStats.update.mockResolvedValue({});

      await MultiplayerStatsManager.updateUserStats(mockUserId, mockSessionData);

      expect(mockPrisma.userStats.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          totalPlayTime: 4600, // 1000 + 3600
          lastPlayedDate: expect.any(Date),
          totalScore: 150 // 50 + 100
        }
      });
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.userStats.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        MultiplayerStatsManager.updateUserStats(mockUserId, mockSessionData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getUserMultiplayerStats', () => {
    it('should return default stats when user stats do not exist', async () => {
      mockPrisma.userStats.findUnique.mockResolvedValue(null);

      const stats = await MultiplayerStatsManager.getUserMultiplayerStats(mockUserId);

      expect(stats).toEqual({
        roomsJoined: 0,
        roomsHosted: 0,
        roomsCompleted: 0,
        roomsSpectated: 0,
        totalMultiplayerTime: 0,
        averageSessionDuration: 0,
        uniquePlayersMet: 0,
        friendsPlayedWith: 0,
        multiplayerCompletionRate: 0,
        averageMultiplayerScore: 0,
        bestMultiplayerScore: 0,
        timesAsHost: 0,
        timesAsPlayer: 0,
        timesAsSpectator: 0,
        lastMultiplayerSession: null,
        currentStreak: 0,
        longestStreak: 0,
        multiplayerAchievementsEarned: 0,
        multiplayerAchievementPoints: 0
      });
    });

    it('should return stats from existing user stats', async () => {
      const existingStats = {
        userId: mockUserId,
        totalPlayTime: 1000
      };

      mockPrisma.userStats.findUnique.mockResolvedValue(existingStats);

      const stats = await MultiplayerStatsManager.getUserMultiplayerStats(mockUserId);

      expect(stats).toBeDefined();
      expect(stats.totalMultiplayerTime).toBe(0); // Default value since we're not parsing from metadata
    });
  });

  describe('getMultiplayerLeaderboard', () => {
    it('should return leaderboard data', async () => {
      const mockRooms = [
        {
          id: 'room1',
          status: 'COMPLETED',
          completedAt: new Date('2023-01-01T12:00:00Z'),
          participants: [
            {
              role: 'PLAYER',
              user: { id: 'user1', name: 'Alice' }
            },
            {
              role: 'PLAYER',
              user: { id: 'user2', name: 'Bob' }
            }
          ]
        },
        {
          id: 'room2',
          status: 'COMPLETED',
          completedAt: new Date('2023-01-01T13:00:00Z'),
          participants: [
            {
              role: 'PLAYER',
              user: { id: 'user1', name: 'Alice' }
            }
          ]
        }
      ];

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(mockRooms);

      const leaderboard = await MultiplayerStatsManager.getMultiplayerLeaderboard('ALL_TIME', 10);

      expect(leaderboard).toHaveLength(2);
      expect(leaderboard[0]).toEqual({
        userId: 'user1',
        userName: 'Alice',
        userAvatar: undefined,
        metric: 'rooms_completed',
        value: 2,
        rank: 1
      });
      expect(leaderboard[1]).toEqual({
        userId: 'user2',
        userName: 'Bob',
        userAvatar: undefined,
        metric: 'rooms_completed',
        value: 1,
        rank: 2
      });
    });

    it('should handle empty leaderboard', async () => {
      mockPrisma.multiplayerRoom.findMany.mockResolvedValue([]);

      const leaderboard = await MultiplayerStatsManager.getMultiplayerLeaderboard('ALL_TIME', 10);

      expect(leaderboard).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const mockRooms = Array.from({ length: 20 }, (_, i) => ({
        id: `room${i}`,
        status: 'COMPLETED',
        completedAt: new Date('2023-01-01T12:00:00Z'),
        participants: [
          {
            role: 'PLAYER',
            user: { id: `user${i}`, name: `User${i}` }
          }
        ]
      }));

      mockPrisma.multiplayerRoom.findMany.mockResolvedValue(mockRooms);

      const leaderboard = await MultiplayerStatsManager.getMultiplayerLeaderboard('ALL_TIME', 5);

      expect(leaderboard).toHaveLength(5);
    });
  });

  describe('getMultiplayerAchievementProgress', () => {
    it('should return achievement progress', async () => {
      const mockAchievements = [
        {
          id: 'ach1',
          key: 'first_room',
          name: 'First Room',
          description: 'Join your first multiplayer room',
          userAchievements: [
            {
              earnedAt: new Date('2023-01-01T10:00:00Z')
            }
          ]
        },
        {
          id: 'ach2',
          key: 'social_solver',
          name: 'Social Solver',
          description: 'Complete 10 rooms with friends',
          userAchievements: []
        }
      ];

      mockPrisma.achievement.findMany.mockResolvedValue(mockAchievements);

      const achievements = await MultiplayerStatsManager.getMultiplayerAchievementProgress(mockUserId);

      expect(achievements).toHaveLength(2);
      expect(achievements[0]).toEqual({
        achievementId: 'ach1',
        achievementKey: 'first_room',
        name: 'First Room',
        description: 'Join your first multiplayer room',
        progress: 0,
        maxProgress: 1,
        isEarned: true,
        earnedAt: new Date('2023-01-01T10:00:00Z')
      });
      expect(achievements[1]).toEqual({
        achievementId: 'ach2',
        achievementKey: 'social_solver',
        name: 'Social Solver',
        description: 'Complete 10 rooms with friends',
        progress: 0,
        maxProgress: 1,
        isEarned: false,
        earnedAt: undefined
      });
    });

    it('should handle empty achievements', async () => {
      mockPrisma.achievement.findMany.mockResolvedValue([]);

      const achievements = await MultiplayerStatsManager.getMultiplayerAchievementProgress(mockUserId);

      expect(achievements).toHaveLength(0);
    });
  });
});
