// Integration tests for analytics API
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestAdmin, createTestSuperAdmin } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Analytics API Integration Tests', () => {
  let testUser: any
  let testAdmin: any
  let testSuperAdmin: any

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    // Create test users
    testUser = await createTestUser({
      name: 'Test User',
      email: 'test@test.com',
      username: 'testuser',
    })
    
    testAdmin = await createTestAdmin()
    testSuperAdmin = await createTestSuperAdmin()
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('GET /api/analytics/users', () => {
    test('should return user analytics for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/users', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalUsers: 100,
          activeUsers: 75,
          newUsers: 10,
          userGrowth: 15.5,
          userRetention: 85.2,
          userEngagement: 78.3,
          topCountries: [
            { country: 'US', count: 45 },
            { country: 'CA', count: 20 },
            { country: 'UK', count: 15 },
          ],
          userRoles: [
            { role: 'FREE', count: 80 },
            { role: 'PREMIUM', count: 15 },
            { role: 'ADMIN', count: 5 },
          ],
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return user analytics for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/users', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalUsers: 100,
          activeUsers: 75,
          newUsers: 10,
          userGrowth: 15.5,
          userRetention: 85.2,
          userEngagement: 78.3,
          topCountries: [
            { country: 'US', count: 45 },
            { country: 'CA', count: 20 },
            { country: 'UK', count: 15 },
          ],
          userRoles: [
            { role: 'FREE', count: 80 },
            { role: 'PREMIUM', count: 15 },
            { role: 'ADMIN', count: 5 },
          ],
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/users', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should handle date range filter', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/users?startDate=2024-01-01&endDate=2024-01-31', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const startDate = url.searchParams.get('startDate')
        const endDate = url.searchParams.get('endDate')
        
        const analytics = {
          totalUsers: 50,
          activeUsers: 35,
          newUsers: 5,
          userGrowth: 10.0,
          userRetention: 80.0,
          userEngagement: 75.0,
          dateRange: { startDate, endDate },
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/analytics/puzzles', () => {
    test('should return puzzle analytics for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/puzzles', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalPuzzles: 50,
          activePuzzles: 45,
          newPuzzles: 5,
          puzzleCompletions: 1200,
          averageCompletionTime: 450.5,
          averageAccuracy: 85.2,
          topPuzzles: [
            { id: 1, title: 'Easy Puzzle', completions: 100 },
            { id: 2, title: 'Medium Puzzle', completions: 80 },
            { id: 3, title: 'Hard Puzzle', completions: 60 },
          ],
          difficultyBreakdown: [
            { difficulty: 'easy', count: 20, completions: 800 },
            { difficulty: 'medium', count: 20, completions: 300 },
            { difficulty: 'hard', count: 10, completions: 100 },
          ],
          tierBreakdown: [
            { tier: 'free', count: 30, completions: 900 },
            { tier: 'premium', count: 20, completions: 300 },
          ],
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return puzzle analytics for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/puzzles', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalPuzzles: 50,
          activePuzzles: 45,
          newPuzzles: 5,
          puzzleCompletions: 1200,
          averageCompletionTime: 450.5,
          averageAccuracy: 85.2,
          topPuzzles: [
            { id: 1, title: 'Easy Puzzle', completions: 100 },
            { id: 2, title: 'Medium Puzzle', completions: 80 },
            { id: 3, title: 'Hard Puzzle', completions: 60 },
          ],
          difficultyBreakdown: [
            { difficulty: 'easy', count: 20, completions: 800 },
            { difficulty: 'medium', count: 20, completions: 300 },
            { difficulty: 'hard', count: 10, completions: 100 },
          ],
          tierBreakdown: [
            { tier: 'free', count: 30, completions: 900 },
            { tier: 'premium', count: 20, completions: 300 },
          ],
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/puzzles', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should handle category filter', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/puzzles?category=test', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const category = url.searchParams.get('category')
        
        const analytics = {
          totalPuzzles: 10,
          activePuzzles: 9,
          newPuzzles: 1,
          puzzleCompletions: 200,
          averageCompletionTime: 400.0,
          averageAccuracy: 90.0,
          category,
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/analytics/revenue', () => {
    test('should return revenue analytics for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/revenue', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalRevenue: 50000,
          monthlyRevenue: 5000,
          revenueGrowth: 25.5,
          subscriptionRevenue: 40000,
          oneTimeRevenue: 10000,
          averageRevenuePerUser: 500,
          revenueByPlan: [
            { plan: 'PREMIUM', revenue: 35000, subscribers: 70 },
            { plan: 'ADMIN', revenue: 5000, subscribers: 5 },
          ],
          revenueByMonth: [
            { month: '2024-01', revenue: 4500 },
            { month: '2024-02', revenue: 5000 },
            { month: '2024-03', revenue: 5500 },
          ],
          churnRate: 5.2,
          lifetimeValue: 1200,
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from admin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/revenue', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/revenue', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should handle date range filter', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/revenue?startDate=2024-01-01&endDate=2024-01-31', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const startDate = url.searchParams.get('startDate')
        const endDate = url.searchParams.get('endDate')
        
        const analytics = {
          totalRevenue: 5000,
          monthlyRevenue: 5000,
          revenueGrowth: 10.0,
          subscriptionRevenue: 4000,
          oneTimeRevenue: 1000,
          averageRevenuePerUser: 500,
          dateRange: { startDate, endDate },
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/analytics/system', () => {
    test('should return system analytics for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/system', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          systemHealth: 'healthy',
          uptime: 99.9,
          responseTime: 150,
          errorRate: 0.1,
          activeConnections: 100,
          memoryUsage: 75.5,
          cpuUsage: 45.2,
          diskUsage: 60.0,
          databaseConnections: 25,
          cacheHitRate: 85.0,
          apiCalls: 10000,
          errors: [
            { type: 'Database', count: 5, lastOccurred: '2024-01-15T10:30:00Z' },
            { type: 'API', count: 2, lastOccurred: '2024-01-15T11:00:00Z' },
          ],
          performance: {
            averageResponseTime: 150,
            p95ResponseTime: 300,
            p99ResponseTime: 500,
            throughput: 1000,
          },
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from admin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/system', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/system', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/analytics/multiplayer', () => {
    test('should return multiplayer analytics for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/multiplayer', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalRooms: 25,
          activeRooms: 15,
          completedRooms: 10,
          totalParticipants: 100,
          averageRoomSize: 4.0,
          averageSessionDuration: 1800, // 30 minutes
          roomTypes: [
            { type: 'public', count: 20, participants: 80 },
            { type: 'private', count: 5, participants: 20 },
          ],
          topPuzzles: [
            { puzzleId: 1, title: 'Easy Puzzle', roomCount: 10 },
            { puzzleId: 2, title: 'Medium Puzzle', roomCount: 8 },
            { puzzleId: 3, title: 'Hard Puzzle', roomCount: 7 },
          ],
          completionRates: {
            easy: 95.0,
            medium: 80.0,
            hard: 60.0,
          },
          userEngagement: {
            averageSessionsPerUser: 3.5,
            averageTimePerSession: 1800,
            returnRate: 75.0,
          },
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return multiplayer analytics for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/multiplayer', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const analytics = {
          totalRooms: 25,
          activeRooms: 15,
          completedRooms: 10,
          totalParticipants: 100,
          averageRoomSize: 4.0,
          averageSessionDuration: 1800,
          roomTypes: [
            { type: 'public', count: 20, participants: 80 },
            { type: 'private', count: 5, participants: 20 },
          ],
          topPuzzles: [
            { puzzleId: 1, title: 'Easy Puzzle', roomCount: 10 },
            { puzzleId: 2, title: 'Medium Puzzle', roomCount: 8 },
            { puzzleId: 3, title: 'Hard Puzzle', roomCount: 7 },
          ],
          completionRates: {
            easy: 95.0,
            medium: 80.0,
            hard: 60.0,
          },
          userEngagement: {
            averageSessionsPerUser: 3.5,
            averageTimePerSession: 1800,
            returnRate: 75.0,
          },
        }
        
        return NextResponse.json(analytics)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/multiplayer', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })

  describe('GET /api/analytics/dashboard', () => {
    test('should return dashboard data for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/dashboard', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const dashboard = {
          overview: {
            totalUsers: 100,
            activeUsers: 75,
            totalPuzzles: 50,
            activeRooms: 15,
          },
          recentActivity: [
            { type: 'user_signup', message: 'New user registered', timestamp: '2024-01-15T10:00:00Z' },
            { type: 'puzzle_completion', message: 'Puzzle completed', timestamp: '2024-01-15T09:30:00Z' },
            { type: 'room_created', message: 'New room created', timestamp: '2024-01-15T09:00:00Z' },
          ],
          charts: {
            userGrowth: [
              { date: '2024-01-01', count: 90 },
              { date: '2024-01-02', count: 95 },
              { date: '2024-01-03', count: 100 },
            ],
            puzzleCompletions: [
              { date: '2024-01-01', count: 50 },
              { date: '2024-01-02', count: 60 },
              { date: '2024-01-03', count: 70 },
            ],
          },
        }
        
        return NextResponse.json(dashboard)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return dashboard data for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/dashboard', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const dashboard = {
          overview: {
            totalUsers: 100,
            activeUsers: 75,
            totalPuzzles: 50,
            activeRooms: 15,
            totalRevenue: 50000,
            systemHealth: 'healthy',
          },
          recentActivity: [
            { type: 'user_signup', message: 'New user registered', timestamp: '2024-01-15T10:00:00Z' },
            { type: 'puzzle_completion', message: 'Puzzle completed', timestamp: '2024-01-15T09:30:00Z' },
            { type: 'room_created', message: 'New room created', timestamp: '2024-01-15T09:00:00Z' },
            { type: 'payment', message: 'Payment received', timestamp: '2024-01-15T08:30:00Z' },
          ],
          charts: {
            userGrowth: [
              { date: '2024-01-01', count: 90 },
              { date: '2024-01-02', count: 95 },
              { date: '2024-01-03', count: 100 },
            ],
            puzzleCompletions: [
              { date: '2024-01-01', count: 50 },
              { date: '2024-01-02', count: 60 },
              { date: '2024-01-03', count: 70 },
            ],
            revenue: [
              { date: '2024-01-01', amount: 1000 },
              { date: '2024-01-02', amount: 1200 },
              { date: '2024-01-03', amount: 1500 },
            ],
          },
        }
        
        return NextResponse.json(dashboard)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/analytics/dashboard', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })
})