-- Add auto-save fields to user_progress table
ALTER TABLE `user_progress` ADD COLUMN `autoSaveCount` INT NOT NULL DEFAULT 0;
ALTER TABLE `user_progress` ADD COLUMN `lastAutoSave` DATETIME(3) NULL;
ALTER TABLE `user_progress` ADD COLUMN `saveHistory` JSON NULL;

-- Add index for auto-save queries
CREATE INDEX `user_progress_lastAutoSave_idx` ON `user_progress`(`lastAutoSave`);

-- Add auto-save fields to multiplayer_rooms table
ALTER TABLE `multiplayer_rooms` ADD COLUMN `lastSyncedAt` DATETIME(3) NULL;
ALTER TABLE `multiplayer_rooms` ADD COLUMN `autoSaveEnabled` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `multiplayer_rooms` ADD COLUMN `saveInterval` INT NOT NULL DEFAULT 30000;
