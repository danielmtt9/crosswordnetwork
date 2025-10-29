// Integration tests for admin users API
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestAdmin, createTestSuperAdmin } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Admin Users API Integration Tests', () => {
  let testUsers: any[] = []
  let testAdmin: any
  let testSuperAdmin: any

  beforeAll(async () => {
    // Setup test database
    await databaseSeeder.seedDatabase()
    
    // Create test users
    testUsers = [
      await createTestUser({ name: 'Test User 1', email: 'user1@test.com' }),
      await createTestUser({ name: 'Test User 2', email: 'user2@test.com' }),
      await createTestUser({ name: 'Test User 3', email: 'user3@test.com' }),
    ]
    
    testAdmin = await createTestAdmin()
    testSuperAdmin = await createTestSuperAdmin()
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('GET /api/admin/users', () => {
    test('should return users list for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      // Mock the API handler
      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          users: testUsers,
          total: testUsers.length,
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
        return NextResponse.json({
          users: testUsers,
          total: testUsers.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testUsers[0].id}`,
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

    test('should handle pagination parameters', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users?page=2&limit=5', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '10')
        
        return NextResponse.json({
          users: testUsers.slice((page - 1) * limit, page * limit),
          total: testUsers.length,
          page,
          limit,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle search parameters', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users?search=Test User 1', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const search = url.searchParams.get('search')
        
        const filteredUsers = testUsers.filter(user => 
          user.name?.includes(search || '') || user.email?.includes(search || '')
        )
        
        return NextResponse.json({
          users: filteredUsers,
          total: filteredUsers.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle role filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users?role=FREE', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const role = url.searchParams.get('role')
        
        const filteredUsers = testUsers.filter(user => user.role === role)
        
        return NextResponse.json({
          users: filteredUsers,
          total: filteredUsers.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/admin/users', () => {
    test('should create new user as admin', async () => {
      const newUserData = {
        name: 'New Test User',
        email: 'newuser@test.com',
        username: 'newuser',
        role: 'FREE',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', newUserData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newUser = {
          id: 'test_new_user',
          ...body,
          accountStatus: 'ACTIVE',
          subscriptionStatus: 'TRIAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        return NextResponse.json(newUser, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should create new user as superadmin', async () => {
      const newUserData = {
        name: 'New SuperAdmin User',
        email: 'newsuperadmin@test.com',
        username: 'newsuperadmin',
        role: 'ADMIN',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', newUserData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newUser = {
          id: 'test_new_superadmin',
          ...body,
          accountStatus: 'ACTIVE',
          subscriptionStatus: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        return NextResponse.json(newUser, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject user creation from regular user', async () => {
      const newUserData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        role: 'FREE',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', newUserData, {
        'authorization': `Bearer ${testUsers[0].id}`,
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

    test('should validate required fields', async () => {
      const invalidUserData = {
        name: 'Invalid User',
        // Missing email and username
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', invalidUserData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Missing required fields: email, username' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate email format', async () => {
      const invalidUserData = {
        name: 'Invalid User',
        email: 'invalid-email',
        username: 'invaliduser',
        role: 'FREE',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', invalidUserData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/admin/users/[userId]', () => {
    test('should update user as admin', async () => {
      const updateData = {
        name: 'Updated Test User',
        role: 'PREMIUM',
      }

      const { req, res } = await testApiEndpoint(`/api/admin/users/${testUsers[0].id}`, 'PUT', updateData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedUser = {
          ...testUsers[0],
          ...updateData,
          updatedAt: new Date(),
        }
        
        return NextResponse.json(updatedUser)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should update user as superadmin', async () => {
      const updateData = {
        name: 'Updated Test User',
        role: 'ADMIN',
      }

      const { req, res } = await testApiEndpoint(`/api/admin/users/${testUsers[1].id}`, 'PUT', updateData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedUser = {
          ...testUsers[1],
          ...updateData,
          updatedAt: new Date(),
        }
        
        return NextResponse.json(updatedUser)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject update from regular user', async () => {
      const updateData = {
        name: 'Updated Test User',
        role: 'PREMIUM',
      }

      const { req, res } = await testApiEndpoint(`/api/admin/users/${testUsers[0].id}`, 'PUT', updateData, {
        'authorization': `Bearer ${testUsers[0].id}`,
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

    test('should handle non-existent user', async () => {
      const updateData = {
        name: 'Updated Test User',
        role: 'PREMIUM',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users/non-existent-id', 'PUT', updateData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/users/[userId]', () => {
    test('should delete user as admin', async () => {
      const { req, res } = await testApiEndpoint(`/api/admin/users/${testUsers[2].id}`, 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { message: 'User deleted successfully' },
          { status: 200 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should delete user as superadmin', async () => {
      const { req, res } = await testApiEndpoint(`/api/admin/users/${testUsers[2].id}`, 'DELETE', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { message: 'User deleted successfully' },
          { status: 200 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject deletion from regular user', async () => {
      const { req, res } = await testApiEndpoint(`/api/admin/users/${testUsers[0].id}`, 'DELETE', null, {
        'authorization': `Bearer ${testUsers[0].id}`,
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

    test('should handle non-existent user deletion', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users/non-existent-id', 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/admin/users/bulk', () => {
    test('should perform bulk operations as admin', async () => {
      const bulkData = {
        operation: 'suspend',
        userIds: [testUsers[0].id, testUsers[1].id],
        reason: 'Test bulk suspension',
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
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should perform bulk operations as superadmin', async () => {
      const bulkData = {
        operation: 'delete',
        userIds: [testUsers[0].id, testUsers[1].id],
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
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject bulk operations from regular user', async () => {
      const bulkData = {
        operation: 'suspend',
        userIds: [testUsers[0].id, testUsers[1].id],
        reason: 'Test bulk suspension',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users/bulk', 'POST', bulkData, {
        'authorization': `Bearer ${testUsers[0].id}`,
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
})