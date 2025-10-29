// Database seeding and cleanup utilities for comprehensive testing
import { PrismaClient } from '@prisma/client'
import { createTestData, cleanupTestData } from '../fixtures/test-data'

const prisma = new PrismaClient()

// Database seeding utilities
export class DatabaseSeeder {
  private static instance: DatabaseSeeder
  private seeded: boolean = false

  private constructor() {}

  public static getInstance(): DatabaseSeeder {
    if (!DatabaseSeeder.instance) {
      DatabaseSeeder.instance = new DatabaseSeeder()
    }
    return DatabaseSeeder.instance
  }

  public async seedDatabase(): Promise<void> {
    if (this.seeded) {
      console.log('Database already seeded, skipping...')
      return
    }

    console.log('Seeding test database...')
    
    try {
      // Create test data
      const testData = await createTestData()
      
      // Create additional relationships
      await this.createRelationships(testData)
      
      this.seeded = true
      console.log('Database seeded successfully')
    } catch (error) {
      console.error('Error seeding database:', error)
      throw error
    }
  }

  private async createRelationships(testData: any): Promise<void> {
    const { users, puzzles, rooms, achievements } = testData

    // Create user progress
    await prisma.userProgress.create({
      data: {
        userId: users[0].id,
        puzzleId: puzzles[0].id,
        ...testData.testUserProgress.incompleteProgress,
      },
    })

    await prisma.userProgress.create({
      data: {
        userId: users[1].id,
        puzzleId: puzzles[1].id,
        ...testData.testUserProgress.completedProgress,
      },
    })

    // Create user stats
    await prisma.userStats.create({
      data: {
        userId: users[0].id,
        ...testData.testUserStats.newUserStats,
      },
    })

    await prisma.userStats.create({
      data: {
        userId: users[1].id,
        ...testData.testUserStats.activeUserStats,
      },
    })

    // Create notifications
    await prisma.notification.create({
      data: {
        userId: users[0].id,
        ...testData.testNotifications.friendRequest,
      },
    })

    await prisma.notification.create({
      data: {
        userId: users[1].id,
        ...testData.testNotifications.roomInvite,
      },
    })

    // Create friendships
    await prisma.friendship.create({
      data: {
        userId: users[0].id,
        friendId: users[1].id,
        ...testData.testFriendships.pendingFriendship,
      },
    })

    // Create room invites
    await prisma.roomInvite.create({
      data: {
        roomId: rooms[0].id,
        invitedById: users[1].id,
        inviteeId: users[0].id,
        ...testData.testRoomInvites.pendingInvite,
      },
    })

    // Create join requests
    await prisma.joinRequest.create({
      data: {
        roomId: rooms[1].id,
        userId: users[0].id,
        ...testData.testJoinRequests.pendingRequest,
      },
    })

    // Create leaderboard entries
    await prisma.leaderboardEntry.create({
      data: {
        userId: users[0].id,
        ...testData.testLeaderboardEntries.weeklyEntry,
      },
    })

    // Create AB tests
    await prisma.aBTest.create({
      data: {
        createdBy: users[1].id,
        ...testData.testABTests.draftTest,
      },
    })

    // Create user achievements
    await prisma.userAchievement.create({
      data: {
        userId: users[0].id,
        achievementId: achievements[0].id,
        progress: 1,
        earnedAt: new Date(),
      },
    })
  }

  public async clearDatabase(): Promise<void> {
    console.log('Clearing test database...')
    
    try {
      await cleanupTestData()
      this.seeded = false
      console.log('Database cleared successfully')
    } catch (error) {
      console.error('Error clearing database:', error)
      throw error
    }
  }

  public async resetDatabase(): Promise<void> {
    await this.clearDatabase()
    await this.seedDatabase()
  }

  public isSeeded(): boolean {
    return this.seeded
  }
}

// Database cleanup utilities
export class DatabaseCleaner {
  private static instance: DatabaseCleaner

  private constructor() {}

  public static getInstance(): DatabaseCleaner {
    if (!DatabaseCleaner.instance) {
      DatabaseCleaner.instance = new DatabaseCleaner()
    }
    return DatabaseCleaner.instance
  }

