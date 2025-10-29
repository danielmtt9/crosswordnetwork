// Test data fixtures for comprehensive testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Test data fixtures
export const testUsers = {
  regularUser: {
    id: 'test_user_regular',
    name: 'Regular User',
    email: 'regular@test.com',
    username: 'regularuser',
    role: 'FREE',
    accountStatus: 'ACTIVE',
    subscriptionStatus: 'TRIAL',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    requirePasswordChange: false,
    twoFactorEnabled: false,
  },
  adminUser: {
    id: 'test_user_admin',
    name: 'Admin User',
    email: 'admin@test.com',
    username: 'adminuser',
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    requirePasswordChange: false,
    twoFactorEnabled: true,
  },
  superAdminUser: {
    id: 'test_user_superadmin',
    name: 'SuperAdmin User',
    email: 'superadmin@test.com',
    username: 'superadminuser',
    role: 'SUPERADMIN',
    accountStatus: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    requirePasswordChange: false,
    twoFactorEnabled: true,
  },
  premiumUser: {
    id: 'test_user_premium',
    name: 'Premium User',
    email: 'premium@test.com',
    username: 'premiumuser',
    role: 'PREMIUM',
    accountStatus: 'ACTIVE',
    subscriptionStatus: 'ACTIVE',
    requirePasswordChange: false,
    twoFactorEnabled: false,
  },
  suspendedUser: {
    id: 'test_user_suspended',
    name: 'Suspended User',
    email: 'suspended@test.com',
    username: 'suspendeduser',
    role: 'FREE',
    accountStatus: 'SUSPENDED',
    subscriptionStatus: 'TRIAL',
    suspendedAt: new Date(),
    suspendedBy: 'test_user_admin',
    suspensionReason: 'Test suspension',
    requirePasswordChange: false,
    twoFactorEnabled: false,
  },
  bannedUser: {
    id: 'test_user_banned',
    name: 'Banned User',
    email: 'banned@test.com',
    username: 'banneduser',
    role: 'FREE',
    accountStatus: 'BANNED',
    subscriptionStatus: 'TRIAL',
    suspendedAt: new Date(),
    suspendedBy: 'test_user_admin',
    suspensionReason: 'Test ban',
    requirePasswordChange: false,
    twoFactorEnabled: false,
  },
}

export const testPuzzles = {
  freePuzzle: {
    title: 'Free Test Puzzle',
    description: 'A free test puzzle',
    filename: 'free-test-puzzle.json',
    original_filename: 'free-test-puzzle.json',
    file_path: '/test/puzzles/free-test-puzzle.json',
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
    tags: '["test", "easy", "free"]',
  },
  premiumPuzzle: {
    title: 'Premium Test Puzzle',
    description: 'A premium test puzzle',
    filename: 'premium-test-puzzle.json',
    original_filename: 'premium-test-puzzle.json',
    file_path: '/test/puzzles/premium-test-puzzle.json',
    tier: 'premium',
    category: 'test',
    difficulty: 'hard',
    is_active: true,
    play_count: 0,
    completion_rate: 0.0,
    estimated_solve_time: 45,
    avg_solve_time: 0.0,
    best_score: 0,
    grid_width: 21,
    grid_height: 21,
    tags: '["test", "hard", "premium"]',
  },
  inactivePuzzle: {
    title: 'Inactive Test Puzzle',
    description: 'An inactive test puzzle',
    filename: 'inactive-test-puzzle.json',
    original_filename: 'inactive-test-puzzle.json',
    file_path: '/test/puzzles/inactive-test-puzzle.json',
    tier: 'free',
    category: 'test',
    difficulty: 'medium',
    is_active: false,
    play_count: 0,
    completion_rate: 0.0,
    estimated_solve_time: 30,
    avg_solve_time: 0.0,
    best_score: 0,
    grid_width: 15,
    grid_height: 15,
    tags: '["test", "medium", "inactive"]',
  },
}

