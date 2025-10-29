# Tasks: Adaptive Puzzle Layout & Enhanced Communication System

Generated from: `tasks-0010-prd-adaptive-puzzle-layout.md`

## Relevant Files

### New Components
- `src/components/puzzle/CluesPanel.tsx` - Displays across/down clues with sticky headers and hover effects
- `src/components/puzzle/CluesPanel.test.tsx` - Unit tests for CluesPanel component
- `src/components/puzzle/PuzzleArea.tsx` - Wrapper for puzzle iframe with dynamic sizing
- `src/components/puzzle/PuzzleArea.test.tsx` - Unit tests for PuzzleArea component
- `src/components/puzzle/HintsMenu.tsx` - Dropdown menu (desktop) or FAB (mobile) for hints
- `src/components/puzzle/HintsMenu.test.tsx` - Unit tests for HintsMenu component
- `src/components/puzzle/SaveIndicator.tsx` - Visual indicator for auto-save status
- `src/components/puzzle/SaveIndicator.test.tsx` - Unit tests for SaveIndicator
- `src/components/puzzle/ProgressBar.tsx` - Puzzle completion progress display
- `src/components/puzzle/ProgressBar.test.tsx` - Unit tests for ProgressBar

### Layout Containers
- `src/components/layouts/AdaptiveLayout.tsx` - Main layout switcher component
- `src/components/layouts/AdaptiveLayout.test.tsx` - Unit tests for layout switching
- `src/components/layouts/DesktopMultiplayerLayout.tsx` - 3-column desktop multiplayer layout
- `src/components/layouts/DesktopSingleLayout.tsx` - 2-column desktop single player layout
- `src/components/layouts/MobileMultiplayerLayout.tsx` - Stacked mobile multiplayer with tabs
- `src/components/layouts/MobileSingleLayout.tsx` - Stacked mobile single player with tabs

### Hooks
- `src/hooks/useDeviceType.ts` - Detects mobile/tablet/desktop based on window width
- `src/hooks/useDeviceType.test.ts` - Unit tests for device detection
- `src/hooks/useGameMode.ts` - Detects single/multiplayer mode from room data
- `src/hooks/useGameMode.test.ts` - Unit tests for game mode detection
- `src/hooks/useAutoSave.ts` - Existing hook - needs enhancement for debouncing
- `src/hooks/useAutoSave.test.ts` - Enhanced tests for auto-save hook
- `src/hooks/useIframeMessage.ts` - Manages iframe ↔ parent communication
- `src/hooks/useIframeMessage.test.ts` - Unit tests for message handling

### Utilities
- `src/lib/layoutDetection.ts` - Layout detection utility functions
- `src/lib/layoutDetection.test.ts` - Unit tests for layout utilities
- `src/lib/iframeMessaging.ts` - PostMessage type definitions and validators
- `src/lib/iframeMessaging.test.ts` - Unit tests for messaging utilities

### Modified Files
- `src/app/room/[roomCode]/page.tsx` - Update to use adaptive layouts
- `src/app/puzzles/[id]/page.tsx` - Update for single player adaptive layout
- `src/lib/puzzleRenderers/EclipseCrosswordRenderer.tsx` - Already modified (iframe no-scroll)
- `src/lib/puzzleRenderers/bridges/eclipsecrossword-bridge.js` - Already modified (hide clues)

### Database Migration
- `prisma/migrations/[timestamp]_add_autosave_fields.sql` - Add auto-save tracking fields
- `prisma/schema.prisma` - Update UserProgress and MultiplayerRoom models

### API Routes
- `src/app/api/puzzles/[id]/save/route.ts` - Single player auto-save endpoint
- `src/app/api/puzzles/[id]/save/route.test.ts` - API tests for single player save
- `src/app/api/multiplayer/rooms/[roomCode]/save/route.ts` - Multiplayer auto-save endpoint
- `src/app/api/multiplayer/rooms/[roomCode]/save/route.test.ts` - API tests for multiplayer save

