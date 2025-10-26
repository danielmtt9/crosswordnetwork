-- Add feature flags table
CREATE TABLE `FeatureFlag` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT,
  `enabled` BOOLEAN NOT NULL DEFAULT false,
  `rolloutPercentage` INTEGER NOT NULL DEFAULT 0,
  `targetUsers` JSON,
  `targetRoles` JSON,
  `conditions` JSON,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL DEFAULT 1,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `FeatureFlag_name_key`(`name`),
  INDEX `FeatureFlag_enabled_idx`(`enabled`),
  INDEX `FeatureFlag_createdBy_idx`(`createdBy`)
);

-- Add feature flag history table for rollback capabilities
CREATE TABLE `FeatureFlagHistory` (
  `id` VARCHAR(191) NOT NULL,
  `featureFlagId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `previousState` JSON,
  `newState` JSON,
  `actorUserId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `FeatureFlagHistory_featureFlagId_idx`(`featureFlagId`),
  INDEX `FeatureFlagHistory_actorUserId_idx`(`actorUserId`),
  INDEX `FeatureFlagHistory_createdAt_idx`(`createdAt`)
);

-- Add system configuration table
CREATE TABLE `SystemConfig` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `value` JSON NOT NULL,
  `description` TEXT,
  `category` VARCHAR(191) NOT NULL DEFAULT 'general',
  `isPublic` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `updatedBy` VARCHAR(191) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `SystemConfig_key_key`(`key`),
  INDEX `SystemConfig_category_idx`(`category`),
  INDEX `SystemConfig_isPublic_idx`(`isPublic`)
);