export const testRooms = {
  publicRoom: {
    id: 'test_room_public',
    roomCode: 'PUBLIC',
    name: 'Public Test Room',
    description: 'A public test room',
    maxPlayers: 4,
    isPrivate: false,
    allowSpectators: true,
    autoStart: false,
    timeLimit: null,
    difficulty: null,
    tags: '["test", "public", "multiplayer"]',
    status: 'WAITING',
    gridState: null,
    isPersistent: true,
    persistenceDays: 7,
    autoCleanup: true,
  },
  privateRoom: {
    id: 'test_room_private',
    roomCode: 'PRIVAT',
    name: 'Private Test Room',
    description: 'A private test room',
    maxPlayers: 4,
    isPrivate: true,
    password: 'testpassword',
    allowSpectators: false,
    autoStart: false,
    timeLimit: null,
    difficulty: null,
    tags: '["test", "private", "multiplayer"]',
    status: 'WAITING',
    gridState: null,
    isPersistent: true,
    persistenceDays: 7,
    autoCleanup: true,
  },
  activeRoom: {
    id: 'test_room_active',
    roomCode: 'ACTIVE',
    name: 'Active Test Room',
    description: 'An active test room',
    maxPlayers: 4,
    isPrivate: false,
    allowSpectators: true,
    autoStart: false,
    timeLimit: null,
    difficulty: null,
    tags: '["test", "active", "multiplayer"]',
    status: 'ACTIVE',
    gridState: '{"cells": [], "words": []}',
    isPersistent: true,
    persistenceDays: 7,
    autoCleanup: true,
  },
  completedRoom: {
    id: 'test_room_completed',
    roomCode: 'COMPLE',
    name: 'Completed Test Room',
    description: 'A completed test room',
    maxPlayers: 4,
    isPrivate: false,
    allowSpectators: true,
    autoStart: false,
    timeLimit: null,
    difficulty: null,
    tags: '["test", "completed", "multiplayer"]',
    status: 'COMPLETED',
    gridState: '{"cells": [], "words": []}',
    isPersistent: true,
    persistenceDays: 7,
    autoCleanup: true,
  },
}

export const testFeatureFlags = {
  disabledFlag: {
    name: 'test_disabled_flag',
    description: 'A disabled test feature flag',
    enabled: false,
    rolloutPercentage: 0,
    targetUsers: null,
    targetRoles: null,
    conditions: null,
    version: 1,
  },
  enabledFlag: {
    name: 'test_enabled_flag',
    description: 'An enabled test feature flag',
    enabled: true,
    rolloutPercentage: 100,
    targetUsers: null,
    targetRoles: null,
    conditions: null,
    version: 1,
  },
  rolloutFlag: {
    name: 'test_rollout_flag',
    description: 'A rollout test feature flag',
    enabled: true,
    rolloutPercentage: 50,
    targetUsers: null,
    targetRoles: ['FREE', 'PREMIUM'],
    conditions: null,
    version: 1,
  },
  targetedFlag: {
    name: 'test_targeted_flag',
    description: 'A targeted test feature flag',
    enabled: true,
    rolloutPercentage: 25,
    targetUsers: ['test_user_premium'],
    targetRoles: ['PREMIUM'],
    conditions: { minLevel: 5 },
    version: 1,
  },
}

export const testSystemConfigs = {
  privateConfig: {
    key: 'test_private_config',
    value: { test: true, private: true },
    description: 'A private test configuration',
    category: 'test',
    isPublic: false,
  },
  publicConfig: {
    key: 'test_public_config',
    value: { test: true, public: true },
    description: 'A public test configuration',
    category: 'public',
    isPublic: true,
  },
  featureConfig: {
    key: 'test_feature_config',
    value: { features: ['feature1', 'feature2'] },
    description: 'A feature test configuration',
    category: 'features',
    isPublic: false,
  },
  securityConfig: {
    key: 'test_security_config',
    value: { security: { enabled: true, level: 'high' } },
    description: 'A security test configuration',
    category: 'security',
    isPublic: false,
  },
}

export const testAchievements = {
  completionAchievement: {
    key: 'test_completion_achievement',
    name: 'Test Completion Achievement',
    description: 'Complete your first puzzle',
    category: 'COMPLETION',
    tier: 'BRONZE',
    points: 10,
    iconName: 'trophy',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 1 }),
    isSecret: false,
    order: 0,
  },
  speedAchievement: {
    key: 'test_speed_achievement',
    name: 'Test Speed Achievement',
    description: 'Complete a puzzle in under 5 minutes',
    category: 'SPEED',
    tier: 'SILVER',
    points: 25,
    iconName: 'zap',
    requirement: JSON.stringify({ type: 'completion_time', threshold: 300 }),
    isSecret: false,
    order: 1,
  },
  secretAchievement: {
    key: 'test_secret_achievement',
    name: 'Test Secret Achievement',
    description: 'A secret achievement',
    category: 'SPECIAL',
    tier: 'GOLD',
    points: 50,
    iconName: 'star',
    requirement: JSON.stringify({ type: 'secret', threshold: 1 }),
    isSecret: true,
    order: 2,
  },
}

