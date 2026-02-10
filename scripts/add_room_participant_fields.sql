-- Add completedCells and lastActiveAt fields to room_participants table
ALTER TABLE `room_participants` 
ADD COLUMN `completedCells` TEXT NULL AFTER `cursorPosition`,
ADD COLUMN `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `completedCells`;

-- Add index on lastActiveAt
CREATE INDEX `room_participants_lastActiveAt_idx` ON `room_participants`(`lastActiveAt`);