### Testing Utilities
- `tests/utils/mockIframeMessages.ts` - Mock postMessage events for testing
- `tests/utils/mockDeviceType.ts` - Mock window.innerWidth for responsive tests
- `tests/integration/adaptive-layout.test.tsx` - Integration tests for full layout system

### Notes

- Unit tests should be placed alongside code files (same directory)
- Run tests with: `npx jest` (all tests) or `npx jest [path/to/test]` (specific test)
- Use Chrome DevTools for performance profiling and responsive testing
- Use MariaDB MCP tool for database query optimization
- Use HTTP Fetch MCP tool to reference TypeScript documentation

---

## Tasks

### Phase 1: Layout System Foundation

- [ ] **1.0 Create Device Detection & Layout Utilities**
  - [ ] 1.1 Create `src/hooks/useDeviceType.ts` hook to detect mobile/tablet/desktop using window.innerWidth with Tailwind breakpoints (< 768 = mobile, < 1024 = tablet, >= 1024 = desktop)
  - [ ] 1.2 Add window resize event listener with cleanup in useDeviceType hook
  - [ ] 1.3 Create `src/hooks/useDeviceType.test.ts` with Jest tests for all device types (mock window.innerWidth)
  - [ ] 1.4 Create `src/hooks/useGameMode.ts` hook to detect single/multiplayer mode from room.participants.length
  - [ ] 1.5 Create `src/hooks/useGameMode.test.ts` with Jest tests for mode detection
  - [ ] 1.6 Create `src/lib/layoutDetection.ts` with utility functions for layout selection logic
  - [ ] 1.7 Create `src/lib/layoutDetection.test.ts` with comprehensive unit tests
  - [ ] 1.8 Reference TypeScript docs via HTTP Fetch MCP for useEffect cleanup patterns

- [ ] **2.0 Build Shared Components (CluesPanel, PuzzleArea, Hints)**
  - [ ] 2.1 Create `src/components/puzzle/` directory
  - [ ] 2.2 Build `CluesPanel.tsx` component with sticky headers, hover effects, and dark mode support (Across/Down sections)
  - [ ] 2.3 Add collapsible sections to CluesPanel using Accordion from shadcn/ui
  - [ ] 2.4 Create `CluesPanel.test.tsx` testing rendering, hover states, and accessibility
  - [ ] 2.5 Build `PuzzleArea.tsx` wrapper component for iframe with dynamic height handling
  - [ ] 2.6 Create `PuzzleArea.test.tsx` testing iframe loading and dimension updates
  - [ ] 2.7 Build `HintsMenu.tsx` with conditional rendering (DropdownMenu for desktop, FAB for mobile)
  - [ ] 2.8 Create `HintsMenu.test.tsx` testing both desktop and mobile variants
  - [ ] 2.9 Build `SaveIndicator.tsx` showing save status (saving/saved/error) with icons
  - [ ] 2.10 Create `SaveIndicator.test.tsx` testing all status states
  - [ ] 2.11 Build `ProgressBar.tsx` using Progress component from shadcn/ui
  - [ ] 2.12 Create `ProgressBar.test.tsx` testing progress calculations
  - [ ] 2.13 Test all components in Chrome DevTools with responsive device emulation

- [ ] **3.0 Implement Layout Container Components**
  - [ ] 3.1 Create `src/components/layouts/` directory
  - [ ] 3.2 Build `DesktopMultiplayerLayout.tsx` with 3-column grid (25%-50%-25%): Clues | Puzzle | Multiplayer Panel
  - [ ] 3.3 Build `DesktopSingleLayout.tsx` with 2-column grid (30%-70%): Clues | Puzzle
  - [ ] 3.4 Build `MobileMultiplayerLayout.tsx` with stacked layout and Tabs component (Clues | Chat | Players tabs)
  - [ ] 3.5 Build `MobileSingleLayout.tsx` with stacked layout and simple tabs (Across | Down)
  - [ ] 3.6 Build `AdaptiveLayout.tsx` main switcher using useDeviceType and useGameMode hooks
  - [ ] 3.7 Add layout transition animations using Framer Motion
  - [ ] 3.8 Create `AdaptiveLayout.test.tsx` testing layout switching logic for all 4 combinations
  - [ ] 3.9 Test layouts in Chrome DevTools using Device Mode (iPhone 12, iPad, Desktop 1920x1080)
  - [ ] 3.10 Verify no horizontal scrolling on any device size
  - [ ] 3.11 Ensure all panels scroll independently

