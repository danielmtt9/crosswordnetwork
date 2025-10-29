// MCP (Model Context Protocol) test setup
const { PrismaClient } = require('@prisma/client')

// Global test database client for MCP tests
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

// MCP test setup and teardown
beforeAll(async () => {
  // Connect to test database
  await global.prisma.$connect()
  
  // Set up MCP test environment
  process.env.NODE_ENV = 'test'
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  process.env.NEXTAUTH_SECRET = 'test-secret-key'
  
  // Clean up any existing test data
  await cleanupTestData()
})

afterAll(async () => {
  // Clean up test data
  await cleanupTestData()
  
  // Disconnect from database
  await global.prisma.$disconnect()
})

afterEach(async () => {
  // Clean up after each test
  await cleanupTestData()
})

async function cleanupTestData() {
  // Clean up test data in reverse order of dependencies
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
      await global.prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'mcp_%' OR email LIKE '%@mcp.com'`)
    } catch (error) {
      // Ignore errors for tables that don't exist or have foreign key constraints
      console.warn(`Could not clean up table ${table}:`, error.message)
    }
  }
}

// Mock external services for MCP tests
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  getSession: jest.fn(),
}))

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}))

// Mock Resend for email testing
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' }),
    },
  })),
}))

// Mock Socket.IO for real-time testing
jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  })),
}))

// MCP testing utilities
global.createMCPTestUser = async (overrides = {}) => {
  return await global.prisma.user.create({
    data: {
      id: `mcp_user_${Date.now()}`,
      name: 'MCP Test User',
      email: `mcp${Date.now()}@mcp.com`,
      username: `mcpuser${Date.now()}`,
      role: 'FREE',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

global.createMCPTestAdmin = async (overrides = {}) => {
  return await global.prisma.user.create({
    data: {
      id: `mcp_admin_${Date.now()}`,
      name: 'MCP Test Admin',
      email: `mcpadmin${Date.now()}@mcp.com`,
      username: `mcpadmin${Date.now()}`,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

global.createMCPTestSuperAdmin = async (overrides = {}) => {
  return await global.prisma.user.create({
    data: {
      id: `mcp_superadmin_${Date.now()}`,
      name: 'MCP Test SuperAdmin',
      email: `mcpsuperadmin${Date.now()}@mcp.com`,
      username: `mcpsuperadmin${Date.now()}`,
      role: 'SUPERADMIN',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

// MCP Database connection testing
global.testMCPDatabaseConnection = async () => {
  try {
    // Test primary database connection
    const primaryResult = await global.prisma.$queryRaw`SELECT 1 as test`
    const primaryConnected = primaryResult && primaryResult.length > 0
    
    // Test shadow database connection (if available)
    let shadowConnected = false
    try {
      const shadowPrisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.SHADOW_DATABASE_URL || process.env.DATABASE_URL,
          },
        },
      })
      const shadowResult = await shadowPrisma.$queryRaw`SELECT 1 as test`
      shadowConnected = shadowResult && shadowResult.length > 0
      await shadowPrisma.$disconnect()
    } catch (error) {
      console.warn('Shadow database not available:', error.message)
    }
    
    return {
      primary: {
        connected: primaryConnected,
        error: null,
      },
      shadow: {
        connected: shadowConnected,
        error: shadowConnected ? null : 'Shadow database not available',
      },
    }
  } catch (error) {
    return {
      primary: {
        connected: false,
        error: error.message,
      },
      shadow: {
        connected: false,
        error: 'Primary database not available',
      },
    }
  }
}

// MCP API testing utilities
global.testMCPAPIEndpoint = async (endpoint, method = 'GET', body = null, headers = {}) => {
  const { createMockRequest, createMockResponse } = global
  
  const req = createMockRequest({
    method,
    url: endpoint,
    body,
    headers: {
      'content-type': 'application/json',
      'user-agent': 'MCP-Test',
      ...headers,
    },
  })
  
  const res = createMockResponse()
  
  return { req, res }
}

// MCP Feature testing utilities
global.testMCPFeature = async (featureName, testCases = []) => {
  const results = []
  
  for (const testCase of testCases) {
    try {
      const start = Date.now()
      const result = await testCase.action()
      const end = Date.now()
      
      results.push({
        feature: featureName,
        testCase: testCase.name,
        success: true,
        result,
        responseTime: end - start,
        error: null,
      })
    } catch (error) {
      results.push({
        feature: featureName,
        testCase: testCase.name,
        success: false,
        result: null,
        responseTime: 0,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Database schema testing
global.testMCPDatabaseSchema = async () => {
  const schemaTests = [
    {
      name: 'User table exists',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'User'`,
      expected: 1,
    },
    {
      name: 'Puzzle table exists',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'puzzles'`,
      expected: 1,
    },
    {
      name: 'MultiplayerRoom table exists',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'multiplayer_rooms'`,
      expected: 1,
    },
    {
      name: 'FeatureFlag table exists',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'FeatureFlag'`,
      expected: 1,
    },
    {
      name: 'SystemConfig table exists',
      query: `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'SystemConfig'`,
      expected: 1,
    },
  ]
  
  const results = []
  
  for (const test of schemaTests) {
    try {
      const result = await global.prisma.$queryRawUnsafe(test.query)
      const count = result[0].count
      const passed = count === test.expected
      
      results.push({
        test: test.name,
        success: true,
        passed,
        expected: test.expected,
        actual: count,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        passed: false,
        expected: test.expected,
        actual: null,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Data integrity testing
global.testMCPDataIntegrity = async () => {
  const integrityTests = [
    {
      name: 'User email uniqueness',
      query: `SELECT COUNT(*) as count FROM User GROUP BY email HAVING COUNT(*) > 1`,
      expected: 0,
    },
    {
      name: 'User username uniqueness',
      query: `SELECT COUNT(*) as count FROM User GROUP BY username HAVING COUNT(*) > 1`,
      expected: 0,
    },
    {
      name: 'Room code uniqueness',
      query: `SELECT COUNT(*) as count FROM multiplayer_rooms GROUP BY roomCode HAVING COUNT(*) > 1`,
      expected: 0,
    },
    {
      name: 'Feature flag name uniqueness',
      query: `SELECT COUNT(*) as count FROM FeatureFlag GROUP BY name HAVING COUNT(*) > 1`,
      expected: 0,
    },
    {
      name: 'System config key uniqueness',
      query: `SELECT COUNT(*) as count FROM SystemConfig GROUP BY \`key\` HAVING COUNT(*) > 1`,
      expected: 0,
    },
  ]
  
  const results = []
  
  for (const test of integrityTests) {
    try {
      const result = await global.prisma.$queryRawUnsafe(test.query)
      const count = result[0].count
      const passed = count === test.expected
      
      results.push({
        test: test.name,
        success: true,
        passed,
        expected: test.expected,
        actual: count,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        passed: false,
        expected: test.expected,
        actual: null,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Performance testing
global.testMCPPerformance = async (operations = []) => {
  const results = []
  
  for (const operation of operations) {
    try {
      const start = process.hrtime.bigint()
      const result = await operation.fn()
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1000000 // Convert to milliseconds
      
      results.push({
        operation: operation.name,
        success: true,
        duration,
        result,
        error: null,
      })
    } catch (error) {
      results.push({
        operation: operation.name,
        success: false,
        duration: 0,
        result: null,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Security testing
global.testMCPSecurity = async (securityTests = []) => {
  const results = []
  
  for (const test of securityTests) {
    try {
      const start = Date.now()
      const result = await test.fn()
      const end = Date.now()
      
      results.push({
        test: test.name,
        success: true,
        result,
        responseTime: end - start,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        result: null,
        responseTime: 0,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP WebSocket testing
global.testMCPWebSocket = async (socketTests = []) => {
  const results = []
  
  for (const test of socketTests) {
    try {
      const start = Date.now()
      const result = await test.fn()
      const end = Date.now()
      
      results.push({
        test: test.name,
        success: true,
        result,
        responseTime: end - start,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        result: null,
        responseTime: 0,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Real-time testing
global.testMCPRealTime = async (realTimeTests = []) => {
  const results = []
  
  for (const test of realTimeTests) {
    try {
      const start = Date.now()
      const result = await test.fn()
      const end = Date.now()
      
      results.push({
        test: test.name,
        success: true,
        result,
        responseTime: end - start,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        result: null,
        responseTime: 0,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Error handling testing
global.testMCPErrorHandling = async (errorTests = []) => {
  const results = []
  
  for (const test of errorTests) {
    try {
      const start = Date.now()
      const result = await test.fn()
      const end = Date.now()
      
      results.push({
        test: test.name,
        success: true,
        result,
        responseTime: end - start,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        result: null,
        responseTime: 0,
        error: error.message,
      })
    }
  }
  
  return results
}

// MCP Integration testing
global.testMCPIntegration = async (integrationTests = []) => {
  const results = []
  
  for (const test of integrationTests) {
    try {
      const start = Date.now()
      const result = await test.fn()
      const end = Date.now()
      
      results.push({
        test: test.name,
        success: true,
        result,
        responseTime: end - start,
        error: null,
      })
    } catch (error) {
      results.push({
        test: test.name,
        success: false,
        result: null,
        responseTime: 0,
        error: error.message,
      })
    }
  }
  
  return results
}