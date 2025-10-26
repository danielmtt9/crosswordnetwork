-- Add A/B testing tables
CREATE TABLE `ABTest` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `variants` JSON NOT NULL,
  `targetAudience` JSON NOT NULL,
  `metrics` JSON NOT NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `createdBy` VARCHAR(191) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `ABTest_name_key`(`name`),
  INDEX `ABTest_status_idx`(`status`),
  INDEX `ABTest_createdBy_idx`(`createdBy`)
);

CREATE TABLE `ABTestResult` (
  `id` VARCHAR(191) NOT NULL,
  `testId` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `variant` VARCHAR(191) NOT NULL,
  `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `conversionEvents` JSON NOT NULL DEFAULT '[]',
  `metrics` JSON NOT NULL DEFAULT '{}',

  PRIMARY KEY (`id`),
  INDEX `ABTestResult_testId_idx`(`testId`),
  INDEX `ABTestResult_userId_idx`(`userId`),
  INDEX `ABTestResult_assignedAt_idx`(`assignedAt`)
);

-- Add foreign key constraint
ALTER TABLE `ABTestResult` ADD CONSTRAINT `ABTestResult_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `ABTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
