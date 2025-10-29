// Integration test setup
const { PrismaClient } = require('@prisma/client')

// Global test database client
global.prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
})

// Setup and teardown for integration tests
beforeAll(async () => {
  // Connect to test database
  await global.prisma.$connect()
  
  // Clean up test data
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
      await global.prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'test_%' OR email LIKE '%@test.com'`)
    } catch (error) {
      // Ignore errors for tables that don't exist or have foreign key constraints
      console.warn(`Could not clean up table ${table}:`, error.message)
    }
  }
}

// Mock external services for integration tests
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

// Test utilities
global.createTestUser = async (overrides = {}) => {
  return await global.prisma.user.create({
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

global.createTestAdmin = async (overrides = {}) => {
  return await global.prisma.user.create({
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

global.createTestSuperAdmin = async (overrides = {}) => {
  return await global.prisma.user.create({
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

global.createTestPuzzle = async (overrides = {}) => {
  return await global.prisma.puzzle.create({
    data: {
      title: 'Test Puzzle',
      description: 'A test puzzle for integration testing',
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

global.createTestRoom = async (overrides = {}) => {
  const puzzle = await global.createTestPuzzle()
  const user = await global.createTestUser()
  
  return await global.prisma.multiplayerRoom.create({
    data: {
      id: `test_room_${Date.now()}`,
      roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: 'Test Room',
      description: 'A test room for integration testing',
      puzzleId: puzzle.id,
      hostUserId: user.id,
      maxPlayers: 4,
      isPrivate: false,
      status: 'WAITING',
      ...overrides,
    },
  })
}

// Mock Next.js request/response objects
global.createMockRequest = (overrides = {}) => ({
  method: 'GET',
  url: '/api/test',
  headers: {},
  body: {},
  query: {},
  ...overrides,
})

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
    removeHeader: jest.fn(),
    locals: {},
  }
  return res
}

// Mock NextAuth session
global.createMockSession = (user = {}) => ({
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@test.com',
    role: 'FREE',
    ...user,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
})

// Performance testing utilities
global.measurePerformance = async (fn, label = 'Operation') => {
  const start = process.hrtime.bigint()
  const result = await fn()
  const end = process.hrtime.bigint()
  const duration = Number(end - start) / 1000000 // Convert to milliseconds
  
  console.log(`${label} took ${duration.toFixed(2)}ms`)
  return { result, duration }
}

// Database connection testing
global.testDatabaseConnection = async () => {
  try {
    await global.prisma.$queryRaw`SELECT 1`
    return { connected: true, error: null }
  } catch (error) {
    return { connected: false, error: error.message }
  }
}

// API endpoint testing utilities
global.testApiEndpoint = async (endpoint, method = 'GET', body = null, headers = {}) => {
  const { createMockRequest, createMockResponse } = global
  
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