-- Add enhanced clue caching system for puzzles
-- This enables database-first clue loading with version tracking

-- Create puzzle_clue_cache table
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
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `puzzle_clue_cache_puzzleId_fileHash_key`(`puzzleId`, `fileHash`),
  INDEX `puzzle_clue_cache_puzzleId_idx`(`puzzleId`),
  INDEX `puzzle_clue_cache_fileHash_idx`(`fileHash`),
  INDEX `puzzle_clue_cache_isValid_idx`(`isValid`),
  INDEX `puzzle_clue_cache_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create clue_cache_stats table for monitoring
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
  
  PRIMARY KEY (`id`),
  UNIQUE INDEX `clue_cache_stats_date_key`(`date`),
  INDEX `clue_cache_stats_date_idx`(`date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create clue_parse_log table for debugging
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
  
  PRIMARY KEY (`id`),
  INDEX `clue_parse_log_puzzleId_idx`(`puzzleId`),
  INDEX `clue_parse_log_action_idx`(`action`),
  INDEX `clue_parse_log_createdAt_idx`(`createdAt`),
  INDEX `clue_parse_log_success_idx`(`success`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key constraint
ALTER TABLE `puzzle_clue_cache` 
  ADD CONSTRAINT `puzzle_clue_cache_puzzleId_fkey` 
  FOREIGN KEY (`puzzleId`) 
  REFERENCES `puzzles`(`id`) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;
