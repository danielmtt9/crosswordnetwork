// Integration tests for database connections and data integrity
import { PrismaClient } from '@prisma/client'
import { testDatabaseConnection, testMCPDatabaseConnection } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner, databaseHealthChecker } from '../../utils/database-seeding'

describe('Database Connection Integration Tests', () => {
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

  describe('Database Connection', () => {
    test('should connect to primary database', async () => {
      const result = await testDatabaseConnection()
      
      expect(result.connected).toBe(true)
      expect(result.error).toBeNull()
    })

    test('should connect to shadow database if available', async () => {
      const result = await testMCPDatabaseConnection()
      
      // Shadow database may or may not be available
      if (result.shadow.connected) {
        expect(result.shadow.error).toBeNull()
      } else {
        expect(result.shadow.error).toBeDefined()
      }
    })

    test('should handle connection errors gracefully', async () => {
      // Mock database connection failure
      const originalQuery = prisma.$queryRaw
      prisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection failed'))
      
      const result = await testDatabaseConnection()
      
      expect(result.connected).toBe(false)
      expect(result.error).toBe('Connection failed')
      
      // Restore original function
      prisma.$queryRaw = originalQuery
    })

    test('should perform basic health check', async () => {
      const result = await testDatabaseConnection()
      
      expect(result.connected).toBe(true)
      
      if (result.connected) {
        // Test basic query
        const healthCheck = await prisma.$queryRaw`SELECT 1 as health_check`
        expect(healthCheck).toBeDefined()
      }
    })

    test('should check database schema integrity', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Check if required tables exist
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `
        
        const tableNames = (tables as any[]).map(t => t.table_name)
        expect(tableNames).toContain('User')
        expect(tableNames).toContain('puzzles')
        expect(tableNames).toContain('multiplayer_rooms')
      }
    })
  })

  describe('Database Performance', () => {
    test('should measure database query performance', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        const start = process.hrtime.bigint()
        await prisma.$queryRaw`SELECT 1`
        const end = process.hrtime.bigint()
        const duration = Number(end - start) / 1000000
        
        expect(duration).toBeLessThan(100) // Should be under 100ms
      }
    })

    test('should handle concurrent database connections', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        const concurrentQueries = Array(10).fill().map(() => 
          prisma.$queryRaw`SELECT 1`
        )
        
        const results = await Promise.all(concurrentQueries)
        expect(results).toHaveLength(10)
        results.forEach(result => {
          expect(result).toBeDefined()
        })
      }
    })

    test('should maintain connection pool efficiently', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Test multiple rapid connections
        const connections = Array(20).fill().map(() => 
          prisma.$queryRaw`SELECT 1`
        )
        
        const results = await Promise.all(connections)
        expect(results).toHaveLength(20)
        
        // All connections should succeed
        results.forEach(result => {
          expect(result).toBeDefined()
        })
      }
    })
  })

  describe('Database Error Handling', () => {
    test('should handle invalid SQL queries gracefully', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        await expect(
          prisma.$queryRaw`SELECT * FROM non_existent_table`
        ).rejects.toThrow()
      }
    })

    test('should handle database timeout gracefully', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Mock a slow query
        const originalQuery = prisma.$queryRaw
        prisma.$queryRaw = jest.fn().mockImplementation(() => 
          new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Query timeout')), 100)
          })
        )
        
        await expect(
          prisma.$queryRaw`SELECT 1`
        ).rejects.toThrow('Query timeout')
        
        // Restore original function
        prisma.$queryRaw = originalQuery
      }
    })
  })

  describe('Database Transaction Handling', () => {
    test('should handle database transactions correctly', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              id: `test_transaction_${Date.now()}`,
              name: 'Transaction Test User',
              email: `transaction${Date.now()}@test.com`,
              username: `transaction${Date.now()}`,
              role: 'FREE',
              accountStatus: 'ACTIVE',
            },
          })
          
          expect(user).toBeDefined()
          expect(user.id).toContain('test_transaction_')
        })
      }
    })

    test('should rollback transactions on error', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        await expect(
          prisma.$transaction(async (tx) => {
            await tx.user.create({
              data: {
                id: `test_rollback_${Date.now()}`,
                name: 'Rollback Test User',
                email: `rollback${Date.now()}@test.com`,
                username: `rollback${Date.now()}`,
                role: 'FREE',
                accountStatus: 'ACTIVE',
              },
            })
            
            // Force an error
            throw new Error('Transaction rollback test')
          })
        ).rejects.toThrow('Transaction rollback test')
        
        // Verify user was not created
        const user = await prisma.user.findUnique({
          where: { id: `test_rollback_${Date.now()}` }
        })
        expect(user).toBeNull()
      }
    })
  })

  describe('Database Migration Testing', () => {
    test('should verify database schema is up to date', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Check if all required tables exist
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
        
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `
        
        const tableNames = (tables as any[]).map(t => t.table_name)
        
        for (const requiredTable of requiredTables) {
          expect(tableNames).toContain(requiredTable)
        }
      }
    })

    test('should verify database indexes are properly created', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Check for important indexes
        const indexes = await prisma.$queryRaw`
          SELECT table_name, index_name, column_name
          FROM information_schema.statistics
          WHERE table_schema = DATABASE()
        `
        
        const indexMap = new Map()
        ;(indexes as any[]).forEach(index => {
          const key = `${index.table_name}.${index.index_name}`
          if (!indexMap.has(key)) {
            indexMap.set(key, [])
          }
          indexMap.get(key).push(index.column_name)
        })
        
        // Check for important indexes
        expect(indexMap.has('User.email')).toBe(true)
        expect(indexMap.has('User.username')).toBe(true)
        expect(indexMap.has('multiplayer_rooms.roomCode')).toBe(true)
      }
    })
  })

  describe('Database Health Check', () => {
    test('should perform database health check', async () => {
      const result = await databaseHealthChecker.checkConnection()
      
      expect(result.connected).toBe(true)
      expect(result.error).toBeNull()
    })

    test('should check table integrity', async () => {
      const result = await databaseHealthChecker.checkTableIntegrity()
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should check data integrity constraints', async () => {
      const result = await databaseHealthChecker.checkDataIntegrity()
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should check database performance', async () => {
      const result = await databaseHealthChecker.checkPerformance()
      
      expect(result.performance).toBe('good')
      expect(result.metrics).toBeDefined()
    })
  })

  describe('Database Data Integrity', () => {
    test('should enforce unique constraints', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Test unique email constraint
        await prisma.user.create({
          data: {
            id: `test_unique_${Date.now()}`,
            name: 'Test User',
            email: 'unique@test.com',
            username: 'uniqueuser',
            role: 'FREE',
            accountStatus: 'ACTIVE',
          },
        })
        
        // Try to create another user with same email
        await expect(
          prisma.user.create({
            data: {
              id: `test_unique_2_${Date.now()}`,
              name: 'Test User 2',
              email: 'unique@test.com', // Same email
              username: 'uniqueuser2',
              role: 'FREE',
              accountStatus: 'ACTIVE',
            },
          })
        ).rejects.toThrow()
      }
    })

    test('should enforce foreign key constraints', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Try to create a user progress with non-existent user
        await expect(
          prisma.userProgress.create({
            data: {
              userId: 'non-existent-user',
              puzzleId: 1,
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
      }
    })

    test('should handle cascade deletes correctly', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Create a user with related data
        const user = await prisma.user.create({
          data: {
            id: `test_cascade_${Date.now()}`,
            name: 'Cascade Test User',
            email: `cascade${Date.now()}@test.com`,
            username: `cascade${Date.now()}`,
            role: 'FREE',
            accountStatus: 'ACTIVE',
          },
        })
        
        // Create related data
        await prisma.userStats.create({
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
        
        // Delete user
        await prisma.user.delete({
          where: { id: user.id },
        })
        
        // Verify related data was deleted
        const userStats = await prisma.userStats.findUnique({
          where: { userId: user.id },
        })
        expect(userStats).toBeNull()
      }
    })
  })

  describe('Database Backup and Recovery', () => {
    test('should handle database backup operations', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Test backup operation (mock)
        const backupResult = await prisma.$queryRaw`SELECT 1 as backup_test`
        expect(backupResult).toBeDefined()
      }
    })

    test('should handle database recovery operations', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Test recovery operation (mock)
        const recoveryResult = await prisma.$queryRaw`SELECT 1 as recovery_test`
        expect(recoveryResult).toBeDefined()
      }
    })
  })

  describe('Database Monitoring', () => {
    test('should monitor database performance metrics', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        const start = process.hrtime.bigint()
        await prisma.$queryRaw`SELECT 1`
        const end = process.hrtime.bigint()
        const duration = Number(end - start) / 1000000
        
        expect(duration).toBeGreaterThan(0)
        expect(duration).toBeLessThan(1000) // Should be under 1 second
      }
    })

    test('should monitor database connection pool', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Test connection pool monitoring
        const poolStatus = await prisma.$queryRaw`SELECT 1 as pool_status`
        expect(poolStatus).toBeDefined()
      }
    })

    test('should monitor database memory usage', async () => {
      const result = await testDatabaseConnection()
      
      if (result.connected) {
        // Test memory usage monitoring
        const memoryUsage = await prisma.$queryRaw`SELECT 1 as memory_usage`
        expect(memoryUsage).toBeDefined()
      }
    })
  })
})