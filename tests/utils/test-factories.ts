// Test data factories for comprehensive testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// User factories
export const createUser = async (overrides: any = {}) => {
  const defaultData = {
    id: `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    name: 'Test User',
    email: `test${Date.now()}@test.com`,
    username: `testuser${Date.now()}`,
    role: 'FREE',
    accountStatus: 'ACTIVE',
    subscriptionStatus: 'TRIAL',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    requirePasswordChange: false,
    twoFactorEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.user.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createAdmin = async (overrides: any = {}) => {
  return await createUser({
    role: 'ADMIN',
    name: 'Test Admin',
    email: `admin${Date.now()}@test.com`,
    username: `admin${Date.now()}`,
    ...overrides,
  })
}

export const createSuperAdmin = async (overrides: any = {}) => {
  return await createUser({
    role: 'SUPERADMIN',
    name: 'Test SuperAdmin',
    email: `superadmin${Date.now()}@test.com`,
    username: `superadmin${Date.now()}`,
    ...overrides,
  })
}

export const createPremiumUser = async (overrides: any = {}) => {
  return await createUser({
    role: 'PREMIUM',
    subscriptionStatus: 'ACTIVE',
    name: 'Test Premium User',
    email: `premium${Date.now()}@test.com`,
    username: `premium${Date.now()}`,
    ...overrides,
  })
}

export const createSuspendedUser = async (overrides: any = {}) => {
  return await createUser({
    accountStatus: 'SUSPENDED',
    suspendedAt: new Date(),
    suspendedBy: 'test-admin-id',
    suspensionReason: 'Test suspension',
    name: 'Suspended User',
    email: `suspended${Date.now()}@test.com`,
    username: `suspended${Date.now()}`,
    ...overrides,
  })
}

export const createBannedUser = async (overrides: any = {}) => {
  return await createUser({
    accountStatus: 'BANNED',
    suspendedAt: new Date(),
    suspendedBy: 'test-admin-id',
    suspensionReason: 'Test ban',
    name: 'Banned User',
    email: `banned${Date.now()}@test.com`,
    username: `banned${Date.now()}`,
    ...overrides,
  })
}

// Puzzle factories
export const createPuzzle = async (overrides: any = {}) => {
  const defaultData = {
    title: 'Test Puzzle',
    description: 'A test puzzle for testing purposes',
    filename: `test-puzzle-${Date.now()}.json`,
    original_filename: `test-puzzle-${Date.now()}.json`,
    file_path: `/test/puzzles/test-puzzle-${Date.now()}.json`,
    tier: 'free',
    category: 'test',
    difficulty: 'easy',
    is_active: true,
    play_count: 0,
    completion_rate: 0.0,
    estimated_solve_time: 15,
    avg_solve_time: 0.0,
    best_score: 0,
    grid_width: 15,
    grid_height: 15,
    tags: '["test", "easy"]',
    upload_date: new Date(),
  }

  return await prisma.puzzle.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createPremiumPuzzle = async (overrides: any = {}) => {
  return await createPuzzle({
    tier: 'premium',
    title: 'Premium Test Puzzle',
    description: 'A premium test puzzle',
    ...overrides,
  })
}

export const createHardPuzzle = async (overrides: any = {}) => {
  return await createPuzzle({
    difficulty: 'hard',
    title: 'Hard Test Puzzle',
    description: 'A hard test puzzle',
    estimated_solve_time: 45,
    ...overrides,
  })
}

// Room factories
export const createRoom = async (overrides: any = {}) => {
  const puzzle = await createPuzzle()
  const user = await createUser()

  const defaultData = {
    id: `test_room_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    roomCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
    name: 'Test Room',
    description: 'A test room for testing purposes',
    puzzleId: puzzle.id,
    hostUserId: user.id,
    maxPlayers: 4,
    isPrivate: false,
    allowSpectators: true,
    autoStart: false,
    timeLimit: null,
    difficulty: null,
    tags: '["test", "multiplayer"]',
    status: 'WAITING',
    gridState: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    lastActivityAt: new Date(),
    isPersistent: true,
    persistenceDays: 7,
    autoCleanup: true,
  }

  return await prisma.multiplayerRoom.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createPrivateRoom = async (overrides: any = {}) => {
  return await createRoom({
    isPrivate: true,
    password: 'testpassword',
    name: 'Private Test Room',
    ...overrides,
  })
}

export const createActiveRoom = async (overrides: any = {}) => {
  return await createRoom({
    status: 'ACTIVE',
    startedAt: new Date(),
    name: 'Active Test Room',
    ...overrides,
  })
}

export const createCompletedRoom = async (overrides: any = {}) => {
  return await createRoom({
    status: 'COMPLETED',
    startedAt: new Date(Date.now() - 3600000), // 1 hour ago
    completedAt: new Date(),
    name: 'Completed Test Room',
    ...overrides,
  })
}

// Feature flag factories
export const createFeatureFlag = async (overrides: any = {}) => {
  const admin = await createAdmin()

  const defaultData = {
    name: `test_flag_${Date.now()}`,
    description: 'A test feature flag',
    enabled: false,
    rolloutPercentage: 0,
    targetUsers: null,
    targetRoles: null,
    conditions: null,
    createdBy: admin.id,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.featureFlag.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createEnabledFeatureFlag = async (overrides: any = {}) => {
  return await createFeatureFlag({
    enabled: true,
    name: `enabled_flag_${Date.now()}`,
    description: 'An enabled test feature flag',
    ...overrides,
  })
}

export const createRolloutFeatureFlag = async (overrides: any = {}) => {
  return await createFeatureFlag({
    enabled: true,
    rolloutPercentage: 50,
    name: `rollout_flag_${Date.now()}`,
    description: 'A rollout test feature flag',
    ...overrides,
  })
}

// System config factories
export const createSystemConfig = async (overrides: any = {}) => {
  const admin = await createAdmin()

  const defaultData = {
    key: `test_config_${Date.now()}`,
    value: { test: true },
    description: 'A test system configuration',
    category: 'test',
    isPublic: false,
    updatedBy: admin.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.systemConfig.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createPublicSystemConfig = async (overrides: any = {}) => {
  return await createSystemConfig({
    isPublic: true,
    key: `public_config_${Date.now()}`,
    description: 'A public test system configuration',
    ...overrides,
  })
}

// Achievement factories
export const createAchievement = async (overrides: any = {}) => {
  const defaultData = {
    key: `test_achievement_${Date.now()}`,
    name: 'Test Achievement',
    description: 'A test achievement',
    category: 'COMPLETION',
    tier: 'BRONZE',
    points: 10,
    iconName: 'trophy',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 1 }),
    isSecret: false,
    order: 0,
    createdAt: new Date(),
  }

  return await prisma.achievement.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createSecretAchievement = async (overrides: any = {}) => {
  return await createAchievement({
    isSecret: true,
    key: `secret_achievement_${Date.now()}`,
    name: 'Secret Achievement',
    description: 'A secret test achievement',
    ...overrides,
  })
}

// User progress factories
export const createUserProgress = async (overrides: any = {}) => {
  const user = await createUser()
  const puzzle = await createPuzzle()

  const defaultData = {
    userId: user.id,
    puzzleId: puzzle.id,
    completedCells: null,
    hintsUsed: 0,
    isCompleted: false,
    lastPlayedAt: new Date(),
    completedAt: null,
    completionTimeSeconds: null,
    score: 0,
    startedAt: new Date(),
    timesPlayed: 1,
    bestTimeSeconds: null,
    totalAccuracy: 100.0,
  }

  return await prisma.userProgress.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createCompletedUserProgress = async (overrides: any = {}) => {
  return await createUserProgress({
    isCompleted: true,
    completedAt: new Date(),
    completionTimeSeconds: 300, // 5 minutes
    score: 1000,
    timesPlayed: 1,
    bestTimeSeconds: 300,
    totalAccuracy: 95.0,
    ...overrides,
  })
}

// Notification factories
export const createNotification = async (overrides: any = {}) => {
  const user = await createUser()

  const defaultData = {
    userId: user.id,
    type: 'FRIEND_REQUEST',
    title: 'Test Notification',
    message: 'This is a test notification',
    actionUrl: null,
    metadata: null,
    isRead: false,
    createdAt: new Date(),
  }

  return await prisma.notification.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createReadNotification = async (overrides: any = {}) => {
  return await createNotification({
    isRead: true,
    title: 'Read Test Notification',
    ...overrides,
  })
}

// Friendship factories
export const createFriendship = async (overrides: any = {}) => {
  const user1 = await createUser()
  const user2 = await createUser()

  const defaultData = {
    userId: user1.id,
    friendId: user2.id,
    status: 'PENDING',
    initiatedBy: user1.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.friendship.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createAcceptedFriendship = async (overrides: any = {}) => {
  return await createFriendship({
    status: 'ACCEPTED',
    ...overrides,
  })
}

// Room invite factories
export const createRoomInvite = async (overrides: any = {}) => {
  const room = await createRoom()
  const inviter = await createUser()
  const invitee = await createUser()

  const defaultData = {
    roomId: room.id,
    invitedById: inviter.id,
    inviteeId: invitee.id,
    status: 'PENDING',
    message: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
  }

  return await prisma.roomInvite.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createAcceptedRoomInvite = async (overrides: any = {}) => {
  return await createRoomInvite({
    status: 'ACCEPTED',
    ...overrides,
  })
}

// Join request factories
export const createJoinRequest = async (overrides: any = {}) => {
  const room = await createRoom()
  const user = await createUser()

  const defaultData = {
    roomId: room.id,
    userId: user.id,
    message: null,
    status: 'PENDING',
    createdAt: new Date(),
  }

  return await prisma.joinRequest.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createApprovedJoinRequest = async (overrides: any = {}) => {
  return await createJoinRequest({
    status: 'APPROVED',
    ...overrides,
  })
}

// User stats factories
export const createUserStats = async (overrides: any = {}) => {
  const user = await createUser()

  const defaultData = {
    userId: user.id,
    totalPuzzlesStarted: 0,
    totalPuzzlesCompleted: 0,
    totalPlayTime: 0,
    averageAccuracy: 100.0,
    averageCompletionTime: 0.0,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    totalScore: 0,
    achievementPoints: 0,
    globalRank: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.userStats.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createActiveUserStats = async (overrides: any = {}) => {
  return await createUserStats({
    totalPuzzlesStarted: 10,
    totalPuzzlesCompleted: 8,
    totalPlayTime: 3600, // 1 hour
    averageAccuracy: 95.0,
    averageCompletionTime: 450.0, // 7.5 minutes
    currentStreak: 3,
    longestStreak: 7,
    lastPlayedDate: new Date(),
    totalScore: 5000,
    achievementPoints: 100,
    globalRank: 150,
    ...overrides,
  })
}

// Leaderboard entry factories
export const createLeaderboardEntry = async (overrides: any = {}) => {
  const user = await createUser()

  const defaultData = {
    period: 'WEEKLY',
    scope: 'GLOBAL',
    scopeId: null,
    userId: user.id,
    userName: user.name || 'Test User',
    userAvatar: user.image,
    metric: 'fastest_time',
    value: 300, // 5 minutes
    rank: 1,
    periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    periodEnd: new Date(),
    computedAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.leaderboardEntry.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createTopLeaderboardEntry = async (overrides: any = {}) => {
  return await createLeaderboardEntry({
    rank: 1,
    value: 120, // 2 minutes
    metric: 'fastest_time',
    ...overrides,
  })
}

// AB Test factories
export const createABTest = async (overrides: any = {}) => {
  const admin = await createAdmin()

  const defaultData = {
    name: `test_ab_test_${Date.now()}`,
    description: 'A test A/B test',
    status: 'DRAFT',
    variants: [
      { name: 'Control', weight: 50 },
      { name: 'Variant A', weight: 50 },
    ],
    targetAudience: {
      roles: ['FREE', 'PREMIUM'],
      minAge: 18,
      maxAge: 65,
    },
    metrics: {
      primary: 'conversion_rate',
      secondary: ['engagement', 'retention'],
    },
    startDate: null,
    endDate: null,
    createdBy: admin.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return await prisma.aBTest.create({
    data: { ...defaultData, ...overrides },
  })
}

export const createActiveABTest = async (overrides: any = {}) => {
  return await createABTest({
    status: 'ACTIVE',
    startDate: new Date(),
    name: `active_ab_test_${Date.now()}`,
    ...overrides,
  })
}

// Bulk data generation
export const generateBulkUsers = async (count: number, overrides: any = {}) => {
  const users = []
  for (let i = 0; i < count; i++) {
    const user = await createUser({
      name: `Bulk User ${i}`,
      email: `bulk${i}@test.com`,
      username: `bulkuser${i}`,
      ...overrides,
    })
    users.push(user)
  }
  return users
}

export const generateBulkPuzzles = async (count: number, overrides: any = {}) => {
  const puzzles = []
  for (let i = 0; i < count; i++) {
    const puzzle = await createPuzzle({
      title: `Bulk Puzzle ${i}`,
      filename: `bulk-puzzle-${i}.json`,
      original_filename: `bulk-puzzle-${i}.json`,
      file_path: `/test/puzzles/bulk-puzzle-${i}.json`,
      ...overrides,
    })
    puzzles.push(puzzle)
  }
  return puzzles
}

export const generateBulkRooms = async (count: number, overrides: any = {}) => {
  const rooms = []
  for (let i = 0; i < count; i++) {
    const room = await createRoom({
      name: `Bulk Room ${i}`,
      ...overrides,
    })
    rooms.push(room)
  }
  return rooms
}

// Cleanup utilities
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
      await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE id LIKE 'test_%' OR email LIKE '%@test.com'`)
    } catch (error) {
      console.warn(`Could not clean up table ${table}:`, error.message)
    }
  }
}

// Export all factories
export default {
  // User factories
  createUser,
  createAdmin,
  createSuperAdmin,
  createPremiumUser,
  createSuspendedUser,
  createBannedUser,
  
  // Puzzle factories
  createPuzzle,
  createPremiumPuzzle,
  createHardPuzzle,
  
  // Room factories
  createRoom,
  createPrivateRoom,
  createActiveRoom,
  createCompletedRoom,
  
  // Feature flag factories
  createFeatureFlag,
  createEnabledFeatureFlag,
  createRolloutFeatureFlag,
  
  // System config factories
  createSystemConfig,
  createPublicSystemConfig,
  
  // Achievement factories
  createAchievement,
  createSecretAchievement,
  
  // User progress factories
  createUserProgress,
  createCompletedUserProgress,
  
  // Notification factories
  createNotification,
  createReadNotification,
  
  // Friendship factories
  createFriendship,
  createAcceptedFriendship,
  
  // Room invite factories
  createRoomInvite,
  createAcceptedRoomInvite,
  
  // Join request factories
  createJoinRequest,
  createApprovedJoinRequest,
  
  // User stats factories
  createUserStats,
  createActiveUserStats,
  
  // Leaderboard entry factories
  createLeaderboardEntry,
  createTopLeaderboardEntry,
  
  // AB Test factories
  createABTest,
  createActiveABTest,
  
  // Bulk data generation
  generateBulkUsers,
  generateBulkPuzzles,
  generateBulkRooms,
  
  // Cleanup utilities
  cleanupTestData,
}