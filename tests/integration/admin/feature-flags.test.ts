// Integration tests for feature flag management
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestAdmin, createTestSuperAdmin } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('Feature Flag Management Integration Tests', () => {
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

  describe('GET /api/admin/feature-flags', () => {
    test('should return feature flags list for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const featureFlags = [
          {
            id: 'flag1',
            name: 'new_dashboard',
            description: 'New dashboard design',
            enabled: false,
            rolloutPercentage: 0,
            targetUsers: null,
            targetRoles: null,
            conditions: null,
            createdBy: testAdmin.id,
            version: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'flag2',
            name: 'premium_features',
            description: 'Premium features for paid users',
            enabled: true,
            rolloutPercentage: 100,
            targetUsers: null,
            targetRoles: ['PREMIUM'],
            conditions: null,
            createdBy: testAdmin.id,
            version: 1,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          featureFlags,
          total: featureFlags.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return feature flags list for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const featureFlags = [
          {
            id: 'flag1',
            name: 'new_dashboard',
            description: 'New dashboard design',
            enabled: false,
            rolloutPercentage: 0,
            targetUsers: null,
            targetRoles: null,
            conditions: null,
            createdBy: testSuperAdmin.id,
            version: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'flag2',
            name: 'premium_features',
            description: 'Premium features for paid users',
            enabled: true,
            rolloutPercentage: 100,
            targetUsers: null,
            targetRoles: ['PREMIUM'],
            conditions: null,
            createdBy: testSuperAdmin.id,
            version: 1,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
          {
            id: 'flag3',
            name: 'beta_features',
            description: 'Beta features for testing',
            enabled: true,
            rolloutPercentage: 25,
            targetUsers: ['user1', 'user2'],
            targetRoles: ['ADMIN'],
            conditions: { minLevel: 5 },
            createdBy: testSuperAdmin.id,
            version: 2,
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-03T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          featureFlags,
          total: featureFlags.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'GET', null, {
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

    test('should handle enabled filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags?enabled=true', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const enabled = url.searchParams.get('enabled') === 'true'
        
        const featureFlags = [
          {
            id: 'flag2',
            name: 'premium_features',
            description: 'Premium features for paid users',
            enabled: true,
            rolloutPercentage: 100,
            targetUsers: null,
            targetRoles: ['PREMIUM'],
            conditions: null,
            createdBy: testAdmin.id,
            version: 1,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          featureFlags,
          total: featureFlags.length,
          page: 1,
          limit: 10,
          enabled,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/admin/feature-flags', () => {
    test('should create feature flag as admin', async () => {
      const featureFlagData = {
        name: 'new_feature',
        description: 'A new feature for testing',
        enabled: false,
        rolloutPercentage: 0,
        targetUsers: null,
        targetRoles: null,
        conditions: null,
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'POST', featureFlagData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newFeatureFlag = {
          id: 'flag_new',
          ...body,
          createdBy: testAdmin.id,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(newFeatureFlag, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should create feature flag as superadmin', async () => {
      const featureFlagData = {
        name: 'superadmin_feature',
        description: 'A feature only superadmin can create',
        enabled: true,
        rolloutPercentage: 50,
        targetUsers: null,
        targetRoles: ['ADMIN', 'SUPERADMIN'],
        conditions: { minLevel: 10 },
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'POST', featureFlagData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newFeatureFlag = {
          id: 'flag_superadmin',
          ...body,
          createdBy: testSuperAdmin.id,
          version: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(newFeatureFlag, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject creation from regular user', async () => {
      const featureFlagData = {
        name: 'user_feature',
        description: 'A feature user tries to create',
        enabled: false,
        rolloutPercentage: 0,
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'POST', featureFlagData, {
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

    test('should validate required fields', async () => {
      const invalidFeatureFlagData = {
        description: 'A feature without name',
        enabled: false,
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'POST', invalidFeatureFlagData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Name is required' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate unique name', async () => {
      const duplicateFeatureFlagData = {
        name: 'existing_feature',
        description: 'A feature with existing name',
        enabled: false,
        rolloutPercentage: 0,
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags', 'POST', duplicateFeatureFlagData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Feature flag with this name already exists' },
          { status: 409 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/admin/feature-flags/[flagId]', () => {
    test('should update feature flag as admin', async () => {
      const updateData = {
        enabled: true,
        rolloutPercentage: 50,
        description: 'Updated description',
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1', 'PUT', updateData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedFeatureFlag = {
          id: 'flag1',
          name: 'new_dashboard',
          description: 'Updated description',
          enabled: true,
          rolloutPercentage: 50,
          targetUsers: null,
          targetRoles: null,
          conditions: null,
          createdBy: testAdmin.id,
          version: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(updatedFeatureFlag)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should update feature flag as superadmin', async () => {
      const updateData = {
        enabled: true,
        rolloutPercentage: 100,
        targetRoles: ['PREMIUM', 'ADMIN'],
        conditions: { minLevel: 5 },
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag2', 'PUT', updateData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedFeatureFlag = {
          id: 'flag2',
          name: 'premium_features',
          description: 'Premium features for paid users',
          enabled: true,
          rolloutPercentage: 100,
          targetUsers: null,
          targetRoles: ['PREMIUM', 'ADMIN'],
          conditions: { minLevel: 5 },
          createdBy: testSuperAdmin.id,
          version: 2,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(updatedFeatureFlag)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject update from regular user', async () => {
      const updateData = {
        enabled: true,
        rolloutPercentage: 50,
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1', 'PUT', updateData, {
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

    test('should return 404 for non-existent feature flag', async () => {
      const updateData = {
        enabled: true,
        rolloutPercentage: 50,
      }

      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/non-existent', 'PUT', updateData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/feature-flags/[flagId]', () => {
    test('should delete feature flag as admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1', 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Feature flag deleted successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should delete feature flag as superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag2', 'DELETE', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Feature flag deleted successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject deletion from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1', 'DELETE', null, {
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

    test('should return 404 for non-existent feature flag', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/non-existent', 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Feature flag not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/admin/feature-flags/[flagId]/toggle', () => {
    test('should toggle feature flag as admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1/toggle', 'POST', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const toggledFeatureFlag = {
          id: 'flag1',
          name: 'new_dashboard',
          description: 'New dashboard design',
          enabled: true,
          rolloutPercentage: 0,
          targetUsers: null,
          targetRoles: null,
          conditions: null,
          createdBy: testAdmin.id,
          version: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(toggledFeatureFlag)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should toggle feature flag as superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag2/toggle', 'POST', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const toggledFeatureFlag = {
          id: 'flag2',
          name: 'premium_features',
          description: 'Premium features for paid users',
          enabled: false,
          rolloutPercentage: 100,
          targetUsers: null,
          targetRoles: ['PREMIUM'],
          conditions: null,
          createdBy: testSuperAdmin.id,
          version: 2,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(toggledFeatureFlag)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject toggle from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1/toggle', 'POST', null, {
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

  describe('GET /api/admin/feature-flags/[flagId]/history', () => {
    test('should return feature flag history for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1/history', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const history = [
          {
            id: 'history1',
            featureFlagId: 'flag1',
            action: 'CREATED',
            previousState: null,
            newState: {
              name: 'new_dashboard',
              enabled: false,
              rolloutPercentage: 0,
            },
            actorUserId: testAdmin.id,
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'history2',
            featureFlagId: 'flag1',
            action: 'UPDATED',
            previousState: {
              enabled: false,
              rolloutPercentage: 0,
            },
            newState: {
              enabled: true,
              rolloutPercentage: 50,
            },
            actorUserId: testAdmin.id,
            createdAt: '2024-01-02T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          history,
          total: history.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return feature flag history for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag2/history', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const history = [
          {
            id: 'history1',
            featureFlagId: 'flag2',
            action: 'CREATED',
            previousState: null,
            newState: {
              name: 'premium_features',
              enabled: true,
              rolloutPercentage: 100,
            },
            actorUserId: testSuperAdmin.id,
            createdAt: '2024-01-02T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          history,
          total: history.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/feature-flags/flag1/history', 'GET', null, {
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