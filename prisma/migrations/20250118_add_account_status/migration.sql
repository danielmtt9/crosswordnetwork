-- Add account status fields to User table
ALTER TABLE `User` ADD COLUMN `accountStatus` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE `User` ADD COLUMN `suspendedAt` DATETIME(3) NULL;
ALTER TABLE `User` ADD COLUMN `suspendedBy` VARCHAR(191) NULL;
ALTER TABLE `User` ADD COLUMN `suspensionReason` VARCHAR(500) NULL;
ALTER TABLE `User` ADD COLUMN `suspensionExpiresAt` DATETIME(3) NULL;

-- Add index for account status queries
CREATE INDEX `User_accountStatus_idx` ON `User`(`accountStatus`);
CREATE INDEX `User_suspendedAt_idx` ON `User`(`suspendedAt`);
