# Test Users for Development

This document contains test user credentials for local development and testing.

## Test User Credentials

### Free User (Limited Access)
- **Email:** `free@test.com`
- **Password:** `Test123!`
- **Role:** FREE
- **Subscription Status:** NONE
- **Access Level:** 
  - Can view puzzles
  - Limited multiplayer features (spectator only)
  - No premium features

### Premium User (Full Access)
- **Email:** `premium@test.com`
- **Password:** `Test123!`
- **Role:** PREMIUM
- **Subscription Status:** ACTIVE
- **Access Level:**
  - Full puzzle access
  - Can host multiplayer rooms
  - Can play in multiplayer rooms
  - All premium features enabled

## Creating/Recreating Test Users

To create or recreate these test users in your database:

```bash
npm run db:seed-test-users
```

This will:
- Create the users if they don't exist
- Update them if they already exist (using `upsert`)
- Hash the passwords securely with bcrypt

## Using Test Users for Chrome DevTools Testing

1. **Sign in with a test user:**
   - Navigate to `http://localhost:3004/signin`
   - Enter one of the test user credentials
   - Click "Sign in"

2. **Test multiplayer features:**
   - As Premium User: Can create and join rooms as host/player
   - As Free User: Can only join rooms as spectator

3. **Test different scenarios:**
   - Use Free User to test spectator mode
   - Use Premium User to test full features
   - Open multiple browser windows/profiles to test collaboration

## Browser DevTools Investigation

### Console Logs to Monitor

When signed in, check these logs in the browser console:

```javascript
// Puzzle loading
[RoomPage] Puzzle data loaded
[RoomPage] Puzzle content loaded
[PuzzleArea] Iframe loaded

// Clue extraction
[RoomPage] Extracting clues from iframe...
[RoomPage] Extracted clues: {object}

// Socket connection
[Socket] Connected, joining room...
[Socket] Successfully joined room
```

### React DevTools

If you have React DevTools installed:
1. Find the `RoomPage` component
2. Check these state values:
   - `clues`: Should have `across` and `down` arrays
   - `messages`: Should have chat messages
   - `puzzleContent`: Should have HTML string

### Network Tab

Monitor these API calls:
- `GET /api/multiplayer/rooms/{roomCode}`
- `GET /api/puzzles/{puzzleId}`
- `GET /api/puzzles/{puzzleId}/content`
- `POST /api/multiplayer/rooms/{roomId}/save`

## Security Note

⚠️ **IMPORTANT:** These are test credentials for local development only. Never use these passwords in production!
