-- Create-only SQL migration for adding requirePasswordChange without applying automatically
-- Apply this on BOTH databases using MariaDB tools

ALTER TABLE `User`
  ADD COLUMN `requirePasswordChange` TINYINT(1) NOT NULL DEFAULT 0;

-- Optional: flag the super admin to require password change on next login
UPDATE `User`
SET `requirePasswordChange` = 1
WHERE email = 'superadmin@crossword.network';