export const testUserProgress = {
  incompleteProgress: {
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
  },
  completedProgress: {
    completedCells: '{"cells": [], "words": []}',
    hintsUsed: 2,
    isCompleted: true,
    lastPlayedAt: new Date(),
    completedAt: new Date(),
    completionTimeSeconds: 300,
    score: 1000,
    startedAt: new Date(Date.now() - 300000),
    timesPlayed: 1,
    bestTimeSeconds: 300,
    totalAccuracy: 95.0,
  },
  highScoreProgress: {
    completedCells: '{"cells": [], "words": []}',
    hintsUsed: 0,
    isCompleted: true,
    lastPlayedAt: new Date(),
    completedAt: new Date(),
    completionTimeSeconds: 180,
    score: 1500,
    startedAt: new Date(Date.now() - 180000),
    timesPlayed: 3,
    bestTimeSeconds: 180,
    totalAccuracy: 98.0,
  },
}

export const testNotifications = {
  friendRequest: {
    type: 'FRIEND_REQUEST',
    title: 'Friend Request',
    message: 'You have received a friend request',
    actionUrl: '/friends',
    metadata: { friendId: 'test_user_regular' },
    isRead: false,
  },
  roomInvite: {
    type: 'ROOM_INVITE',
    title: 'Room Invitation',
    message: 'You have been invited to join a room',
    actionUrl: '/rooms/test_room_public',
    metadata: { roomId: 'test_room_public', inviterId: 'test_user_admin' },
    isRead: false,
  },
  achievement: {
    type: 'ACHIEVEMENT',
    title: 'Achievement Unlocked',
    message: 'You have unlocked a new achievement',
    actionUrl: '/achievements',
    metadata: { achievementId: 'test_completion_achievement' },
    isRead: false,
  },
  system: {
    type: 'SYSTEM',
    title: 'System Notification',
    message: 'System maintenance scheduled',
    actionUrl: null,
    metadata: { maintenanceDate: '2024-01-01T00:00:00Z' },
    isRead: false,
  },
}

export const testFriendships = {
  pendingFriendship: {
    status: 'PENDING',
    initiatedBy: 'test_user_regular',
  },
  acceptedFriendship: {
    status: 'ACCEPTED',
    initiatedBy: 'test_user_regular',
  },
  rejectedFriendship: {
    status: 'REJECTED',
    initiatedBy: 'test_user_regular',
  },
  blockedFriendship: {
    status: 'BLOCKED',
    initiatedBy: 'test_user_regular',
  },
}

