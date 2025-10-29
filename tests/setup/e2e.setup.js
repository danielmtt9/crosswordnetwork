// End-to-end test setup
const { PrismaClient } = require('@prisma/client')

// Global test database client for E2E tests
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

// E2E test setup and teardown
beforeAll(async () => {
  // Connect to test database
  await global.prisma.$connect()
  
  // Set up test environment
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
      await global.prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'e2e_%' OR email LIKE '%@e2e.com'`)
    } catch (error) {
      // Ignore errors for tables that don't exist or have foreign key constraints
      console.warn(`Could not clean up table ${table}:`, error.message)
    }
  }
}

// Mock external services for E2E tests
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

// Mock QR code generation
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,test-qr-code'),
}))

// Mock OTP library
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn().mockReturnValue('test-secret'),
    verify: jest.fn().mockReturnValue(true),
    keyuri: jest.fn().mockReturnValue('otpauth://totp/test'),
  },
}))

// E2E test utilities
global.createE2EUser = async (overrides = {}) => {
  return await global.prisma.user.create({
    data: {
      id: `e2e_user_${Date.now()}`,
      name: 'E2E Test User',
      email: `e2e${Date.now()}@e2e.com`,
      username: `e2euser${Date.now()}`,
      role: 'FREE',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

global.createE2EAdmin = async (overrides = {}) => {
  return await global.prisma.user.create({
    data: {
      id: `e2e_admin_${Date.now()}`,
      name: 'E2E Test Admin',
      email: `e2eadmin${Date.now()}@e2e.com`,
      username: `e2eadmin${Date.now()}`,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

global.createE2ESuperAdmin = async (overrides = {}) => {
  return await global.prisma.user.create({
    data: {
      id: `e2e_superadmin_${Date.now()}`,
      name: 'E2E Test SuperAdmin',
      email: `e2esuperadmin${Date.now()}@e2e.com`,
      username: `e2esuperadmin${Date.now()}`,
      role: 'SUPERADMIN',
      accountStatus: 'ACTIVE',
      ...overrides,
    },
  })
}

global.createE2EPuzzle = async (overrides = {}) => {
  return await global.prisma.puzzle.create({
    data: {
      title: 'E2E Test Puzzle',
      description: 'A test puzzle for E2E testing',
      filename: 'e2e-test-puzzle.json',
      original_filename: 'e2e-test-puzzle.json',
      file_path: '/test/puzzles/e2e-test-puzzle.json',
      tier: 'free',
      category: 'e2e-test',
      difficulty: 'easy',
      is_active: true,
      ...overrides,
    },
  })
}

global.createE2ERoom = async (overrides = {}) => {
  const puzzle = await global.createE2EPuzzle()
  const user = await global.createE2EUser()
  
  return await global.prisma.multiplayerRoom.create({
    data: {
      id: `e2e_room_${Date.now()}`,
      roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: 'E2E Test Room',
      description: 'A test room for E2E testing',
      puzzleId: puzzle.id,
      hostUserId: user.id,
      maxPlayers: 4,
      isPrivate: false,
      status: 'WAITING',
      ...overrides,
    },
  })
}

// E2E workflow testing utilities
global.simulateUserJourney = async (journey) => {
  const results = []
  
  for (const step of journey) {
    try {
      const result = await step.action()
      results.push({
        step: step.name,
        success: true,
        result,
        error: null,
      })
    } catch (error) {
      results.push({
        step: step.name,
        success: false,
        result: null,
        error: error.message,
      })
    }
  }
  
  return results
}

// Mock browser environment for E2E tests
global.mockBrowserEnvironment = () => {
  // Mock window object
  global.window = {
    location: {
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: '',
    },
    localStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    sessionStorage: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    fetch: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
  
  // Mock document object
  global.document = {
    createElement: jest.fn(() => ({
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }
  
  // Mock navigator object
  global.navigator = {
    userAgent: 'Mozilla/5.0 (Test Browser)',
    platform: 'Test Platform',
    language: 'en-US',
  }
}

// API testing utilities for E2E
global.testApiEndpointE2E = async (endpoint, method = 'GET', body = null, headers = {}) => {
  const { createMockRequest, createMockResponse } = global
  
  const req = createMockRequest({
    method,
    url: endpoint,
    body,
    headers: {
      'content-type': 'application/json',
      'user-agent': 'E2E-Test',
      ...headers,
    },
  })
  
  const res = createMockResponse()
  
  return { req, res }
}

// Database state verification for E2E tests
global.verifyDatabaseState = async (expectedState) => {
  const results = {}
  
  for (const [table, conditions] of Object.entries(expectedState)) {
    try {
      const count = await global.prisma.$queryRawUnsafe(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${conditions}`
      )
      results[table] = { count: count[0].count, success: true }
    } catch (error) {
      results[table] = { count: 0, success: false, error: error.message }
    }
  }
  
  return results
}

// Performance monitoring for E2E tests
global.monitorPerformance = (label = 'E2E Operation') => {
  const start = process.hrtime.bigint()
  
  return {
    end: () => {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1000000 // Convert to milliseconds
      console.log(`${label} took ${duration.toFixed(2)}ms`)
      return duration
    }
  }
}

// Clean up browser mocks
afterEach(() => {
  delete global.window
  delete global.document
  delete global.navigator
})