- [ ] **4.0 Enhance Auto-Save System with Visual Indicators**
  - [ ] 4.1 Review existing `src/hooks/useAutoSave.ts` implementation
  - [ ] 4.2 Add debouncing logic (150ms) using useDebouncedCallback from use-debounce library
  - [ ] 4.3 Add time-based auto-save trigger (30 seconds) using setInterval
  - [ ] 4.4 Add saveStatus state ('saving' | 'saved' | 'error') to useAutoSave hook
  - [ ] 4.5 Add retry mechanism for failed saves (3 attempts with exponential backoff)
  - [ ] 4.6 Add offline detection and queue mechanism using navigator.onLine
  - [ ] 4.7 Update `useAutoSave.test.ts` with comprehensive tests for debouncing, retry, and offline scenarios
  - [ ] 4.8 Add localStorage backup for offline resilience in single-player mode
  - [ ] 4.9 Test auto-save performance using Chrome DevTools Network tab with throttling (Slow 3G)
  - [ ] 4.10 Verify save operations complete within 200ms target using Performance tab

- [ ] **5.0 Implement Enhanced Iframe Communication**
  - [ ] 5.1 Create `src/lib/iframeMessaging.ts` with TypeScript interfaces for all message types (ProgressEvent, CompletionEvent, ValidationEvent, etc.)
  - [ ] 5.2 Add message validation functions with origin checking and type guards
  - [ ] 5.3 Create `src/hooks/useIframeMessage.ts` hook to handle postMessage communication
  - [ ] 5.4 Add event listeners for all iframe → parent events (progress, complete, hint_used, letter_validated, suggest_hint, dimensions, wordlist, word_revealed, STATE_LOADED)
  - [ ] 5.5 Add functions to send parent → iframe commands (GET_STATE, LOAD_STATE, SET_PUZZLE_ID, reveal_letter, reveal_word)
  - [ ] 5.6 Add message acknowledgment and retry logic for critical messages
  - [ ] 5.7 Add event logging for debugging (conditional on debug mode)
  - [ ] 5.8 Create `iframeMessaging.test.ts` with unit tests for validation and type guards
  - [ ] 5.9 Create `useIframeMessage.test.ts` with tests for all message types
  - [ ] 5.10 Create `tests/utils/mockIframeMessages.ts` helper for testing
  - [ ] 5.11 Test message latency in Chrome DevTools Console (should be < 50ms)
  - [ ] 5.12 Verify LOAD_STATE functionality works correctly (check STATE_LOADED confirmation)

- [ ] **6.0 Create Database Migration & API Endpoints**
  - [ ] 6.1 Update `prisma/schema.prisma` to add UserProgress fields (accuracy, autoSaveCount, lastAutoSave, saveHistory)
  - [ ] 6.2 Update MultiplayerRoom model to add fields (lastSyncedAt, autoSaveEnabled, saveInterval)
  - [ ] 6.3 Run `npx prisma migrate dev --name add_autosave_fields` to create migration
  - [ ] 6.4 Test migration rollback and re-apply to ensure it's idempotent
  - [ ] 6.5 Create `src/app/api/puzzles/[id]/save/route.ts` POST endpoint for single-player auto-save
  - [ ] 6.6 Add request validation and error handling to save endpoint
  - [ ] 6.7 Create `src/app/api/puzzles/[id]/save/route.test.ts` with Jest tests
  - [ ] 6.8 Create `src/app/api/multiplayer/rooms/[roomCode]/save/route.ts` POST endpoint for multiplayer auto-save
  - [ ] 6.9 Add Socket.IO broadcast for multiplayer save to sync all participants
  - [ ] 6.10 Create `src/app/api/multiplayer/rooms/[roomCode]/save/route.test.ts` with Jest tests
  - [ ] 6.11 Use MariaDB MCP tool to run EXPLAIN on save queries and verify index usage
  - [ ] 6.12 Add database indexes if needed: `@@index([lastAutoSave])` on UserProgress
  - [ ] 6.13 Test concurrent save operations using MariaDB transactions
  - [ ] 6.14 Verify save query performance < 200ms using MariaDB MCP tool

