-- AddTwoFactorAuth
ALTER TABLE `User` ADD COLUMN `twoFactorSecret` VARCHAR(191) NULL,
ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `twoFactorBackupCodes` TEXT NULL;