  public async cleanAllTables(): Promise<void> {
    console.log('Cleaning all tables...')
    
    const tables = [
      'RoomBannedUser',
      'RoomMutedUser',
      'RoomStateVersion',
      'RoomMessage',
      'RoomParticipant',
      'MultiplayerRoom',
      'UserAchievement',
      'UserProgress',
      'AuditLog',
      'Notification',
      'Friendship',
      'RoomInvite',
      'JoinRequest',
      'UserStats',
      'LeaderboardEntry',
      'ABTestResult',
      'ABTest',
      'FeatureFlagHistory',
      'FeatureFlag',
      'SystemConfig',
      'LoginAttempt',
      'PasswordResetToken',
      'Session',
      'Account',
      'User',
    ]

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM ${table}`)
        console.log(`Cleaned table: ${table}`)
      } catch (error) {
        console.warn(`Could not clean table ${table}:`, error.message)
      }
    }
  }

  public async cleanTestData(): Promise<void> {
    console.log('Cleaning test data...')
    
    const tables = [
      'RoomBannedUser',
      'RoomMutedUser',
      'RoomStateVersion',
      'RoomMessage',
      'RoomParticipant',
      'MultiplayerRoom',
      'UserAchievement',
      'UserProgress',
      'AuditLog',
      'Notification',
      'Friendship',
      'RoomInvite',
      'JoinRequest',
      'UserStats',
      'LeaderboardEntry',
      'ABTestResult',
      'ABTest',
      'FeatureFlagHistory',
      'FeatureFlag',
      'SystemConfig',
      'LoginAttempt',
      'PasswordResetToken',
      'Session',
      'Account',
      'User',
    ]

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'test_%' OR email LIKE '%@test.com'`)
        console.log(`Cleaned test data from table: ${table}`)
      } catch (error) {
        console.warn(`Could not clean test data from table ${table}:`, error.message)
      }
    }
  }

  public async cleanByPattern(pattern: string): Promise<void> {
    console.log(`Cleaning data matching pattern: ${pattern}`)
    
    const tables = [
      'RoomBannedUser',
      'RoomMutedUser',
      'RoomStateVersion',
      'RoomMessage',
      'RoomParticipant',
      'MultiplayerRoom',
      'UserAchievement',
      'UserProgress',
      'AuditLog',
      'Notification',
      'Friendship',
      'RoomInvite',
      'JoinRequest',
      'UserStats',
      'LeaderboardEntry',
      'ABTestResult',
      'ABTest',
      'FeatureFlagHistory',
      'FeatureFlag',
      'SystemConfig',
      'LoginAttempt',
      'PasswordResetToken',
      'Session',
      'Account',
      'User',
    ]

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE ?`, `%${pattern}%`)
        console.log(`Cleaned data matching pattern '${pattern}' from table: ${table}`)
      } catch (error) {
        console.warn(`Could not clean data matching pattern '${pattern}' from table ${table}:`, error.message)
      }
    }
  }

  public async cleanByDateRange(startDate: Date, endDate: Date): Promise<void> {
    console.log(`Cleaning data between ${startDate.toISOString()} and ${endDate.toISOString()}`)
    
    const tables = [
      'RoomBannedUser',
      'RoomMutedUser',
      'RoomStateVersion',
      'RoomMessage',
      'RoomParticipant',
      'MultiplayerRoom',
      'UserAchievement',
      'UserProgress',
      'AuditLog',
      'Notification',
      'Friendship',
      'RoomInvite',
      'JoinRequest',
      'UserStats',
      'LeaderboardEntry',
      'ABTestResult',
      'ABTest',
      'FeatureFlagHistory',
      'FeatureFlag',
      'SystemConfig',
      'LoginAttempt',
      'PasswordResetToken',
      'Session',
      'Account',
      'User',
    ]

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE createdAt BETWEEN ? AND ?`, startDate, endDate)
        console.log(`Cleaned data between dates from table: ${table}`)
      } catch (error) {
        console.warn(`Could not clean data between dates from table ${table}:`, error.message)
      }
    }
  }
}

// Database health check utilities
export class DatabaseHealthChecker {
  private static instance: DatabaseHealthChecker

  private constructor() {}

  public static getInstance(): DatabaseHealthChecker {
    if (!DatabaseHealthChecker.instance) {
      DatabaseHealthChecker.instance = new DatabaseHealthChecker()
    }
    return DatabaseHealthChecker.instance
  }

