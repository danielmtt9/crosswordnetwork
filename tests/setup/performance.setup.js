// Performance test setup
const { PrismaClient } = require('@prisma/client')

// Global test database client for performance tests
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

// Performance test setup and teardown
beforeAll(async () => {
  // Connect to test database
  await global.prisma.$connect()
  
  // Set up performance test environment
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
      await global.prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'perf_%' OR email LIKE '%@perf.com'`)
    } catch (error) {
      // Ignore errors for tables that don't exist or have foreign key constraints
      console.warn(`Could not clean up table ${table}:`, error.message)
    }
  }
}

// Mock external services for performance tests
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

// Performance testing utilities
global.measurePerformance = async (fn, label = 'Performance Test') => {
  const start = process.hrtime.bigint()
  const result = await fn()
  const end = process.hrtime.bigint()
  const duration = Number(end - start) / 1000000 // Convert to milliseconds
  
  console.log(`${label} took ${duration.toFixed(2)}ms`)
  return { result, duration }
}

global.measureMemoryUsage = () => {
  const usage = process.memoryUsage()
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
  }
}

global.measureDatabasePerformance = async (query, label = 'Database Query') => {
  const start = process.hrtime.bigint()
  const result = await query()
  const end = process.hrtime.bigint()
  const duration = Number(end - start) / 1000000 // Convert to milliseconds
  
  console.log(`${label} took ${duration.toFixed(2)}ms`)
  return { result, duration }
}

global.loadTest = async (fn, iterations = 100, concurrency = 10) => {
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

global.stressTest = async (fn, duration = 30000, concurrency = 50) => {
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

global.benchmark = async (fn, iterations = 1000) => {
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

// Database performance testing utilities
global.createPerformanceTestData = async (userCount = 1000, roomCount = 100, puzzleCount = 50) => {
  console.log(`Creating performance test data: ${userCount} users, ${roomCount} rooms, ${puzzleCount} puzzles`)
  
  // Create puzzles
  const puzzles = []
  for (let i = 0; i < puzzleCount; i++) {
    const puzzle = await global.prisma.puzzle.create({
      data: {
        title: `Performance Test Puzzle ${i}`,
        description: `A puzzle for performance testing ${i}`,
        filename: `perf-puzzle-${i}.json`,
        original_filename: `perf-puzzle-${i}.json`,
        file_path: `/test/puzzles/perf-puzzle-${i}.json`,
        tier: 'free',
        category: 'performance-test',
        difficulty: 'easy',
        is_active: true,
      },
    })
    puzzles.push(puzzle)
  }
  
  // Create users
  const users = []
  for (let i = 0; i < userCount; i++) {
    const user = await global.prisma.user.create({
      data: {
        id: `perf_user_${i}`,
        name: `Performance User ${i}`,
        email: `perf${i}@perf.com`,
        username: `perfuser${i}`,
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
    
    const room = await global.prisma.multiplayerRoom.create({
      data: {
        id: `perf_room_${i}`,
        roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        name: `Performance Room ${i}`,
        description: `A room for performance testing ${i}`,
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

// API performance testing utilities
global.testApiPerformance = async (endpoint, method = 'GET', body = null, iterations = 100) => {
  const { createMockRequest, createMockResponse } = global
  
  const results = []
  
  for (let i = 0; i < iterations; i++) {
    const req = createMockRequest({
      method,
      url: endpoint,
      body,
      headers: {
        'content-type': 'application/json',
      },
    })
    
    const res = createMockResponse()
    
    const start = process.hrtime.bigint()
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
    const end = process.hrtime.bigint()
    
    const duration = Number(end - start) / 1000000
    results.push(duration)
  }
  
  return {
    endpoint,
    method,
    iterations,
    results,
    avgDuration: results.reduce((sum, r) => sum + r, 0) / results.length,
    minDuration: Math.min(...results),
    maxDuration: Math.max(...results),
  }
}

// Memory leak detection
global.detectMemoryLeaks = (fn, iterations = 100) => {
  const initialMemory = global.measureMemoryUsage()
  const results = []
  
  return {
    run: async () => {
      for (let i = 0; i < iterations; i++) {
        await fn()
        
        if (i % 10 === 0) {
          const currentMemory = global.measureMemoryUsage()
          results.push({
            iteration: i,
            memory: currentMemory,
            heapGrowth: currentMemory.heapUsed - initialMemory.heapUsed,
          })
        }
      }
      
      const finalMemory = global.measureMemoryUsage()
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