- [ ] **7.0 Integrate Layouts into Room & Puzzle Pages**
  - [ ] 7.1 Update `src/app/room/[roomCode]/page.tsx` to import and use AdaptiveLayout
  - [ ] 7.2 Move existing clues display from room page into CluesPanel component
  - [ ] 7.3 Move hints section into HintsMenu component
  - [ ] 7.4 Add SaveIndicator to room page header
  - [ ] 7.5 Add ProgressBar to room page header
  - [ ] 7.6 Wire up auto-save to trigger on cell updates from MultiplayerGrid
  - [ ] 7.7 Update `src/app/puzzles/[id]/page.tsx` for single-player adaptive layout
  - [ ] 7.8 Ensure clue extraction from iframe works correctly (existing __ecwGetClues function)
  - [ ] 7.9 Test full room flow: create room → join → solve → verify auto-save → reload page → verify state restored
  - [ ] 7.10 Test single-player flow: start puzzle → solve → auto-save → reload → verify state restored
  - [ ] 7.11 Test in Chrome DevTools on all device sizes and verify layout switching
  - [ ] 7.12 Verify iframe has no scrollbar and fits content perfectly

- [ ] **8.0 Testing, Performance Optimization & Documentation**
  - [ ] 8.1 Run full test suite: `npx jest` and ensure all tests pass
  - [ ] 8.2 Run test coverage report: `npx jest --coverage` and aim for > 80% coverage
  - [ ] 8.3 Create `tests/integration/adaptive-layout.test.tsx` for end-to-end layout testing
  - [ ] 8.4 Test auto-save reliability: simulate 100 saves and verify success rate > 99.9%
  - [ ] 8.5 Use Chrome DevTools Performance tab to profile layout switch time (target < 100ms)
  - [ ] 8.6 Use Chrome DevTools Memory tab to check for memory leaks during extended use
  - [ ] 8.7 Test offline functionality: disconnect network and verify queue mechanism
  - [ ] 8.8 Test multiplayer sync: open 2 browser tabs, verify real-time state sync
  - [ ] 8.9 Add React.memo to CluesPanel, PuzzleArea, and other components to prevent unnecessary re-renders
  - [ ] 8.10 Add CSS containment properties for layout performance (`contain: layout style paint`)
  - [ ] 8.11 Update component JSDoc comments with TypeScript documentation
  - [ ] 8.12 Create user-facing documentation for new layout system (if needed)
  - [ ] 8.13 Run lighthouse audit and ensure performance score > 90
  - [ ] 8.14 Final cross-browser testing (Chrome, Firefox, Safari, Edge)
  - [ ] 8.15 Final mobile device testing on real devices (iOS, Android)

---

## Implementation Notes

### Testing Protocol
- After completing each sub-task, mark it `[x]`
- When all sub-tasks in a parent task are complete:
  1. Run full test suite: `npx jest`
  2. If tests pass, stage changes: `git add .`
  3. Clean up temporary files and code
  4. Commit with conventional format: `git commit -m "feat: [task description]" -m "- [key changes]" -m "Related to task [number]"`
  5. Mark parent task `[x]`
- Stop after each sub-task and wait for user approval before proceeding

### MCP Tools Usage
- **HTTP Fetch**: Reference TypeScript docs at https://www.typescriptlang.org/docs/handbook/react.html
- **MariaDB**: Use EXPLAIN and SHOW INDEX commands to optimize queries
- **Chrome DevTools**: Use Device Mode, Performance tab, Network tab for testing

### Key Performance Targets
- Layout switch time: < 100ms
- Auto-save latency: < 200ms
- Message latency: < 50ms
- Save query performance: < 200ms
- Test coverage: > 80%
- Auto-save success rate: > 99.9%
