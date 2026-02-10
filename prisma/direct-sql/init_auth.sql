-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'FREE',
    `subscriptionStatus` VARCHAR(191) NOT NULL DEFAULT 'TRIAL',
    `trialEndsAt` DATETIME(3) NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `stripeSubscriptionId` VARCHAR(191) NULL,
    `stripePriceId` VARCHAR(191) NULL,
    `stripeCurrentPeriodEnd` DATETIME(3) NULL,
    `requirePasswordChange` BOOLEAN NOT NULL DEFAULT false,
    `accountStatus` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `suspendedAt` DATETIME(3) NULL,
    `suspendedBy` VARCHAR(191) NULL,
    `suspensionReason` VARCHAR(500) NULL,
    `suspensionExpiresAt` DATETIME(3) NULL,
    `twoFactorSecret` VARCHAR(191) NULL,
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `twoFactorBackupCodes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_stripeCustomerId_key`(`stripeCustomerId`),
    UNIQUE INDEX `User_stripeSubscriptionId_key`(`stripeSubscriptionId`),
    INDEX `User_accountStatus_idx`(`accountStatus`),
    INDEX `User_suspendedAt_idx`(`suspendedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureFlag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `rolloutPercentage` INTEGER NOT NULL DEFAULT 0,
    `targetUsers` LONGTEXT NULL,
    `targetRoles` LONGTEXT NULL,
    `conditions` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `FeatureFlag_name_key`(`name`),
    INDEX `FeatureFlag_enabled_idx`(`enabled`),
    INDEX `FeatureFlag_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeatureFlagHistory` (
    `id` VARCHAR(191) NOT NULL,
    `featureFlagId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `previousState` LONGTEXT NULL,
    `newState` LONGTEXT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeatureFlagHistory_featureFlagId_idx`(`featureFlagId`),
    INDEX `FeatureFlagHistory_actorUserId_idx`(`actorUserId`),
    INDEX `FeatureFlagHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemConfig` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'general',
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `SystemConfig_key_key`(`key`),
    INDEX `SystemConfig_category_idx`(`category`),
    INDEX `SystemConfig_isPublic_idx`(`isPublic`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ABTest` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `variants` LONGTEXT NOT NULL,
    `targetAudience` LONGTEXT NOT NULL,
    `metrics` LONGTEXT NOT NULL,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ABTest_name_key`(`name`),
    INDEX `ABTest_status_idx`(`status`),
    INDEX `ABTest_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ABTestResult` (
    `id` VARCHAR(191) NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `variant` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `conversionEvents` LONGTEXT NOT NULL DEFAULT '[]',
    `metrics` LONGTEXT NOT NULL DEFAULT '{}',

    INDEX `ABTestResult_testId_idx`(`testId`),
    INDEX `ABTestResult_userId_idx`(`userId`),
    INDEX `ABTestResult_assignedAt_idx`(`assignedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    INDEX `Account_userId_fkey`(`userId`),
    UNIQUE INDEX `Account_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Session_sessionToken_key`(`sessionToken`),
    INDEX `Session_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationToken` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VerificationToken_token_key`(`token`),
    UNIQUE INDEX `VerificationToken_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_token_key`(`token`),
    INDEX `PasswordResetToken_userId_fkey`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `puzzles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `tier` VARCHAR(10) NULL,
    `category` VARCHAR(100) NULL,
    `difficulty` VARCHAR(10) NULL,
    `uploaded_by` VARCHAR(191) NULL,
    `upload_date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `is_active` BOOLEAN NULL DEFAULT true,
    `play_count` INTEGER NULL DEFAULT 0,
    `completion_rate` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `estimated_solve_time` INTEGER NULL DEFAULT 15,
    `avg_solve_time` DECIMAL(5, 2) NULL DEFAULT 0.00,
    `best_score` INTEGER NULL DEFAULT 0,
    `grid_width` INTEGER NULL,
    `grid_height` INTEGER NULL,
    `tags` TEXT NULL,
    `clues` LONGTEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `puzzleId` INTEGER NOT NULL,
    `completedCells` TEXT NULL,
    `hintsUsed` INTEGER NOT NULL DEFAULT 0,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `lastPlayedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `completionTimeSeconds` INTEGER NULL,
    `score` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `timesPlayed` INTEGER NOT NULL DEFAULT 1,
    `bestTimeSeconds` INTEGER NULL,
    `totalAccuracy` DOUBLE NULL DEFAULT 100,
    `autoSaveCount` INTEGER NOT NULL DEFAULT 0,
    `lastAutoSave` DATETIME(3) NULL,
    `saveHistory` LONGTEXT NULL,

    INDEX `user_progress_lastAutoSave_idx`(`lastAutoSave`),
    UNIQUE INDEX `user_progress_userId_puzzleId_key`(`userId`, `puzzleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `before` TEXT NULL,
    `after` TEXT NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_actorUserId_idx`(`actorUserId`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `multiplayer_rooms` (
    `id` VARCHAR(191) NOT NULL,
    `roomCode` CHAR(6) NOT NULL,
    `name` VARCHAR(100) NULL,
    `description` VARCHAR(200) NULL,
    `puzzleId` INTEGER NOT NULL,
    `hostUserId` VARCHAR(191) NOT NULL,
    `maxPlayers` INTEGER NOT NULL DEFAULT 4,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `password` VARCHAR(255) NULL,
    `allowSpectators` BOOLEAN NOT NULL DEFAULT true,
    `autoStart` BOOLEAN NOT NULL DEFAULT false,
    `timeLimit` INTEGER NULL,
    `difficulty` VARCHAR(20) NULL,
    `tags` TEXT NULL,
    `status` ENUM('WAITING', 'ACTIVE', 'COMPLETED', 'EXPIRED') NOT NULL DEFAULT 'WAITING',
    `gridState` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `autoCleanup` BOOLEAN NOT NULL DEFAULT true,
    `isPersistent` BOOLEAN NOT NULL DEFAULT true,
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `persistenceDays` INTEGER NOT NULL DEFAULT 7,
    `lastSyncedAt` DATETIME(3) NULL,
    `autoSaveEnabled` BOOLEAN NOT NULL DEFAULT true,
    `saveInterval` INTEGER NOT NULL DEFAULT 30000,

    UNIQUE INDEX `multiplayer_rooms_roomCode_key`(`roomCode`),
    INDEX `multiplayer_rooms_roomCode_idx`(`roomCode`),
    INDEX `multiplayer_rooms_status_idx`(`status`),
    INDEX `multiplayer_rooms_hostUserId_idx`(`hostUserId`),
    INDEX `multiplayer_rooms_createdAt_idx`(`createdAt`),
    INDEX `multiplayer_rooms_puzzleId_fkey`(`puzzleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_participants` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('HOST', 'PLAYER', 'SPECTATOR') NOT NULL DEFAULT 'PLAYER',
    `displayName` VARCHAR(100) NOT NULL,
    `avatarUrl` VARCHAR(255) NULL,
    `cursorPosition` VARCHAR(20) NULL,
    `completedCells` TEXT NULL,
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isOnline` BOOLEAN NOT NULL DEFAULT true,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,

    INDEX `room_participants_roomId_idx`(`roomId`),
    INDEX `room_participants_userId_idx`(`userId`),
    INDEX `room_participants_lastActiveAt_idx`(`lastActiveAt`),
    UNIQUE INDEX `room_participants_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_messages` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `content` VARCHAR(500) NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'text',
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedBy` VARCHAR(100) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `room_messages_roomId_idx`(`roomId`),
    INDEX `room_messages_createdAt_idx`(`createdAt`),
    INDEX `room_messages_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_muted_users` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `mutedBy` VARCHAR(191) NOT NULL,
    `mutedByUserName` VARCHAR(100) NOT NULL,
    `mutedUntil` DATETIME(3) NOT NULL,
    `reason` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_muted_users_roomId_idx`(`roomId`),
    INDEX `room_muted_users_userId_idx`(`userId`),
    INDEX `room_muted_users_mutedUntil_idx`(`mutedUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_banned_users` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `bannedBy` VARCHAR(191) NOT NULL,
    `bannedByUserName` VARCHAR(100) NOT NULL,
    `bannedUntil` DATETIME(3) NOT NULL,
    `reason` VARCHAR(200) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_banned_users_roomId_idx`(`roomId`),
    INDEX `room_banned_users_userId_idx`(`userId`),
    INDEX `room_banned_users_bannedUntil_idx`(`bannedUntil`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_state_versions` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `stateData` TEXT NOT NULL,
    `version` INTEGER NOT NULL,
    `checksum` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_state_versions_roomId_idx`(`roomId`),
    INDEX `room_state_versions_createdAt_idx`(`createdAt`),
    INDEX `room_state_versions_version_idx`(`version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `achievements` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` VARCHAR(300) NULL,
    `category` ENUM('COMPLETION', 'SPEED', 'STREAK', 'ACCURACY', 'SOCIAL', 'MASTERY', 'SPECIAL') NOT NULL,
    `tier` ENUM('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND') NOT NULL DEFAULT 'BRONZE',
    `points` INTEGER NOT NULL DEFAULT 0,
    `iconName` VARCHAR(50) NOT NULL,
    `requirement` TEXT NOT NULL,
    `isSecret` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `achievements_key_key`(`key`),
    INDEX `achievements_category_idx`(`category`),
    INDEX `achievements_tier_idx`(`tier`),
    INDEX `achievements_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_achievements` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `achievementId` VARCHAR(191) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `earnedAt` DATETIME(3) NULL,
    `notified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `user_achievements_userId_idx`(`userId`),
    INDEX `user_achievements_earnedAt_idx`(`earnedAt`),
    INDEX `user_achievements_achievementId_fkey`(`achievementId`),
    UNIQUE INDEX `user_achievements_userId_achievementId_key`(`userId`, `achievementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leaderboard_entries` (
    `id` VARCHAR(191) NOT NULL,
    `period` ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME') NOT NULL,
    `scope` ENUM('GLOBAL', 'PUZZLE', 'DIFFICULTY') NOT NULL,
    `scopeId` VARCHAR(50) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `userName` VARCHAR(100) NOT NULL,
    `userAvatar` VARCHAR(255) NULL,
    `metric` VARCHAR(50) NOT NULL,
    `value` INTEGER NOT NULL,
    `rank` INTEGER NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `computedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `leaderboard_entries_period_scope_metric_rank_idx`(`period`, `scope`, `metric`, `rank`),
    INDEX `leaderboard_entries_userId_idx`(`userId`),
    INDEX `leaderboard_entries_periodStart_periodEnd_idx`(`periodStart`, `periodEnd`),
    UNIQUE INDEX `leaderboard_entries_period_scope_scopeId_metric_userId_key`(`period`, `scope`, `scopeId`, `metric`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_stats` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `totalPuzzlesStarted` INTEGER NOT NULL DEFAULT 0,
    `totalPuzzlesCompleted` INTEGER NOT NULL DEFAULT 0,
    `totalPlayTime` INTEGER NOT NULL DEFAULT 0,
    `averageAccuracy` DOUBLE NOT NULL DEFAULT 100,
    `averageCompletionTime` DOUBLE NOT NULL DEFAULT 0,
    `currentStreak` INTEGER NOT NULL DEFAULT 0,
    `longestStreak` INTEGER NOT NULL DEFAULT 0,
    `lastPlayedDate` DATETIME(3) NULL,
    `totalScore` INTEGER NOT NULL DEFAULT 0,
    `achievementPoints` INTEGER NOT NULL DEFAULT 0,
    `globalRank` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_stats_userId_key`(`userId`),
    INDEX `user_stats_globalRank_idx`(`globalRank`),
    INDEX `user_stats_totalScore_idx`(`totalScore`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `actionUrl` VARCHAR(191) NULL,
    `metadata` LONGTEXT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `friendships` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `friendId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `initiatedBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `friendships_friendId_fkey`(`friendId`),
    UNIQUE INDEX `friendships_userId_friendId_key`(`userId`, `friendId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `room_invites` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `inviteeId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `message` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `room_invites_invitedById_fkey`(`invitedById`),
    INDEX `room_invites_inviteeId_fkey`(`inviteeId`),
    UNIQUE INDEX `room_invites_roomId_inviteeId_key`(`roomId`, `inviteeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `join_requests` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `message` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `join_requests_userId_fkey`(`userId`),
    UNIQUE INDEX `join_requests_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `puzzle_clue_cache` (
    `id` VARCHAR(191) NOT NULL,
    `puzzleId` INTEGER NOT NULL,
    `fileHash` VARCHAR(64) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `acrossClues` LONGTEXT NOT NULL,
    `downClues` LONGTEXT NOT NULL,
    `metadata` LONGTEXT NULL,
    `sourceType` VARCHAR(20) NOT NULL DEFAULT 'iframe',
    `parseTimeMs` INTEGER NULL,
    `isValid` BOOLEAN NOT NULL DEFAULT true,
    `validatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `puzzle_clue_cache_puzzleId_idx`(`puzzleId`),
    INDEX `puzzle_clue_cache_fileHash_idx`(`fileHash`),
    INDEX `puzzle_clue_cache_isValid_idx`(`isValid`),
    INDEX `puzzle_clue_cache_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `puzzle_clue_cache_puzzleId_fileHash_key`(`puzzleId`, `fileHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clue_cache_stats` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `cacheHits` INTEGER NOT NULL DEFAULT 0,
    `cacheMisses` INTEGER NOT NULL DEFAULT 0,
    `iframeParses` INTEGER NOT NULL DEFAULT 0,
    `avgParseTimeMs` DECIMAL(10, 2) NULL,
    `totalRefreshes` INTEGER NOT NULL DEFAULT 0,
    `errors` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clue_cache_stats_date_key`(`date`),
    INDEX `clue_cache_stats_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clue_parse_log` (
    `id` VARCHAR(191) NOT NULL,
    `puzzleId` INTEGER NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `source` VARCHAR(20) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `durationMs` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `metadata` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `clue_parse_log_puzzleId_idx`(`puzzleId`),
    INDEX `clue_parse_log_action_idx`(`action`),
    INDEX `clue_parse_log_createdAt_idx`(`createdAt`),
    INDEX `clue_parse_log_success_idx`(`success`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WaitlistEntry` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `WaitlistEntry_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_logs` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `template` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `openedAt` DATETIME(3) NULL,
    `clickedAt` DATETIME(3) NULL,
    `bouncedAt` DATETIME(3) NULL,
    `bounceType` VARCHAR(191) NULL,
    `bounceReason` TEXT NULL,
    `unsubscribedAt` DATETIME(3) NULL,
    `userAgent` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,

    UNIQUE INDEX `email_logs_messageId_key`(`messageId`),
    INDEX `email_logs_recipient_idx`(`recipient`),
    INDEX `email_logs_status_idx`(`status`),
    INDEX `email_logs_template_idx`(`template`),
    INDEX `email_logs_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_engagements` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `url` TEXT NULL,
    `userAgent` TEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `details` JSON NULL,

    INDEX `email_engagements_messageId_idx`(`messageId`),
    INDEX `email_engagements_eventType_idx`(`eventType`),
    INDEX `email_engagements_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_security_logs` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `recipient` VARCHAR(191) NOT NULL,
    `details` JSON NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_security_logs_recipient_idx`(`recipient`),
    INDEX `email_security_logs_eventType_idx`(`eventType`),
    INDEX `email_security_logs_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `email_verifications_token_key`(`token`),
    INDEX `email_verifications_userId_idx`(`userId`),
    INDEX `email_verifications_token_idx`(`token`),
    INDEX `email_verifications_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeatureFlagHistory` ADD CONSTRAINT `FeatureFlagHistory_featureFlagId_fkey` FOREIGN KEY (`featureFlagId`) REFERENCES `FeatureFlag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ABTestResult` ADD CONSTRAINT `ABTestResult_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `ABTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_progress` ADD CONSTRAINT `user_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `multiplayer_rooms` ADD CONSTRAINT `multiplayer_rooms_hostUserId_fkey` FOREIGN KEY (`hostUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `multiplayer_rooms` ADD CONSTRAINT `multiplayer_rooms_puzzleId_fkey` FOREIGN KEY (`puzzleId`) REFERENCES `puzzles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_participants` ADD CONSTRAINT `room_participants_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_messages` ADD CONSTRAINT `room_messages_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_muted_users` ADD CONSTRAINT `room_muted_users_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_banned_users` ADD CONSTRAINT `room_banned_users_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_state_versions` ADD CONSTRAINT `room_state_versions_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_achievementId_fkey` FOREIGN KEY (`achievementId`) REFERENCES `achievements`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_achievements` ADD CONSTRAINT `user_achievements_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_friendId_fkey` FOREIGN KEY (`friendId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_invites` ADD CONSTRAINT `room_invites_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_invites` ADD CONSTRAINT `room_invites_inviteeId_fkey` FOREIGN KEY (`inviteeId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `room_invites` ADD CONSTRAINT `room_invites_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `join_requests` ADD CONSTRAINT `join_requests_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `multiplayer_rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `join_requests` ADD CONSTRAINT `join_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `puzzle_clue_cache` ADD CONSTRAINT `puzzle_clue_cache_puzzleId_fkey` FOREIGN KEY (`puzzleId`) REFERENCES `puzzles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