  public async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { connected: true }
    } catch (error) {
      return { connected: false, error: error.message }
    }
  }

  public async checkTableIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    try {
      // Check if all required tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `
      
      const tableNames = (tables as any[]).map(t => t.table_name)
      const requiredTables = [
        'User',
        'puzzles',
        'multiplayer_rooms',
        'FeatureFlag',
        'SystemConfig',
        'ABTest',
        'UserProgress',
        'AuditLog',
        'Notification',
        'Friendship',
        'RoomInvite',
        'JoinRequest',
        'UserStats',
        'LeaderboardEntry',
      ]

      for (const requiredTable of requiredTables) {
        if (!tableNames.includes(requiredTable)) {
          errors.push(`Required table '${requiredTable}' not found`)
        }
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      errors.push(`Error checking table integrity: ${error.message}`)
      return { valid: false, errors }
    }
  }

  public async checkDataIntegrity(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []
    
    try {
      // Check for duplicate emails
      const duplicateEmails = await prisma.$queryRaw`
        SELECT email, COUNT(*) as count 
        FROM User 
        GROUP BY email 
        HAVING COUNT(*) > 1
      `
      
      if ((duplicateEmails as any[]).length > 0) {
        errors.push('Duplicate emails found in User table')
      }

      // Check for duplicate usernames
      const duplicateUsernames = await prisma.$queryRaw`
        SELECT username, COUNT(*) as count 
        FROM User 
        GROUP BY username 
        HAVING COUNT(*) > 1
      `
      
      if ((duplicateUsernames as any[]).length > 0) {
        errors.push('Duplicate usernames found in User table')
      }

      // Check for duplicate room codes
      const duplicateRoomCodes = await prisma.$queryRaw`
        SELECT roomCode, COUNT(*) as count 
        FROM multiplayer_rooms 
        GROUP BY roomCode 
        HAVING COUNT(*) > 1
      `
      
      if ((duplicateRoomCodes as any[]).length > 0) {
        errors.push('Duplicate room codes found in multiplayer_rooms table')
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      errors.push(`Error checking data integrity: ${error.message}`)
      return { valid: false, errors }
    }
  }

  public async checkPerformance(): Promise<{ performance: 'good' | 'fair' | 'poor'; metrics: any }> {
    const metrics: any = {}
    
    try {
      // Test query performance
      const start = process.hrtime.bigint()
      await prisma.$queryRaw`SELECT 1`
      const end = process.hrtime.bigint()
      const queryTime = Number(end - start) / 1000000 // Convert to milliseconds
      
      metrics.queryTime = queryTime
      
      // Test connection pool
      const connections = Array(10).fill().map(() => prisma.$queryRaw`SELECT 1`)
      const connectionStart = process.hrtime.bigint()
      await Promise.all(connections)
      const connectionEnd = process.hrtime.bigint()
      const connectionTime = Number(connectionEnd - connectionStart) / 1000000
      
      metrics.connectionTime = connectionTime
      
      // Determine performance level
      let performance: 'good' | 'fair' | 'poor' = 'good'
      if (queryTime > 100 || connectionTime > 500) {
        performance = 'poor'
      } else if (queryTime > 50 || connectionTime > 200) {
        performance = 'fair'
      }
      
      return { performance, metrics }
    } catch (error) {
      return { performance: 'poor', metrics: { error: error.message } }
    }
  }
}

// Database migration utilities
export class DatabaseMigrator {
  private static instance: DatabaseMigrator

  private constructor() {}

  public static getInstance(): DatabaseMigrator {
    if (!DatabaseMigrator.instance) {
      DatabaseMigrator.instance = new DatabaseMigrator()
    }
    return DatabaseMigrator.instance
  }

  public async runMigrations(): Promise<void> {
    console.log('Running database migrations...')
    
    try {
      await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`
      
      // Run any custom migrations here
      // This would typically use Prisma's migration system
      
      await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`
      console.log('Database migrations completed successfully')
    } catch (error) {
      console.error('Error running migrations:', error)
      throw error
    }
  }

  public async rollbackMigrations(): Promise<void> {
    console.log('Rolling back database migrations...')
    
    try {
      await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`
      
      // Rollback any custom migrations here
      // This would typically use Prisma's migration system
      
      await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`
      console.log('Database migrations rolled back successfully')
    } catch (error) {
      console.error('Error rolling back migrations:', error)
      throw error
    }
  }
}

// Export utilities
export const databaseSeeder = DatabaseSeeder.getInstance()
export const databaseCleaner = DatabaseCleaner.getInstance()
export const databaseHealthChecker = DatabaseHealthChecker.getInstance()
export const databaseMigrator = DatabaseMigrator.getInstance()

export default {
  DatabaseSeeder,
  DatabaseCleaner,
  DatabaseHealthChecker,
  DatabaseMigrator,
  databaseSeeder,
  databaseCleaner,
  databaseHealthChecker,
  databaseMigrator,
}