export const testRoomInvites = {
  pendingInvite: {
    status: 'PENDING',
    message: 'Join my room!',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  },
  acceptedInvite: {
    status: 'ACCEPTED',
    message: 'Join my room!',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  rejectedInvite: {
    status: 'REJECTED',
    message: 'Join my room!',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
  expiredInvite: {
    status: 'EXPIRED',
    message: 'Join my room!',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  },
}

export const testJoinRequests = {
  pendingRequest: {
    status: 'PENDING',
    message: 'Can I join your room?',
  },
  approvedRequest: {
    status: 'APPROVED',
    message: 'Can I join your room?',
  },
  rejectedRequest: {
    status: 'REJECTED',
    message: 'Can I join your room?',
  },
}

export const testUserStats = {
  newUserStats: {
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
  },
  activeUserStats: {
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
  },
  expertUserStats: {
    totalPuzzlesStarted: 100,
    totalPuzzlesCompleted: 95,
    totalPlayTime: 36000, // 10 hours
    averageAccuracy: 98.0,
    averageCompletionTime: 300.0, // 5 minutes
    currentStreak: 15,
    longestStreak: 30,
    lastPlayedDate: new Date(),
    totalScore: 50000,
    achievementPoints: 1000,
    globalRank: 5,
  },
}

export const testLeaderboardEntries = {
  weeklyEntry: {
    period: 'WEEKLY',
    scope: 'GLOBAL',
    scopeId: null,
    userName: 'Test User',
    userAvatar: null,
    metric: 'fastest_time',
    value: 300, // 5 minutes
    rank: 1,
    periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    periodEnd: new Date(),
  },
  monthlyEntry: {
    period: 'MONTHLY',
    scope: 'GLOBAL',
    scopeId: null,
    userName: 'Test User',
    userAvatar: null,
    metric: 'highest_score',
    value: 1500,
    rank: 5,
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    periodEnd: new Date(),
  },
  allTimeEntry: {
    period: 'ALL_TIME',
    scope: 'GLOBAL',
    scopeId: null,
    userName: 'Test User',
    userAvatar: null,
    metric: 'most_completed',
    value: 100,
    rank: 10,
    periodStart: new Date(0),
    periodEnd: new Date(),
  },
}

export const testABTests = {
  draftTest: {
    name: 'test_draft_ab_test',
    description: 'A draft A/B test',
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
  },
  activeTest: {
    name: 'test_active_ab_test',
    description: 'An active A/B test',
    status: 'ACTIVE',
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
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  },
  completedTest: {
    name: 'test_completed_ab_test',
    description: 'A completed A/B test',
    status: 'COMPLETED',
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
    startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  },
}

// Helper functions to create test data
export const createTestData = async () => {
  // Create users
  const users = await Promise.all([
    prisma.user.create({ data: testUsers.regularUser }),
    prisma.user.create({ data: testUsers.adminUser }),
    prisma.user.create({ data: testUsers.superAdminUser }),
    prisma.user.create({ data: testUsers.premiumUser }),
    prisma.user.create({ data: testUsers.suspendedUser }),
    prisma.user.create({ data: testUsers.bannedUser }),
  ])

  // Create puzzles
  const puzzles = await Promise.all([
    prisma.puzzle.create({ data: testPuzzles.freePuzzle }),
    prisma.puzzle.create({ data: testPuzzles.premiumPuzzle }),
    prisma.puzzle.create({ data: testPuzzles.inactivePuzzle }),
  ])

  // Create rooms
  const rooms = await Promise.all([
    prisma.multiplayerRoom.create({ 
      data: { 
        ...testRooms.publicRoom, 
        puzzleId: puzzles[0].id, 
        hostUserId: users[0].id 
      } 
    }),
    prisma.multiplayerRoom.create({ 
      data: { 
        ...testRooms.privateRoom, 
        puzzleId: puzzles[1].id, 
        hostUserId: users[1].id 
      } 
    }),
    prisma.multiplayerRoom.create({ 
      data: { 
        ...testRooms.activeRoom, 
        puzzleId: puzzles[0].id, 
        hostUserId: users[2].id 
      } 
    }),
    prisma.multiplayerRoom.create({ 
      data: { 
        ...testRooms.completedRoom, 
        puzzleId: puzzles[1].id, 
        hostUserId: users[3].id 
      } 
    }),
  ])

  // Create feature flags
  const featureFlags = await Promise.all([
    prisma.featureFlag.create({ 
      data: { 
        ...testFeatureFlags.disabledFlag, 
        createdBy: users[1].id 
      } 
    }),
    prisma.featureFlag.create({ 
      data: { 
        ...testFeatureFlags.enabledFlag, 
        createdBy: users[1].id 
      } 
    }),
    prisma.featureFlag.create({ 
      data: { 
        ...testFeatureFlags.rolloutFlag, 
        createdBy: users[2].id 
      } 
    }),
    prisma.featureFlag.create({ 
      data: { 
        ...testFeatureFlags.targetedFlag, 
        createdBy: users[2].id 
      } 
    }),
  ])

  // Create system configs
  const systemConfigs = await Promise.all([
    prisma.systemConfig.create({ 
      data: { 
        ...testSystemConfigs.privateConfig, 
        updatedBy: users[1].id 
      } 
    }),
    prisma.systemConfig.create({ 
      data: { 
        ...testSystemConfigs.publicConfig, 
        updatedBy: users[1].id 
      } 
    }),
    prisma.systemConfig.create({ 
      data: { 
        ...testSystemConfigs.featureConfig, 
        updatedBy: users[2].id 
      } 
    }),
    prisma.systemConfig.create({ 
      data: { 
        ...testSystemConfigs.securityConfig, 
        updatedBy: users[2].id 
      } 
    }),
  ])

  // Create achievements
  const achievements = await Promise.all([
    prisma.achievement.create({ data: testAchievements.completionAchievement }),
    prisma.achievement.create({ data: testAchievements.speedAchievement }),
    prisma.achievement.create({ data: testAchievements.secretAchievement }),
  ])

  return {
    users,
    puzzles,
    rooms,
    featureFlags,
    systemConfigs,
    achievements,
  }
}

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

export default {
  testUsers,
  testPuzzles,
  testRooms,
  testFeatureFlags,
  testSystemConfigs,
  testAchievements,
  testUserProgress,
  testNotifications,
  testFriendships,
  testRoomInvites,
  testJoinRequests,
  testUserStats,
  testLeaderboardEntries,
  testABTests,
  createTestData,
  cleanupTestData,
}