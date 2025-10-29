// Integration tests for data integrity
import { PrismaClient } from '@prisma/client'
import { createTestUser, createTestPuzzle, createTestRoom } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Data Integrity Integration Tests', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
    })
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
    await prisma.$disconnect()
  })

  describe('User Data Integrity', () => {
    test('should enforce unique email constraint', async () => {
      // Create first user
      const user1 = await createTestUser({
        name: 'User 1',
        email: 'duplicate@test.com',
        username: 'user1',
      })
      
      expect(user1).toBeDefined()
      
      // Try to create second user with same email
      await expect(
        prisma.user.create({
          data: {
            id: `test_user_2_${Date.now()}`,
            name: 'User 2',
            email: 'duplicate@test.com', // Same email
            username: 'user2',
            role: 'FREE',
            accountStatus: 'ACTIVE',
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce unique username constraint', async () => {
      // Create first user
      const user1 = await createTestUser({
        name: 'User 1',
        email: 'user1@test.com',
        username: 'duplicate_username',
      })
      
      expect(user1).toBeDefined()
      
      // Try to create second user with same username
      await expect(
        prisma.user.create({
          data: {
            id: `test_user_2_${Date.now()}`,
            name: 'User 2',
            email: 'user2@test.com',
            username: 'duplicate_username', // Same username
            role: 'FREE',
            accountStatus: 'ACTIVE',
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid role constraint', async () => {
      await expect(
        prisma.user.create({
          data: {
            id: `test_user_${Date.now()}`,
            name: 'Test User',
            email: 'test@test.com',
            username: 'testuser',
            role: 'INVALID_ROLE', // Invalid role
            accountStatus: 'ACTIVE',
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid account status constraint', async () => {
      await expect(
        prisma.user.create({
          data: {
            id: `test_user_${Date.now()}`,
            name: 'Test User',
            email: 'test@test.com',
            username: 'testuser',
            role: 'FREE',
            accountStatus: 'INVALID_STATUS', // Invalid status
          },
        })
      ).rejects.toThrow()
    })

    test('should handle user deletion with cascade', async () => {
      // Create user with related data
      const user = await createTestUser({
        name: 'Cascade Test User',
        email: 'cascade@test.com',
        username: 'cascadeuser',
      })
      
      // Create user stats
      const userStats = await prisma.userStats.create({
        data: {
          userId: user.id,
          totalPuzzlesStarted: 0,
          totalPuzzlesCompleted: 0,
          totalPlayTime: 0,
          averageAccuracy: 100.0,
          averageCompletionTime: 0.0,
          currentStreak: 0,
          longestStreak: 0,
          totalScore: 0,
          achievementPoints: 0,
        },
      })
      
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'FRIEND_REQUEST',
          title: 'Test Notification',
          message: 'Test message',
        },
      })
      
      // Delete user
      await prisma.user.delete({
        where: { id: user.id },
      })
      
      // Verify related data was deleted
      const deletedUserStats = await prisma.userStats.findUnique({
        where: { userId: user.id },
      })
      expect(deletedUserStats).toBeNull()
      
      const deletedNotification = await prisma.notification.findUnique({
        where: { id: notification.id },
      })
      expect(deletedNotification).toBeNull()
    })
  })

  describe('Puzzle Data Integrity', () => {
    test('should enforce valid tier constraint', async () => {
      await expect(
        prisma.puzzle.create({
          data: {
            title: 'Test Puzzle',
            description: 'A test puzzle',
            filename: 'test-puzzle.json',
            original_filename: 'test-puzzle.json',
            file_path: '/test/puzzles/test-puzzle.json',
            tier: 'INVALID_TIER', // Invalid tier
            category: 'test',
            difficulty: 'easy',
            is_active: true,
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid difficulty constraint', async () => {
      await expect(
        prisma.puzzle.create({
          data: {
            title: 'Test Puzzle',
            description: 'A test puzzle',
            filename: 'test-puzzle.json',
            original_filename: 'test-puzzle.json',
            file_path: '/test/puzzles/test-puzzle.json',
            tier: 'free',
            category: 'test',
            difficulty: 'INVALID_DIFFICULTY', // Invalid difficulty
            is_active: true,
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce positive play count', async () => {
      const puzzle = await createTestPuzzle({
        title: 'Test Puzzle',
        play_count: -1, // Negative play count
      })
      
      // Should be set to 0 or positive value
      expect(puzzle.play_count).toBeGreaterThanOrEqual(0)
    })

    test('should enforce valid completion rate range', async () => {
      const puzzle = await createTestPuzzle({
        title: 'Test Puzzle',
        completion_rate: 150.0, // Invalid completion rate > 100%
      })
      
      // Should be clamped to valid range
      expect(puzzle.completion_rate).toBeLessThanOrEqual(100.0)
    })
  })

  describe('Room Data Integrity', () => {
    test('should enforce unique room code constraint', async () => {
      const puzzle = await createTestPuzzle()
      const user = await createTestUser()
      
      // Create first room
      const room1 = await createTestRoom({
        roomCode: 'ABC123',
        puzzleId: puzzle.id,
        hostUserId: user.id,
      })
      
      expect(room1).toBeDefined()
      
      // Try to create second room with same room code
      await expect(
        prisma.multiplayerRoom.create({
          data: {
            id: `test_room_2_${Date.now()}`,
            roomCode: 'ABC123', // Same room code
            name: 'Test Room 2',
            description: 'A test room',
            puzzleId: puzzle.id,
            hostUserId: user.id,
            maxPlayers: 4,
            isPrivate: false,
            status: 'WAITING',
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid room status constraint', async () => {
      const puzzle = await createTestPuzzle()
      const user = await createTestUser()
      
      await expect(
        prisma.multiplayerRoom.create({
          data: {
            id: `test_room_${Date.now()}`,
            roomCode: 'TEST123',
            name: 'Test Room',
            description: 'A test room',
            puzzleId: puzzle.id,
            hostUserId: user.id,
            maxPlayers: 4,
            isPrivate: false,
            status: 'INVALID_STATUS', // Invalid status
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce positive max players', async () => {
      const puzzle = await createTestPuzzle()
      const user = await createTestUser()
      
      const room = await createTestRoom({
        maxPlayers: -1, // Negative max players
        puzzleId: puzzle.id,
        hostUserId: user.id,
      })
      
      // Should be set to positive value
      expect(room.maxPlayers).toBeGreaterThan(0)
    })

    test('should enforce valid time limit range', async () => {
      const puzzle = await createTestPuzzle()
      const user = await createTestUser()
      
      const room = await createTestRoom({
        timeLimit: -1, // Negative time limit
        puzzleId: puzzle.id,
        hostUserId: user.id,
      })
      
      // Should be null or positive value
      expect(room.timeLimit).toBeNull()
    })
  })

  describe('Feature Flag Data Integrity', () => {
    test('should enforce unique feature flag name', async () => {
      const admin = await createTestUser({ role: 'ADMIN' })
      
      // Create first feature flag
      const flag1 = await prisma.featureFlag.create({
        data: {
          name: 'duplicate_flag',
          description: 'A duplicate flag',
          enabled: false,
          rolloutPercentage: 0,
          createdBy: admin.id,
        },
      })
      
      expect(flag1).toBeDefined()
      
      // Try to create second feature flag with same name
      await expect(
        prisma.featureFlag.create({
          data: {
            name: 'duplicate_flag', // Same name
            description: 'Another duplicate flag',
            enabled: true,
            rolloutPercentage: 50,
            createdBy: admin.id,
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid rollout percentage range', async () => {
      const admin = await createTestUser({ role: 'ADMIN' })
      
      const flag = await prisma.featureFlag.create({
        data: {
          name: `test_flag_${Date.now()}`,
          description: 'A test flag',
          enabled: false,
          rolloutPercentage: 150, // Invalid rollout percentage > 100%
          createdBy: admin.id,
        },
      })
      
      // Should be clamped to valid range
      expect(flag.rolloutPercentage).toBeLessThanOrEqual(100)
    })

    test('should enforce positive version number', async () => {
      const admin = await createTestUser({ role: 'ADMIN' })
      
      const flag = await prisma.featureFlag.create({
        data: {
          name: `test_flag_${Date.now()}`,
          description: 'A test flag',
          enabled: false,
          rolloutPercentage: 0,
          createdBy: admin.id,
          version: -1, // Negative version
        },
      })
      
      // Should be set to positive value
      expect(flag.version).toBeGreaterThan(0)
    })
  })

  describe('System Config Data Integrity', () => {
    test('should enforce unique config key', async () => {
      const admin = await createTestUser({ role: 'ADMIN' })
      
      // Create first config
      const config1 = await prisma.systemConfig.create({
        data: {
          key: 'duplicate_config',
          value: { test: true },
          description: 'A duplicate config',
          category: 'test',
          isPublic: false,
          updatedBy: admin.id,
        },
      })
      
      expect(config1).toBeDefined()
      
      // Try to create second config with same key
      await expect(
        prisma.systemConfig.create({
          data: {
            key: 'duplicate_config', // Same key
            value: { test: false },
            description: 'Another duplicate config',
            category: 'test',
            isPublic: false,
            updatedBy: admin.id,
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid JSON value', async () => {
      const admin = await createTestUser({ role: 'ADMIN' })
      
      const config = await prisma.systemConfig.create({
        data: {
          key: `test_config_${Date.now()}`,
          value: { test: true, nested: { value: 123 } }, // Valid JSON
          description: 'A test config',
          category: 'test',
          isPublic: false,
          updatedBy: admin.id,
        },
      })
      
      expect(config).toBeDefined()
      expect(config.value).toEqual({ test: true, nested: { value: 123 } })
    })
  })

  describe('User Progress Data Integrity', () => {
    test('should enforce unique user-puzzle combination', async () => {
      const user = await createTestUser()
      const puzzle = await createTestPuzzle()
      
      // Create first user progress
      const progress1 = await prisma.userProgress.create({
        data: {
          userId: user.id,
          puzzleId: puzzle.id,
          completedCells: null,
          hintsUsed: 0,
          isCompleted: false,
          lastPlayedAt: new Date(),
          score: 0,
          startedAt: new Date(),
          timesPlayed: 1,
          totalAccuracy: 100.0,
        },
      })
      
      expect(progress1).toBeDefined()
      
      // Try to create second progress for same user-puzzle combination
      await expect(
        prisma.userProgress.create({
          data: {
            userId: user.id, // Same user
            puzzleId: puzzle.id, // Same puzzle
            completedCells: null,
            hintsUsed: 0,
            isCompleted: false,
            lastPlayedAt: new Date(),
            score: 0,
            startedAt: new Date(),
            timesPlayed: 1,
            totalAccuracy: 100.0,
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce valid accuracy range', async () => {
      const user = await createTestUser()
      const puzzle = await createTestPuzzle()
      
      const progress = await prisma.userProgress.create({
        data: {
          userId: user.id,
          puzzleId: puzzle.id,
          completedCells: null,
          hintsUsed: 0,
          isCompleted: false,
          lastPlayedAt: new Date(),
          score: 0,
          startedAt: new Date(),
          timesPlayed: 1,
          totalAccuracy: 150.0, // Invalid accuracy > 100%
        },
      })
      
      // Should be clamped to valid range
      expect(progress.totalAccuracy).toBeLessThanOrEqual(100.0)
    })

    test('should enforce positive times played', async () => {
      const user = await createTestUser()
      const puzzle = await createTestPuzzle()
      
      const progress = await prisma.userProgress.create({
        data: {
          userId: user.id,
          puzzleId: puzzle.id,
          completedCells: null,
          hintsUsed: 0,
          isCompleted: false,
          lastPlayedAt: new Date(),
          score: 0,
          startedAt: new Date(),
          timesPlayed: -1, // Negative times played
          totalAccuracy: 100.0,
        },
      })
      
      // Should be set to positive value
      expect(progress.timesPlayed).toBeGreaterThan(0)
    })
  })

  describe('Audit Log Data Integrity', () => {
    test('should enforce required actor user ID', async () => {
      await expect(
        prisma.auditLog.create({
          data: {
            actorUserId: '', // Empty actor user ID
            action: 'TEST_ACTION',
            entityType: 'User',
            entityId: 'test-id',
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce required action', async () => {
      const user = await createTestUser()
      
      await expect(
        prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            action: '', // Empty action
            entityType: 'User',
            entityId: 'test-id',
          },
        })
      ).rejects.toThrow()
    })

    test('should enforce required entity type', async () => {
      const user = await createTestUser()
      
      await expect(
        prisma.auditLog.create({
          data: {
            actorUserId: user.id,
            action: 'TEST_ACTION',
            entityType: '', // Empty entity type
            entityId: 'test-id',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Cross-Table Data Integrity', () => {
    test('should maintain referential integrity between users and rooms', async () => {
      const user = await createTestUser()
      const puzzle = await createTestPuzzle()
      
      // Create room with valid user
      const room = await createTestRoom({
        hostUserId: user.id,
        puzzleId: puzzle.id,
      })
      
      expect(room).toBeDefined()
      
      // Try to create room with non-existent user
      await expect(
        prisma.multiplayerRoom.create({
          data: {
            id: `test_room_${Date.now()}`,
            roomCode: 'TEST123',
            name: 'Test Room',
            description: 'A test room',
            puzzleId: puzzle.id,
            hostUserId: 'non-existent-user', // Non-existent user
            maxPlayers: 4,
            isPrivate: false,
            status: 'WAITING',
          },
        })
      ).rejects.toThrow()
    })

    test('should maintain referential integrity between puzzles and rooms', async () => {
      const user = await createTestUser()
      
      // Try to create room with non-existent puzzle
      await expect(
        prisma.multiplayerRoom.create({
          data: {
            id: `test_room_${Date.now()}`,
            roomCode: 'TEST123',
            name: 'Test Room',
            description: 'A test room',
            puzzleId: 99999, // Non-existent puzzle
            hostUserId: user.id,
            maxPlayers: 4,
            isPrivate: false,
            status: 'WAITING',
          },
        })
      ).rejects.toThrow()
    })

    test('should maintain referential integrity between users and progress', async () => {
      const puzzle = await createTestPuzzle()
      
      // Try to create user progress with non-existent user
      await expect(
        prisma.userProgress.create({
          data: {
            userId: 'non-existent-user', // Non-existent user
            puzzleId: puzzle.id,
            completedCells: null,
            hintsUsed: 0,
            isCompleted: false,
            lastPlayedAt: new Date(),
            score: 0,
            startedAt: new Date(),
            timesPlayed: 1,
            totalAccuracy: 100.0,
          },
        })
      ).rejects.toThrow()
    })
  })
})