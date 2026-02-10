# MVP Single-Player Transition Plan

## Objective
Transition the Crossword.Network platform to a **Free Single-Player MVP**. This involves removing all multiplayer functionality, payment processing (Stripe), subscription management, and premium gating. The goal is to focus strictly on the core gameplay loop: a user solving a crossword puzzle solo.

## 1. MVP Scope Definition

### Core Features (Retained)
*   **User Accounts:** Sign up, login, profile management.
*   **Puzzle Library:** Access to all puzzles (previously tiered).
*   **Solo Puzzle Solving:**
    *   Interactive grid (EclipseCrossword integration).
    *   Clue list and navigation.
    *   **Unlimited Hints** for everyone.
    *   Progress saving (auto-save).
    *   Puzzle completion tracking.
*   **Admin Dashboard:** Puzzle uploads and user management (simplified).

### Features to Remove/Deprecate
*   **Multiplayer System:**
    *   Room creation, joining, and management.
    *   Socket.IO server and client integration.
    *   Real-time grid synchronization.
    *   Chat, presence, and spectator modes.
    *   "Team" or "Social" achievements.
    *   Room-related database models (to be ignored/deprecated in code).
*   **Payments & Subscriptions (Stripe):**
    *   Checkout flows, billing portal, webhooks.
    *   Premium/Free role distinction (all users treated as Premium/Full Access).
*   **UI/UX Elements:**
    *   "Lobby", "Multiplayer", "Create Room" navigation items.
    *   "Upgrade", "Pricing", "Billing" pages and buttons.
    *   Premium badges and locks.

## 2. Implementation Plan

### A. Dependency Cleanup
*   Uninstall `stripe`, `@stripe/stripe-js`, `socket.io`, `socket.io-client`.
*   Remove related environment variables (`STRIPE_*`, `NEXT_PUBLIC_SOCKET_URL`) from documentation/examples.

### B. Backend/Logic Updates
*   **Auth/Role System (`src/lib/auth.ts`, `src/lib/enhancedRoleSystem.ts`):**
    *   Simplify `isPremiumUser` to always return `true`.
    *   Remove room permission checks.
*   **API Routes (Deletion):**
    *   `src/app/api/stripe/*`
    *   `src/app/api/webhook/stripe/*`
    *   `src/app/api/multiplayer/*` (Recursive delete)
    *   `src/app/api/rooms/*` (If any exist separate from multiplayer)
    *   `src/app/api/presence/*`
*   **Server Entry Point (`server.js`):**
    *   Remove Socket.IO initialization and event handlers.
    *   Revert to a standard Next.js custom server or just use `next start` if custom server was only for Socket.IO.

### C. Frontend/UI Updates
*   **Navigation:** Remove "Multiplayer", "Pricing", "Billing", "Upgrade" links from Header/Sidebar.
*   **Pages (Deletion):**
    *   `src/app/multiplayer/*`
    *   `src/app/room/[roomCode]/*`
    *   `src/app/pricing/*`
    *   `src/app/billing/*` (if exists)
*   **Components (Deletion/Modification):**
    *   Delete `src/components/Multiplayer*`, `src/components/Room*`, `src/components/Spectator*`, `src/components/Chat*`.
    *   Update `src/components/HeroSection.tsx` to remove "Start/Join Room" CTAs; focus on "Play Now" (Solo).
    *   Update `src/components/puzzle/PuzzleArea.tsx` to remove multiplayer hooks/logic.
    *   Update `src/components/layouts/*`: Remove `DesktopMultiplayerLayout`, `MobileMultiplayerLayout`.

### D. Database
*   Keep existing schema to avoid complex migration issues during this phase, but application code will stop writing to `MultiplayerRoom`, `RoomParticipant`, `Subscription`, etc.

## 3. Verification Steps
1.  **Build:** Ensure the application builds without the removed dependencies.
2.  **Solo Play:** Verify a user can start and complete a puzzle with progress saving.
3.  **Navigation:** Verify no broken links to multiplayer/payment pages.
4.  **Admin:** Verify puzzle upload still works.
