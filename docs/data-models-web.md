# Data Models - Web Application

## Overview
The application uses MySQL (via Prisma ORM) for data persistence.

## Core Models

### User Management
- **User**: Core user profile (Auth, Role, Status).
- **Account**: OAuth accounts (NextAuth).
- **Session**: User sessions.
- **VerificationToken**: Email verification tokens.
- **PasswordResetToken**: Password reset tokens.
- **LoginAttempt**: Security logging.

### Puzzles
- **Puzzle**: Crossword puzzle metadata and file paths.
- **PuzzleClueCache**: Cached parsed clues for performance.
- **ClueCacheStats**: Statistics on clue parsing.
- **ClueParseLog**: Debugging logs for parser.

### Gameplay
- **UserProgress**: Tracks individual user progress on puzzles (completion, score, time).
- **UserStats**: Aggregated user statistics (streaks, total score).

### Multiplayer
- **MultiplayerRoom**: Game room state (Host, Status, Config).
- **RoomParticipant**: Users in a room (Role, Cursor, Progress).
- **RoomMessage**: Chat messages.
- **RoomMutedUser**: Moderation - Muted users.
- **RoomBannedUser**: Moderation - Banned users.
- **RoomStateVersion**: Game state versioning (for sync/rollback).
- **RoomInvite**: Invitations to rooms.
- **JoinRequest**: Requests to join private rooms.

### Engagement & Gamification
- **Achievement**: Achievement definitions.
- **UserAchievement**: Achievements earned by users.
- **LeaderboardEntry**: Ranked entries for leaderboards.
- **Notification**: User notifications.
- **Friendship**: Social graph.

### System
- **FeatureFlag**: Dynamic feature toggling.
- **FeatureFlagHistory**: Audit log for flags.
- **SystemConfig**: Dynamic system configuration.
- **ABTest**: A/B testing framework.
- **ABTestResult**: Results from A/B tests.
- **AuditLog**: General administrative audit logs.
- **WaitlistEntry**: Pre-launch waitlist.

## Enums
- **RoomStatus**: WAITING, ACTIVE, COMPLETED, EXPIRED
- **ParticipantRole**: HOST, PLAYER, SPECTATOR
- **AchievementCategory**: COMPLETION, SPEED, STREAK, ACCURACY, SOCIAL, MASTERY, SPECIAL
- **AchievementTier**: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND
- **LeaderboardPeriod**: DAILY, WEEKLY, MONTHLY, ALL_TIME
- **LeaderboardScope**: GLOBAL, PUZZLE, DIFFICULTY
