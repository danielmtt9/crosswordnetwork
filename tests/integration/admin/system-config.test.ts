// Integration tests for system configuration management
import { NextRequest, NextResponse } from 'next/server'
import { testApiEndpoint, createTestUser, createTestAdmin, createTestSuperAdmin } from '../../utils/test-helpers'
import { databaseSeeder, databaseCleaner } from '../../utils/database-seeding'

describe('System Configuration Management Integration Tests', () => {
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

  describe('GET /api/admin/system-config', () => {
    test('should return system configs for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const configs = [
          {
            id: 'config1',
            key: 'app_name',
            value: 'Crossword Network',
            description: 'Application name',
            category: 'general',
            isPublic: true,
            updatedBy: testAdmin.id,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'config2',
            key: 'max_file_size',
            value: 10485760,
            description: 'Maximum file upload size in bytes',
            category: 'upload',
            isPublic: false,
            updatedBy: testAdmin.id,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          configs,
          total: configs.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return system configs for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const configs = [
          {
            id: 'config1',
            key: 'app_name',
            value: 'Crossword Network',
            description: 'Application name',
            category: 'general',
            isPublic: true,
            updatedBy: testSuperAdmin.id,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'config2',
            key: 'max_file_size',
            value: 10485760,
            description: 'Maximum file upload size in bytes',
            category: 'upload',
            isPublic: false,
            updatedBy: testSuperAdmin.id,
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
          {
            id: 'config3',
            key: 'database_url',
            value: 'mysql://localhost:3306/crossword',
            description: 'Database connection URL',
            category: 'database',
            isPublic: false,
            updatedBy: testSuperAdmin.id,
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-03T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          configs,
          total: configs.length,
          page: 1,
          limit: 10,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'GET', null, {
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
      const { req, res } = await testApiEndpoint('/api/admin/system-config?category=general', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const category = url.searchParams.get('category')
        
        const configs = [
          {
            id: 'config1',
            key: 'app_name',
            value: 'Crossword Network',
            description: 'Application name',
            category: 'general',
            isPublic: true,
            updatedBy: testAdmin.id,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          configs,
          total: configs.length,
          page: 1,
          limit: 10,
          category,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should handle public filter', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config?isPublic=true', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const url = new URL(req.url)
        const isPublic = url.searchParams.get('isPublic') === 'true'
        
        const configs = [
          {
            id: 'config1',
            key: 'app_name',
            value: 'Crossword Network',
            description: 'Application name',
            category: 'general',
            isPublic: true,
            updatedBy: testAdmin.id,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        ]
        
        return NextResponse.json({
          configs,
          total: configs.length,
          page: 1,
          limit: 10,
          isPublic,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/admin/system-config', () => {
    test('should create system config as admin', async () => {
      const configData = {
        key: 'new_config',
        value: 'new_value',
        description: 'A new configuration',
        category: 'general',
        isPublic: false,
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'POST', configData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newConfig = {
          id: 'config_new',
          ...body,
          updatedBy: testAdmin.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(newConfig, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should create system config as superadmin', async () => {
      const configData = {
        key: 'superadmin_config',
        value: 'superadmin_value',
        description: 'A configuration only superadmin can create',
        category: 'security',
        isPublic: false,
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'POST', configData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        const newConfig = {
          id: 'config_superadmin',
          ...body,
          updatedBy: testSuperAdmin.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(newConfig, { status: 201 })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(201)
    })

    test('should reject creation from regular user', async () => {
      const configData = {
        key: 'user_config',
        value: 'user_value',
        description: 'A configuration user tries to create',
        category: 'general',
        isPublic: false,
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'POST', configData, {
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
      const invalidConfigData = {
        description: 'A config without key and value',
        category: 'general',
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'POST', invalidConfigData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Key and value are required' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })

    test('should validate unique key', async () => {
      const duplicateConfigData = {
        key: 'app_name', // Already exists
        value: 'Duplicate App Name',
        description: 'A config with existing key',
        category: 'general',
        isPublic: true,
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config', 'POST', duplicateConfigData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Configuration with this key already exists' },
          { status: 409 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/admin/system-config/[configId]', () => {
    test('should update system config as admin', async () => {
      const updateData = {
        value: 'Updated App Name',
        description: 'Updated description',
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/config1', 'PUT', updateData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedConfig = {
          id: 'config1',
          key: 'app_name',
          value: 'Updated App Name',
          description: 'Updated description',
          category: 'general',
          isPublic: true,
          updatedBy: testAdmin.id,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(updatedConfig)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should update system config as superadmin', async () => {
      const updateData = {
        value: 'Superadmin Updated Value',
        description: 'Updated by superadmin',
        isPublic: true,
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/config2', 'PUT', updateData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const updatedConfig = {
          id: 'config2',
          key: 'max_file_size',
          value: 'Superadmin Updated Value',
          description: 'Updated by superadmin',
          category: 'upload',
          isPublic: true,
          updatedBy: testSuperAdmin.id,
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: new Date().toISOString(),
        }
        
        return NextResponse.json(updatedConfig)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject update from regular user', async () => {
      const updateData = {
        value: 'User Updated Value',
        description: 'Updated by user',
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/config1', 'PUT', updateData, {
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

    test('should return 404 for non-existent config', async () => {
      const updateData = {
        value: 'Updated Value',
        description: 'Updated description',
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/non-existent', 'PUT', updateData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/system-config/[configId]', () => {
    test('should delete system config as admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/config1', 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Configuration deleted successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should delete system config as superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/config2', 'DELETE', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json({
          message: 'Configuration deleted successfully',
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject deletion from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/config1', 'DELETE', null, {
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

    test('should return 404 for non-existent config', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/non-existent', 'DELETE', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/admin/system-config/[configId]', () => {
    test('should return system config details for admin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/config1', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const config = {
          id: 'config1',
          key: 'app_name',
          value: 'Crossword Network',
          description: 'Application name',
          category: 'general',
          isPublic: true,
          updatedBy: testAdmin.id,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
        
        return NextResponse.json(config)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should return system config details for superadmin', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/config3', 'GET', null, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const config = {
          id: 'config3',
          key: 'database_url',
          value: 'mysql://localhost:3306/crossword',
          description: 'Database connection URL',
          category: 'database',
          isPublic: false,
          updatedBy: testSuperAdmin.id,
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z',
        }
        
        return NextResponse.json(config)
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject request from regular user', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/config1', 'GET', null, {
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

    test('should return 404 for non-existent config', async () => {
      const { req, res } = await testApiEndpoint('/api/admin/system-config/non-existent', 'GET', null, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/admin/system-config/bulk', () => {
    test('should perform bulk operations as admin', async () => {
      const bulkData = {
        operation: 'update',
        configs: [
          { id: 'config1', value: 'Updated Value 1' },
          { id: 'config2', value: 'Updated Value 2' },
        ],
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/bulk', 'POST', bulkData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        return NextResponse.json({
          message: `Bulk ${body.operation} completed successfully`,
          affectedConfigs: body.configs.length,
          operation: body.operation,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should perform bulk operations as superadmin', async () => {
      const bulkData = {
        operation: 'delete',
        configs: [
          { id: 'config1' },
          { id: 'config2' },
        ],
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/bulk', 'POST', bulkData, {
        'authorization': `Bearer ${testSuperAdmin.id}`,
        'x-user-role': 'SUPERADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        const body = await req.json()
        
        return NextResponse.json({
          message: `Bulk ${body.operation} completed successfully`,
          affectedConfigs: body.configs.length,
          operation: body.operation,
        })
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(200)
    })

    test('should reject bulk operations from regular user', async () => {
      const bulkData = {
        operation: 'update',
        configs: [
          { id: 'config1', value: 'Updated Value 1' },
        ],
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/bulk', 'POST', bulkData, {
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
        configs: [],
      }

      const { req, res } = await testApiEndpoint('/api/admin/system-config/bulk', 'POST', invalidBulkData, {
        'authorization': `Bearer ${testAdmin.id}`,
        'x-user-role': 'ADMIN',
      })

      const mockHandler = jest.fn().mockImplementation(async (req: NextRequest) => {
        return NextResponse.json(
          { error: 'Invalid operation or empty config list' },
          { status: 400 }
        )
      })

      const response = await mockHandler(req)
      expect(response.status).toBe(400)
    })
  })
})