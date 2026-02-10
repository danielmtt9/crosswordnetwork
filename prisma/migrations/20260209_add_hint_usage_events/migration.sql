-- Add hint usage events for per-hour hint rate limiting

CREATE TABLE `hint_usage_events` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `guestId` VARCHAR(191) NULL,
  `hintType` ENUM('letter', 'word') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `hint_usage_events_userId_hintType_createdAt_idx`(`userId`, `hintType`, `createdAt`),
  INDEX `hint_usage_events_guestId_hintType_createdAt_idx`(`guestId`, `hintType`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `hint_usage_events`
  ADD CONSTRAINT `hint_usage_events_userId_fkey`
  FOREIGN KEY (`userId`)
  REFERENCES `User`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

