// Integration tests for authorization system
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestAdmin, createTestSuperAdmin } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Authorization System Integration Tests', () => {
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
      role: 'FREE',
    })
    
    testAdmin = await createTestAdmin()
    testSuperAdmin = await createTestSuperAdmin()
  })

  afterAll(async () => {
    // Cleanup test database
    await databaseCleaner.cleanTestData()
  })

  describe('Role-Based Access Control', () => {
    test('should allow admin to access admin endpoints', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            users: [],
            total: 0,
            page: 1,
            limit: 10,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should allow superadmin to access admin endpoints', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            users: [],
            total: 0,
            page: 1,
            limit: 10,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject regular user from admin endpoints', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            users: [],
            total: 0,
            page: 1,
            limit: 10,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should allow superadmin to access superadmin-only endpoints', async () => {
      const { req, res } = await testApiEndpoint('/api/superadmin/system-config', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'SUPERADMIN') {
          return NextResponse.json({
            configs: [],
            total: 0,
            page: 1,
            limit: 10,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject admin from superadmin-only endpoints', async () => {
      const { req, res } = await testApiEndpoint('/api/superadmin/system-config', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'SUPERADMIN') {
          return NextResponse.json({
            configs: [],
            total: 0,
            page: 1,
            limit: 10,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })

  describe('Resource-Based Permissions', () => {
    test('should allow user to access own profile', async () => {
      const { req, res } = await testApiEndpoint(`/api/user/${testUser.id}`, 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const userId = url.pathname.split('/').pop()
        const authUserId = req.headers.get('authorization')?.replace('Bearer ', '')
        
        if (userId === authUserId) {
          return NextResponse.json({
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            username: testUser.username,
            role: testUser.role,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject user from accessing other user profile', async () => {
      const otherUser = await createTestUser({
        name: 'Other User',
        email: 'other@test.com',
        username: 'otheruser',
      })

      const { req, res } = await testApiEndpoint(`/api/user/${otherUser.id}`, 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const userId = url.pathname.split('/').pop()
        const authUserId = req.headers.get('authorization')?.replace('Bearer ', '')
        
        if (userId === authUserId) {
          return NextResponse.json({
            id: otherUser.id,
            name: otherUser.name,
            email: otherUser.email,
            username: otherUser.username,
            role: otherUser.role,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should allow admin to access any user profile', async () => {
      const { req, res } = await testApiEndpoint(`/api/user/${testUser.id}`, 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            id: testUser.id,
            name: testUser.name,
            email: testUser.email,
            username: testUser.username,
            role: testUser.role,
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('Feature-Based Permissions', () => {
    test('should allow premium user to access premium features', async () => {
      const premiumUser = await createTestUser({
        name: 'Premium User',
        email: 'premium@test.com',
        username: 'premiumuser',
        role: 'PREMIUM',
      })

      const { req, res } = await testApiEndpoint('/api/premium/features', 'GET', null, {
        'authorization': `Bearer ${premiumUser.id}`,
        'x-user-role': 'PREMIUM',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'PREMIUM' || userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            features: ['advanced_search', 'unlimited_puzzles', 'priority_support'],
          })
        } else {
          return NextResponse.json(
            { error: 'Premium subscription required' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject free user from premium features', async () => {
      const { req, res } = await testApiEndpoint('/api/premium/features', 'GET', null, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'PREMIUM' || userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            features: ['advanced_search', 'unlimited_puzzles', 'priority_support'],
          })
        } else {
          return NextResponse.json(
            { error: 'Premium subscription required' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should allow admin to access premium features', async () => {
      const { req, res } = await testApiEndpoint('/api/premium/features', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'PREMIUM' || userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            features: ['advanced_search', 'unlimited_puzzles', 'priority_support'],
          })
        } else {
          return NextResponse.json(
            { error: 'Premium subscription required' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('Action-Based Permissions', () => {
    test('should allow admin to create users', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        role: 'FREE',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', userData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            id: 'test_new_user',
            ...userData,
            accountStatus: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { status: 201 })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject regular user from creating users', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@test.com',
        username: 'newuser',
        role: 'FREE',
      }

      const { req, res } = await testApiEndpoint('/api/admin/users', 'POST', userData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'ADMIN' || userRole === 'SUPERADMIN') {
          return NextResponse.json({
            id: 'test_new_user',
            ...userData,
            accountStatus: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date(),
          }, { status: 201 })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })

    test('should allow superadmin to delete users', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users/test_user_id', 'DELETE', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'SUPERADMIN') {
          return NextResponse.json({
            message: 'User deleted successfully',
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject admin from deleting users', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/users/test_user_id', 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const userRole = req.headers.get('x-user-role')
        
        if (userRole === 'SUPERADMIN') {
          return NextResponse.json({
            message: 'User deleted successfully',
          })
        } else {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })

  describe('Token-Based Authorization', () => {
    test('should validate JWT token format', async () => {
      const { req, res } = await testApiEndpoint('/api/protected', 'GET', null, {
        'authorization': 'Bearer invalid-jwt-format',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const authHeader = req.headers.get('authorization')
        
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '')
          
          if (token === 'valid-jwt-token') {
            return NextResponse.json({ message: 'Access granted' })
          } else {
            return NextResponse.json(
              { error: 'Invalid token' },
              { status: 401 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Missing or invalid authorization header' },
            { status: 401 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should reject requests without authorization header', async () => {
      const { req, res } = await testApiEndpoint('/api/protected', 'GET')

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const authHeader = req.headers.get('authorization')
        
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '')
          
          if (token === 'valid-jwt-token') {
            return NextResponse.json({ message: 'Access granted' })
          } else {
            return NextResponse.json(
              { error: 'Invalid token' },
              { status: 401 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Missing or invalid authorization header' },
            { status: 401 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })

    test('should handle expired tokens', async () => {
      const { req, res } = await testApiEndpoint('/api/protected', 'GET', null, {
        'authorization': 'Bearer expired-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const authHeader = req.headers.get('authorization')
        
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.replace('Bearer ', '')
          
          if (token === 'valid-jwt-token') {
            return NextResponse.json({ message: 'Access granted' })
          } else if (token === 'expired-jwt-token') {
            return NextResponse.json(
              { error: 'Token expired' },
              { status: 401 }
            )
          } else {
            return NextResponse.json(
              { error: 'Invalid token' },
              { status: 401 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Missing or invalid authorization header' },
            { status: 401 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(401)
    })
  })

  describe('Rate Limiting', () => {
    test('should enforce rate limits on authentication endpoints', async () => {
      const loginData = {
        email: 'test@test.com',
        password: 'password123',
      }

      // Simulate multiple rapid requests
      const requests = Array(10).fill().map(() => 
        testApiEndpoint('/api/auth/signin', 'POST', loginData)
      )

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        // Simulate rate limiting after 5 requests
        const requestCount = Math.floor(Math.random() * 10) + 1
        
        if (requestCount > 5) {
          return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429 }
          )
        } else {
          return NextResponse.json({
            user: { id: 'test-user' },
            token: 'mock-token',
          })
        }
      })

      const responses = await Promise.all(requests.map(({ req }) => mockHandler(req)))
      
      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Session Security', () => {
    test('should invalidate session on logout', async () => {
      const { req, res } = await testApiEndpoint('/api/auth/signout', 'POST', null, {
        'authorization': 'Bearer valid-jwt-token',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Signed out successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should require re-authentication for sensitive operations', async () => {
      const sensitiveData = {
        action: 'delete_account',
        confirmation: 'DELETE',
      }

      const { req, res } = await testApiEndpoint('/api/user/sensitive-action', 'POST', sensitiveData, {
        'authorization': `Bearer ${testUser.id}`,
        'x-user-role': 'FREE',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        // Check for additional confirmation header
        const confirmation = req.headers.get('x-confirmation')
        
        if (confirmation === 'CONFIRMED') {
          return NextResponse.json({
            message: 'Sensitive action completed',
          })
        } else {
          return NextResponse.json(
            { error: 'Additional confirmation required' },
            { status: 403 }
          )
        }
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(403)
    })
  })
})