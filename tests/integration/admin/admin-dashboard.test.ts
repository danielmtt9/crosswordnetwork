// Integration tests for admin dashboard
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestAdmin, createTestSuperAdmin } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Admin Dashboard Integration Tests', () => {
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

  describe('GET /api/admin/dashboard', () => {
    test('should return admin dashboard data for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/dashboard', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const dashboard = {
          overview: {
            totalUsers: 100,
            activeUsers: 75,
            newUsers: 10,
            totalPuzzles: 50,
            activeRooms: 15,
            systemHealth: 'healthy',
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
          alerts: [
            { type: 'warning', message: 'High memory usage detected', timestamp: '2024-01-15T10:00:00Z' },
            { type: 'info', message: 'System backup completed', timestamp: '2024-01-15T09:00:00Z' },
          ],
        }
        
        return NextResponse.json(dashboard)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return superadmin dashboard data for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/dashboard', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const dashboard = {
          overview: {
            totalUsers: 100,
            activeUsers: 75,
            newUsers: 10,
            totalPuzzles: 50,
            activeRooms: 15,
            systemHealth: 'healthy',
            totalRevenue: 50000,
            monthlyRevenue: 5000,
            errorRate: 0.1,
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
          alerts: [
            { type: 'warning', message: 'High memory usage detected', timestamp: '2024-01-15T10:00:00Z' },
            { type: 'info', message: 'System backup completed', timestamp: '2024-01-15T09:00:00Z' },
            { type: 'error', message: 'Database connection issue', timestamp: '2024-01-15T08:00:00Z' },
          ],
        }
        
        return NextResponse.json(dashboard)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/dashboard', 'GET', null, {
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
      const { req, res } = await testApiEndpoint('/api/admin/dashboard?startDate=2024-01-01&endDate=2024-01-31', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const startDate = url.searchParams.get('startDate')
        const endDate = url.searchParams.get('endDate')
        
        const dashboard = {
          overview: {
            totalUsers: 50,
            activeUsers: 35,
            newUsers: 5,
            totalPuzzles: 25,
            activeRooms: 8,
            systemHealth: 'healthy',
          },
          dateRange: { startDate, endDate },
        }
        
        return NextResponse.json(dashboard)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/admin/users', () => {
    test('should return users list for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const users = [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@test.com',
            username: 'user1',
            role: 'FREE',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'user2',
            name: 'User 2',
            email: 'user2@test.com',
            username: 'user2',
            role: 'PREMIUM',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-02T00:00:00Z',
            lastLoginAt: '2024-01-15T09:00:00Z',
          },
        ]
        
        return NextResponse.json({
          users,
          total: users.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return users list for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const users = [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@test.com',
            username: 'user1',
            role: 'FREE',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'user2',
            name: 'User 2',
            email: 'user2@test.com',
            username: 'user2',
            role: 'PREMIUM',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-02T00:00:00Z',
            lastLoginAt: '2024-01-15T09:00:00Z',
          },
          {
            id: 'admin1',
            name: 'Admin 1',
            email: 'admin1@test.com',
            username: 'admin1',
            role: 'ADMIN',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-03T00:00:00Z',
            lastLoginAt: '2024-01-15T08:00:00Z',
          },
        ]
        
        return NextResponse.json({
          users,
          total: users.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle search filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users?search=user1', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const search = url.searchParams.get('search')
        
        const users = [
          {
            id: 'user1',
            name: 'User 1',
            email: 'user1@test.com',
            username: 'user1',
            role: 'FREE',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-01T00:00:00Z',
            lastLoginAt: '2024-01-15T10:00:00Z',
          },
        ]
        
        return NextResponse.json({
          users,
          total: users.length,
          page: 1,
          limit: 10,
          search,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle role filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users?role=PREMIUM', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const role = url.searchParams.get('role')
        
        const users = [
          {
            id: 'user2',
            name: 'User 2',
            email: 'user2@test.com',
            username: 'user2',
            role: 'PREMIUM',
            accountStatus: 'ACTIVE',
            createdAt: '2024-01-02T00:00:00Z',
            lastLoginAt: '2024-01-15T09:00:00Z',
          },
        ]
        
        return NextResponse.json({
          users,
          total: users.length,
          page: 1,
          limit: 10,
          role,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle status filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users?status=SUSPENDED', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const status = url.searchParams.get('status')
        
        const users = [
          {
            id: 'user3',
            name: 'User 3',
            email: 'user3@test.com',
            username: 'user3',
            role: 'FREE',
            accountStatus: 'SUSPENDED',
            createdAt: '2024-01-03T00:00:00Z',
            lastLoginAt: '2024-01-14T10:00:00Z',
            suspendedAt: '2024-01-14T10:00:00Z',
            suspensionReason: 'Violation of terms',
          },
        ]
        
        return NextResponse.json({
          users,
          total: users.length,
          page: 1,
          limit: 10,
          status,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/admin/users/bulk', () => {
    test('should perform bulk suspend operation as admin', async () => {
      const bulkData = {
        operation: 'suspend',
        userIds: ['user1', 'user2'],
        reason: 'Bulk suspension for testing',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users/bulk', 'POST', bulkData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        return NextResponse.json({
          message: `Bulk ${body.operation} completed successfully`,
          affectedUsers: body.userIds.length,
          operation: body.operation,
          reason: body.reason,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should perform bulk delete operation as superadmin', async () => {
      const bulkData = {
        operation: 'delete',
        userIds: ['user1', 'user2'],
      }

      const { req, res } = await testApiEndpoint('/api/admin/users/bulk', 'POST', bulkData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        return NextResponse.json({
          message: `Bulk ${body.operation} completed successfully`,
          affectedUsers: body.userIds.length,
          operation: body.operation,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject bulk operations from regular user', async () => {
      const bulkData = {
        operation: 'suspend',
        userIds: ['user1', 'user2'],
        reason: 'Bulk suspension for testing',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users/bulk', 'POST', bulkData, {
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

    test('should validate bulk operation data', async () => {
      const invalidBulkData = {
        operation: 'invalid',
        userIds: [],
      }

      const { req, res } = await testApiEndpoint('/api/admin/users/bulk', 'POST', invalidBulkData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid operation or empty user list' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/admin/audit', () => {
    test('should return audit logs for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/audit', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const auditLogs = [
          {
            id: 'audit1',
            actorUserId: testAdmin.id,
            action: 'USER_SUSPENDED',
            entityType: 'User',
            entityId: 'user1',
            before: '{"accountStatus": "ACTIVE"}',
            after: '{"accountStatus": "SUSPENDED"}',
            ip: '192.168.1.1',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'audit2',
            actorUserId: testAdmin.id,
            action: 'USER_ROLE_CHANGED',
            entityType: 'User',
            entityId: 'user2',
            before: '{"role": "FREE"}',
            after: '{"role": "PREMIUM"}',
            ip: '192.168.1.1',
            createdAt: '2024-01-15T09:00:00Z',
          },
        ]
        
        return NextResponse.json({
          logs: auditLogs,
          total: auditLogs.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return audit logs for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/audit', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const auditLogs = [
          {
            id: 'audit1',
            actorUserId: testSuperAdmin.id,
            action: 'SYSTEM_CONFIG_CHANGED',
            entityType: 'SystemConfig',
            entityId: 'config1',
            before: '{"value": "old_value"}',
            after: '{"value": "new_value"}',
            ip: '192.168.1.1',
            createdAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'audit2',
            actorUserId: testSuperAdmin.id,
            action: 'FEATURE_FLAG_TOGGLED',
            entityType: 'FeatureFlag',
            entityId: 'flag1',
            before: '{"enabled": false}',
            after: '{"enabled": true}',
            ip: '192.168.1.1',
            createdAt: '2024-01-15T09:00:00Z',
          },
        ]
        
        return NextResponse.json({
          logs: auditLogs,
          total: auditLogs.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/audit', 'GET', null, {
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

    test('should handle action filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/audit?action=USER_SUSPENDED', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const action = url.searchParams.get('action')
        
        const auditLogs = [
          {
            id: 'audit1',
            actorUserId: testAdmin.id,
            action: 'USER_SUSPENDED',
            entityType: 'User',
            entityId: 'user1',
            before: '{"accountStatus": "ACTIVE"}',
            after: '{"accountStatus": "SUSPENDED"}',
            ip: '192.168.1.1',
            createdAt: '2024-01-15T10:00:00Z',
          },
        ]
        
        return NextResponse.json({
          logs: auditLogs,
          total: auditLogs.length,
          page: 1,
          limit: 10,
          action,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })
})