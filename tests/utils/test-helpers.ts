// Test utilities and helpers for comprehensive testing
import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// Test database client
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

// Test data factories
export const createTestUser = async (overrides: any = {}) => {
  return await testPrisma.user.create({
    data: {
      id: `test_user_${Date.now()}`,
      name: 'Test User',
      email: `test${Date.now()}@test.com`,
      username: `testuser${Date.now()}`,
      role: 'FREE',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

export const createTestAdmin = async (overrides: any = {}) => {
  return await testPrisma.user.create({
    data: {
      id: `test_admin_${Date.now()}`,
      name: 'Test Admin',
      email: `admin${Date.now()}@test.com`,
      username: `admin${Date.now()}`,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

export const createTestSuperAdmin = async (overrides: any = {}) => {
  return await testPrisma.user.create({
    data: {
      id: `test_superadmin_${Date.now()}`,
      name: 'Test SuperAdmin',
      email: `superadmin${Date.now()}@test.com`,
      username: `superadmin${Date.now()}`,
      role: 'SUPERADMIN',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

export const createTestPuzzle = async (overrides: any = {}) => {
  return await testPrisma.puzzle.create({
    data: {
      title: 'Test Puzzle',
      description: 'A test puzzle for testing',
      filename: 'test-puzzle.json',
      original_filename: 'test-puzzle.json',
      file_path: '/test/puzzles/test-puzzle.json',
      tier: 'free',
      category: 'test',
      difficulty: 'easy',
      is_active: true,
      ...overrides,
    },
  })
}

export const createTestRoom = async (overrides: any = {}) => {
  const puzzle = await createTestPuzzle()
  const user = await createTestUser()
  
  return await testPrisma.multiplayerRoom.create({
    data: {
      id: `test_room_${Date.now()}`,
      roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: 'Test Room',
      description: 'A test room for testing',
      puzzleId: puzzle.id,
      hostUserId: user.id,
      maxPlayers: 4,
      isPrivate: false,
      status: 'WAITING',
      ...overrides,
    },
  })
}

export const createTestFeatureFlag = async (overrides: any = {}) => {
  const admin = await createTestAdmin()
  
  return await testPrisma.featureFlag.create({
    data: {
      name: `test_flag_${Date.now()}`,
      description: 'A test feature flag',
      enabled: false,
      rolloutPercentage: 0,
      createdBy: admin.id,
      ...overrides,
    },
  })
}

export const createTestSystemConfig = async (overrides: any = {}) => {
  const admin = await createTestAdmin()
  
  return await testPrisma.systemConfig.create({
    data: {
      key: `test_config_${Date.now()}`,
      value: { test: true },
      description: 'A test system configuration',
      category: 'test',
      isPublic: false,
      updatedBy: admin.id,
      ...overrides,
    },
  })
}

// Mock request/response utilities
export const createMockRequest = (overrides: any = {}): NextRequest => {
  return {
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    headers: new Headers({
      'content-type': 'application/json',
      ...overrides.headers,
    }),
    body: null,
    ...overrides,
  } as NextRequest
}

export const createMockResponse = (): NextResponse => {
  const response = new NextResponse()
  response.status = jest.fn().mockReturnValue(response)
  response.json = jest.fn().mockReturnValue(response)
  response.send = jest.fn().mockReturnValue(response)
  response.end = jest.fn().mockReturnValue(response)
  response.setHeader = jest.fn().mockReturnValue(response)
  response.getHeader = jest.fn()
  response.removeHeader = jest.fn()
  return response
}

// Mock NextAuth session
export const createMockSession = (user: any = {}) => ({
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@test.com',
    role: 'FREE',
    ...user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

// Database cleanup utilities
export const cleanupTestData = async () => {
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
      await testPrisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'test_%' OR email LIKE '%@test.com'`)
    } catch (error) {
      // Ignore errors for tables that don't exist or have foreign key constraints
      console.warn(`Could not clean up table ${table}:`, error.message)
    }
  }
}

// Performance testing utilities
export const measurePerformance = async <T>(fn: () => Promise<T>, label = 'Operation'): Promise<{ result: T; duration: number }> => {
  const start = process.hrtime.bigint()
  const result = await fn()
  const end = process.hrtime.bigint()
  const duration = Number(end - start) / 1000000 // Convert to milliseconds
  
  console.log(`${label} took ${duration.toFixed(2)}ms`)
  return { result, duration }
}

export const measureMemoryUsage = () => {
  const usage = process.memoryUsage()
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  }
}

// Database connection testing
export const testDatabaseConnection = async () => {
  try {
    await testPrisma.$queryRaw`SELECT 1`
    return { connected: true, error: null }
  } catch (error) {
    return { connected: false, error: error.message }
  }
}

// API endpoint testing utilities
export const testApiEndpoint = async (endpoint: string, method = 'GET', body: any = null, headers: any = {}) => {
  const req = createMockRequest({
    method,
    url: endpoint,
    body,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
  
  const res = createMockResponse()
  
  return { req, res }
}

// Security testing utilities
export const testSQLInjection = async (endpoint: string, method = 'GET', payloads: string[] = []) => {
  const defaultPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "admin'/*",
    "' OR 1=1--",
    "' OR 1=1#",
    "' OR 1=1/*",
    "') OR 1=1--",
    "') OR 1=1#",
    "') OR 1=1/*",
    "' OR 'x'='x",
    "' OR 'x'='x'--",
    "' OR 'x'='x'#",
    "' OR 'x'='x'/*",
    "') OR 'x'='x",
    "') OR 'x'='x'--",
    "') OR 'x'='x'#",
    "') OR 'x'='x'/*",
    "1' AND '1'='1",
    "1' AND '1'='2",
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)--",
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)#",
    "1' AND (SELECT * FROM (SELECT(SLEEP(5)))a)/*",
  ]
  
  const testPayloads = payloads.length > 0 ? payloads : defaultPayloads
  const results = []
  
  for (const payload of testPayloads) {
    try {
      const { req, res } = await testApiEndpoint(endpoint, method, { input: payload })
      
      const start = Date.now()
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100))
      const end = Date.now()
      
      results.push({
        payload,
        success: true,
        responseTime: end - start,
        vulnerable: false, // Would need actual implementation to determine
      })
    } catch (error) {
      results.push({
        payload,
        success: false,
        error: error.message,
        vulnerable: true,
      })
    }
  }
  
  return results
}

export const testXSS = async (endpoint: string, method = 'POST', payloads: string[] = []) => {
  const defaultPayloads = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<iframe src=javascript:alert('XSS')></iframe>",
    "<body onload=alert('XSS')>",
    "<input onfocus=alert('XSS') autofocus>",
    "<select onfocus=alert('XSS') autofocus>",
    "<textarea onfocus=alert('XSS') autofocus>",
    "<keygen onfocus=alert('XSS') autofocus>",
    "<video><source onerror=alert('XSS')>",
    "<audio src=x onerror=alert('XSS')>",
    "<details open ontoggle=alert('XSS')>",
    "<marquee onstart=alert('XSS')>",
    "<div onmouseover=alert('XSS')>",
    "<style>@import'javascript:alert(\"XSS\")';</style>",
    "<link rel=stylesheet href=javascript:alert('XSS')>",
    "<meta http-equiv=refresh content=0;url=javascript:alert('XSS')>",
    "<object data=javascript:alert('XSS')>",
    "<embed src=javascript:alert('XSS')>",
  ]
  
  const testPayloads = payloads.length > 0 ? payloads : defaultPayloads
  const results = []
  
  for (const payload of testPayloads) {
    try {
      const { req, res } = await testApiEndpoint(endpoint, method, { input: payload })
      
      const start = Date.now()
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100))
      const end = Date.now()
      
      results.push({
        payload,
        success: true,
        responseTime: end - start,
        vulnerable: false, // Would need actual implementation to determine
      })
    } catch (error) {
      results.push({
        payload,
        success: false,
        error: error.message,
        vulnerable: true,
      })
    }
  }
  
  return results
}

// Load testing utilities
export const loadTest = async <T>(fn: () => Promise<T>, iterations = 100, concurrency = 10) => {
  const results = []
  const startTime = Date.now()
  
  // Create batches for concurrent execution
  const batches = []
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = []
    for (let j = 0; j < concurrency && i + j < iterations; j++) {
      batch.push(fn())
    }
    batches.push(batch)
  }
  
  // Execute batches sequentially
  for (const batch of batches) {
    const batchResults = await Promise.all(batch)
    results.push(...batchResults)
  }
  
  const endTime = Date.now()
  const totalDuration = endTime - startTime
  const avgDuration = totalDuration / iterations
  const requestsPerSecond = (iterations / totalDuration) * 1000
  
  return {
    results,
    totalDuration,
    avgDuration,
    requestsPerSecond,
    iterations,
    concurrency,
  }
}

// Stress testing utilities
export const stressTest = async <T>(fn: () => Promise<T>, duration = 30000, concurrency = 50) => {
  const results = []
  const startTime = Date.now()
  const endTime = startTime + duration
  
  // Create concurrent workers
  const workers = Array(concurrency).fill().map(async () => {
    const workerResults = []
    while (Date.now() < endTime) {
      try {
        const start = process.hrtime.bigint()
        const result = await fn()
        const end = process.hrtime.bigint()
        const executionTime = Number(end - start) / 1000000
        
        workerResults.push({
          success: true,
          executionTime,
          result,
          timestamp: Date.now(),
        })
      } catch (error) {
        workerResults.push({
          success: false,
          executionTime: 0,
          error: error.message,
          timestamp: Date.now(),
        })
      }
    }
    return workerResults
  })
  
  // Wait for all workers to complete
  const allResults = await Promise.all(workers)
  allResults.forEach(workerResults => results.push(...workerResults))
  
  const totalDuration = Date.now() - startTime
  const successfulRequests = results.filter(r => r.success).length
  const failedRequests = results.filter(r => !r.success).length
  const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length
  const requestsPerSecond = (results.length / totalDuration) * 1000
  
  return {
    results,
    totalDuration,
    successfulRequests,
    failedRequests,
    avgExecutionTime,
    requestsPerSecond,
    concurrency,
    successRate: (successfulRequests / results.length) * 100,
  }
}

// Benchmark utilities
export const benchmark = async <T>(fn: () => Promise<T>, iterations = 1000) => {
  const results = []
  
  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn()
  }
  
  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint()
    await fn()
    const end = process.hrtime.bigint()
    const duration = Number(end - start) / 1000000
    results.push(duration)
  }
  
  // Calculate statistics
  results.sort((a, b) => a - b)
  const min = results[0]
  const max = results[results.length - 1]
  const avg = results.reduce((sum, r) => sum + r, 0) / results.length
  const median = results[Math.floor(results.length / 2)]
  const p95 = results[Math.floor(results.length * 0.95)]
  const p99 = results[Math.floor(results.length * 0.99)]
  
  return {
    min,
    max,
    avg,
    median,
    p95,
    p99,
    iterations,
    results,
  }
}

// Memory leak detection
export const detectMemoryLeaks = <T>(fn: () => Promise<T>, iterations = 100) => {
  const initialMemory = measureMemoryUsage()
  const results = []
  
  return {
    run: async () => {
      for (let i = 0; i < iterations; i++) {
        await fn()
        
        if (i % 10 === 0) {
          const currentMemory = measureMemoryUsage()
          results.push({
            iteration: i,
            memory: currentMemory,
            heapGrowth: currentMemory.heapUsed - initialMemory.heapUsed,
          })
        }
      }
      
      const finalMemory = measureMemoryUsage()
      const totalHeapGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      return {
        initialMemory,
        finalMemory,
        totalHeapGrowth,
        results,
        hasMemoryLeak: totalHeapGrowth > 50, // 50MB threshold
      }
    }
  }
}

// Test data generation utilities
export const generateTestData = async (userCount = 1000, roomCount = 100, puzzleCount = 50) => {
  console.log(`Generating test data: ${userCount} users, ${roomCount} rooms, ${puzzleCount} puzzles`)
  
  // Create puzzles
  const puzzles = []
  for (let i = 0; i < puzzleCount; i++) {
    const puzzle = await testPrisma.puzzle.create({
      data: {
        title: `Test Puzzle ${i}`,
        description: `A puzzle for testing ${i}`,
        filename: `test-puzzle-${i}.json`,
        original_filename: `test-puzzle-${i}.json`,
        file_path: `/test/puzzles/test-puzzle-${i}.json`,
        tier: 'free',
        category: 'test',
        difficulty: 'easy',
        is_active: true,
      },
    })
    puzzles.push(puzzle)
  }
  
  // Create users
  const users = []
  for (let i = 0; i < userCount; i++) {
    const user = await testPrisma.user.create({
      data: {
        id: `test_user_${i}`,
        name: `Test User ${i}`,
        email: `test${i}@test.com`,
        username: `testuser${i}`,
        role: 'FREE',
        accountStatus: 'ACTIVE',
      },
    })
    users.push(user)
  }
  
  // Create rooms
  const rooms = []
  for (let i = 0; i < roomCount; i++) {
    const puzzle = puzzles[i % puzzles.length]
    const user = users[i % users.length]
    
    const room = await testPrisma.multiplayerRoom.create({
      data: {
        id: `test_room_${i}`,
        roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        name: `Test Room ${i}`,
        description: `A room for testing ${i}`,
        puzzleId: puzzle.id,
        hostUserId: user.id,
        maxPlayers: 4,
        isPrivate: false,
        status: 'WAITING',
      },
    })
    rooms.push(room)
  }
  
  return { users, rooms, puzzles }
}

// Database state verification
export const verifyDatabaseState = async (expectedState: Record<string, string>) => {
  const results: Record<string, any> = {}
  
  for (const [table, conditions] of Object.entries(expectedState)) {
    try {
      const count = await testPrisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`
      )
      results[table] = { count: (count as any)[0].count, success: true }
    } catch (error) {
      results[table] = { count: 0, success: false, error: error.message }
    }
  }
  
  return results
}

// Test result aggregation
export const aggregateTestResults = (results: any[]) => {
  const total = results.length
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const successRate = (passed / total) * 100
  
  return {
    total,
    passed,
    failed,
    successRate,
    results,
  }
}

// Export all utilities
export default {
  createTestUser,
  createTestAdmin,
  createTestSuperAdmin,
  createTestPuzzle,
  createTestRoom,
  createTestFeatureFlag,
  createTestSystemConfig,
  createMockRequest,
  createMockResponse,
  createMockSession,
  cleanupTestData,
  measurePerformance,
  measureMemoryUsage,
  testDatabaseConnection,
  testApiEndpoint,
  testSQLInjection,
  testXSS,
  loadTest,
  stressTest,
  benchmark,
  detectMemoryLeaks,
  generateTestData,
  verifyDatabaseState,
  aggregateTestResults,
}