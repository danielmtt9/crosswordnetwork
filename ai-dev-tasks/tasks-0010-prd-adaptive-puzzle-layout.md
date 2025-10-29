# PRD: Adaptive Puzzle Layout & Enhanced Communication System

## Executive Summary

This PRD outlines the development of an adaptive, device-aware puzzle interface with comprehensive communication between the puzzle iframe and parent application. The system will automatically adjust layouts based on device type (desktop/mobile) and gameplay mode (single/multiplayer), while implementing robust auto-save, state management, and real-time feedback systems.

## Current State Analysis

### Existing Features
- Basic puzzle rendering in iframe
- Fixed right-sidebar layout
- Manual save on puzzle completion
- Basic postMessage communication
- Limited responsive design

### Current Limitations
- Cramped sidebar with too many elements
- No device-specific layouts
- No mode-specific layouts (single vs multiplayer)
- Inconsistent auto-save behavior
- Limited iframe ↔ parent communication
- Inner scrolling in iframe
- Clues displayed inside iframe (not optimized)

## Product Requirements

### 1. Adaptive Layout System

#### 1.1 Layout Detection & Selection

**Device Detection:**
```typescript
const isMobile = window.innerWidth < 768; // Tailwind 'md' breakpoint
const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
const isDesktop = window.innerWidth >= 1024;
```

**Mode Detection:**
```typescript
const isMultiplayer = room.participants.length > 1;
const isSinglePlayer = !isMultiplayer;
```

**Layout Matrix:**

| Device | Mode | Layout |
|--------|------|--------|
| Desktop | Multiplayer | 3-Column: Clues (25%) │ Puzzle (50%) │ Social (25%) |
| Desktop | Single | 2-Column: Clues (30%) │ Puzzle (70%) |
| Mobile | Multiplayer | Stacked: Puzzle → Tabs (Clues │ Chat │ Info) |
| Mobile | Single | Stacked: Puzzle → Tabs (Across │ Down) |

#### 1.2 Desktop Multiplayer Layout (25-50-25)

```
┌─────────────────────────────────────────────────────────┐
│ Header: Room Name │ Status │ Save Indicator │ Controls │
├──────────────┬──────────────────────┬───────────────────┤
│              │                      │                   │
│   CLUES      │      PUZZLE         │   MULTIPLAYER     │
│   (Sticky)   │    (No Scroll)      │     PANEL         │
│              │                      │                   │
│ [🔽 Across]  │  [Crossword Grid]   │ 👥 Participants   │
│  1. Clue...  │                     │  • User 1 (Host)  │
│  2. Clue...  │   ✓ Auto-sizing     │  • User 2         │
│  3. Clue...  │   ✓ Live feedback   │  • User 3         │
│              │   ✓ No scrollbar    │                   │
│ [🔽 Down]    │                     │ 💬 Chat           │
│  1. Clue...  │                     │  Message...       │
│  2. Clue...  │                     │  Message...       │
│              │                     │                   │
│ 🎯 Hints ▼   │                     │ ⚙️ Host Controls  │
│              │                     │  [Start Game]     │
│ ↕ Scroll     │                     │  ↕ Scroll         │
└──────────────┴──────────────────────┴───────────────────┘
```

**Key Features:**
- Clues panel: Independently scrollable, sticky headers
- Puzzle: Centered, no scrolling, optimal sizing
- Multiplayer panel: Participants + Chat + Host tools
- Hints: Dropdown menu in clues panel header

#### 1.3 Desktop Single Player Layout (30-70)

```
┌─────────────────────────────────────────────────────────┐
│ Header: Puzzle Name │ Progress 45% │ Timer │ 💾 Saved  │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│   CLUES      │              PUZZLE                      │
│   (Sticky)   │            (No Scroll)                   │
│              │                                          │
│ [🔽 Across]  │        [Crossword Grid]                  │
│  1. Clue...  │                                          │
│  2. Clue...  │         ✓ Auto-sizing                    │
│  3. Clue...  │         ✓ Live feedback                  │
│  4. Clue...  │         ✓ Auto-advance                   │
│              │         ✓ No scrollbar                   │
│ [🔽 Down]    │                                          │
│  1. Clue...  │                                          │
│  2. Clue...  │                                          │
│  3. Clue...  │                                          │
│              │                                          │
│ 🎯 Hints ▼   │      [💡 Hint FAB - Bottom Right]       │
│  • Letter    │                                          │
│  • Word      │                                          │
│  • Enhanced  │                                          │
│              │                                          │
│ ↕ Scroll     │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Key Features:**
- More space for puzzle (70%)
- No multiplayer clutter
- Hints as collapsible menu or floating action button
- Progress indicator in header

#### 1.4 Mobile Multiplayer Layout

```
┌────────────────────────────┐
│ ☰ Room │ 🟢 Online │ Leave│
├────────────────────────────┤
│                            │
│        PUZZLE              │
│      (Responsive)          │
│                            │
│   [Crossword Grid]         │
│                            │
│    ✓ Touch optimized       │
│    ✓ Auto-sizing           │
│    ✓ No scroll             │
│                            │
├────────────────────────────┤
│ [Clues] [Chat] [Players]  │← Tabs
├────────────────────────────┤
│                            │
│  Tab Content:              │
│                            │
│  Clues Tab:                │
│  🔽 Across                 │
│   1. Clue text...          │
│   2. Clue text...          │
│  🔽 Down                   │
│   1. Clue text...          │
│                            │
│  Chat Tab:                 │
│   💬 Message...            │
│   💬 Message...            │
│   [Send] button            │
│                            │
│  Players Tab:              │
│   👥 User 1 (Host)         │
│   👥 User 2                │
│                            │
│  ↕ Scrollable              │
├────────────────────────────┤
│ [💡 Hints]  [⚙️ Settings] │
└────────────────────────────┘
```

**Key Features:**
- Puzzle always visible at top
- Swipeable tabs for content
- Bottom navigation for hints/settings
- Touch-friendly tap targets

#### 1.5 Mobile Single Player Layout

```
┌────────────────────────────┐
│ ← Back │ Progress: 45% │ ⋮│
├────────────────────────────┤
│                            │
│        PUZZLE              │
│      (Responsive)          │
│                            │
│   [Crossword Grid]         │
│                            │
│    ✓ Touch optimized       │
│    ✓ Auto-sizing           │
│    ✓ No scroll             │
│                            │
├────────────────────────────┤
│    [Across] [Down]        │← Simple Tabs
├────────────────────────────┤
│                            │
│  Clue List:                │
│                            │
│  1. First clue text goes   │
│     here with full text... │
│                            │
│  2. Second clue text...    │
│                            │
│  3. Third clue text...     │
│                            │
│                            │
│  ↕ Scrollable              │
│                            │
├────────────────────────────┤
│      [💡 Need a Hint?]    │← FAB
└────────────────────────────┘
```

**Key Features:**
- Simplified two-tab interface
- One-handed operation
- Larger tap targets
- Hint button always accessible

### 2. Enhanced Communication System

#### 2.1 Iframe → Parent Events

**Progress Events:**
```typescript
interface ProgressEvent {
  type: 'progress';
  puzzleId: number;
  data: {
    gridState: Record<string, string>; // cellId → value
    progress: number;                   // 0-100
    filledCells: number;
    totalCells: number;
    hintsUsed: number;
  };
  timestamp: number;
}
```

**Completion Event:**
```typescript
interface CompletionEvent {
  type: 'complete';
  puzzleId: number;
  data: {
    completionTime: number; // seconds
    score: number;
    hintsUsed: number;
    accuracy: number;       // percentage
  };
  timestamp: number;
}
```

**Validation Events:**
```typescript
interface ValidationEvent {
  type: 'letter_validated';
  puzzleId: number;
  data: {
    cellId: string;
    isCorrect: boolean;
    wordIndex: number;
    accuracy: number; // running accuracy
  };
  timestamp: number;
}

interface SuggestHintEvent {
  type: 'suggest_hint';
  puzzleId: number;
  data: {
    wordIndex: number;
    errorCount: number;
    message: string; // "After 3 errors, consider using a hint"
  };
  timestamp: number;
}
```

**Dimension Event:**
```typescript
interface DimensionEvent {
  type: 'dimensions';
  puzzleId: number;
  data: {
    gridWidth: number;
    gridHeight: number;
    cellSize: number;
    totalWidth: number;
    totalHeight: number;
  };
  timestamp: number;
}
```

**State Loaded Confirmation:**
```typescript
interface StateLoadedEvent {
  type: 'STATE_LOADED';
  source: 'iframe';
  loadedCount: number;
  totalCells: number;
  timestamp: number;
}
```

#### 2.2 Parent → Iframe Commands

**State Management:**
```typescript
// Request current state
window.postMessage({
  source: 'parent',
  type: 'GET_STATE',
  puzzleId: number
}, origin);

// Load saved state
window.postMessage({
  source: 'parent',
  type: 'LOAD_STATE',
  puzzleId: number,
  data: {
    gridState: Record<string, string>
  }
}, origin);
```

**Hint Commands:**
```typescript
// Reveal single letter
window.postMessage({
  source: 'parent',
  type: 'reveal_letter',
  puzzleId: number,
  wordIndex?: number // current word if omitted
}, origin);

// Reveal entire word
window.postMessage({
  source: 'parent',
  type: 'reveal_word',
  puzzleId: number,
  wordIndex?: number
}, origin);
```

### 3. Auto-Save System

#### 3.1 Auto-Save Triggers

**Time-Based:**
- Auto-save every 30 seconds
- Only if changes detected since last save

**Event-Based:**
- After each cell update (debounced 150ms)
- On word completion
- On hint usage
- On blur/minimize

**Manual:**
- User clicks save button
- Before navigation away
- On puzzle completion

#### 3.2 Auto-Save Implementation

```typescript
interface AutoSaveState {
  puzzleId: number;
  roomCode?: string;      // For multiplayer
  gridState: Record<string, string>;
  progress: number;
  hintsUsed: number;
  lastSaved: Date;
  saveStatus: 'saving' | 'saved' | 'error';
}

// Auto-save hook
const useAutoSave = (puzzleId: number, roomCode?: string) => {
  const [saveState, setSaveState] = useState<AutoSaveState>();
  const debouncedSave = useDebouncedCallback(saveToServer, 150);
  
  // Trigger save on state change
  useEffect(() => {
    if (gridState changed) {
      debouncedSave(gridState);
    }
  }, [gridState]);
  
  return saveState;
};
```

**Visual Indicators:**
- 💾 "Saving..." → Spinner animation
- ✓ "Saved at 3:45 PM" → Success checkmark
- ⚠️ "Failed to save" → Retry button

#### 3.3 Save Locations

**Single Player:**
- Database: `UserProgress` table
- Local Storage: Backup for offline resilience

**Multiplayer:**
- Database: `MultiplayerRoom.gridState` field
- Socket.IO: Real-time sync to all participants
- Debounced to prevent spam (150ms)

### 4. Built-in Features (Already Implemented)

#### 4.1 Auto-Advance
**Status:** ✅ Implemented (bridge.js lines 473-504)
- Automatically moves to next cell after correct letter
- Respects word direction (across/down)
- Selects text in next cell
- Smart navigation at word boundaries

#### 4.2 Live Validation
**Status:** ✅ Implemented (bridge.js lines 826-877)
- Real-time correct/incorrect feedback
- Green background for correct letters
- Red background for incorrect letters
- Accuracy tracking per attempt
- Suggests hints after 3 errors

#### 4.3 Auto-Sizing
**Status:** ✅ Implemented (bridge.js lines 650-746)
- Calculates optimal cell size for viewport
- Responsive to window resize
- Respects min/max cell sizes
- Measures actual rendered height
- Sends dimensions to parent

#### 4.4 Responsive Layout
**Status:** ✅ Implemented (bridge.js lines 240-277)
- Mobile/desktop detection
- Adaptive panel positioning
- Currently: hides clues in iframe (our new enhancement)

#### 4.5 Visual Feedback
**Status:** ✅ Implemented
- Color-coded cells (green/red)
- Flash animation on remote updates
- Hover effects on clues
- Loading states

### 5. Enhanced Visual Features

#### 5.1 Clue Panel Styling

**Desktop Clues:**
```tsx
<div className="clue-item hover:bg-blue-50 dark:hover:bg-blue-900/20 
                transition-colors cursor-pointer p-2 rounded
                border-l-2 border-transparent hover:border-blue-500">
  <span className="font-bold text-blue-600 min-w-[2rem]">1.</span>
  <span className="ml-2">Clue text goes here</span>
</div>
```

**Features:**
- Sticky section headers (Across/Down)
- Hover highlights
- Active clue highlighting (when implemented)
- Dark mode support
- Full-height scrolling with custom scrollbar

#### 5.2 Save Indicator

**Header Component:**
```tsx
<div className="flex items-center gap-2">
  {saveState.status === 'saving' && (
    <>
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm text-muted-foreground">Saving...</span>
    </>
  )}
  {saveState.status === 'saved' && (
    <>
      <Check className="h-4 w-4 text-green-600" />
      <span className="text-sm text-green-600">
        Saved {formatDistanceToNow(saveState.lastSaved)} ago
      </span>
    </>
  )}
  {saveState.status === 'error' && (
    <>
      <AlertCircle className="h-4 w-4 text-red-600" />
      <Button size="sm" variant="ghost" onClick={retrySave}>
        Retry Save
      </Button>
    </>
  )}
</div>
```

#### 5.3 Progress Indicator

**Header Bar:**
```tsx
<div className="flex items-center gap-4">
  <span className="text-sm font-medium">Progress:</span>
  <Progress value={progress} className="w-32" />
  <span className="text-sm text-muted-foreground">{progress}%</span>
  <span className="text-sm text-muted-foreground">
    {filledCells}/{totalCells} cells
  </span>
</div>
```

#### 5.4 Hint UI Enhancement

**Dropdown Menu (Desktop):**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">
      <Lightbulb className="h-4 w-4 mr-2" />
      Hints
      <ChevronDown className="h-4 w-4 ml-2" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-56">
    <DropdownMenuItem onClick={() => useHint('LETTER')}>
      <span className="font-medium">Letter Hint</span>
      <span className="ml-auto text-xs text-muted-foreground">5 pts</span>
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => useHint('WORD')}>
      <span className="font-medium">Word Hint</span>
      <span className="ml-auto text-xs text-muted-foreground">15 pts</span>
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => useHint('DEFINITION')}>
      <span className="font-medium">Enhanced Clue</span>
      <span className="ml-auto text-xs text-muted-foreground">3 pts</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Floating Action Button (Mobile):**
```tsx
<button className="fixed bottom-20 right-4 z-50
                   bg-primary text-primary-foreground
                   rounded-full p-4 shadow-lg
                   hover:scale-110 transition-transform">
  <Lightbulb className="h-6 w-6" />
</button>
```

## Technical Implementation

### 6. Component Architecture

#### 6.1 Shared Components

```tsx
// Shared across all layouts
- <CluesPanel />        // Displays across/down clues
- <PuzzleArea />        // Iframe wrapper with sizing
- <HintsMenu />         // Hints dropdown or FAB
- <SaveIndicator />     // Auto-save status
- <ProgressBar />       // Completion progress

// Multiplayer-only
- <ParticipantsList />
- <ChatPanel />
- <HostControls />
- <CursorOverlay />
```

#### 6.2 Layout Containers

```tsx
// Desktop Multiplayer
<div className="grid grid-cols-12 gap-4">
  <aside className="col-span-3"><CluesPanel /></aside>
  <main className="col-span-6"><PuzzleArea /></main>
  <aside className="col-span-3">
    <ParticipantsList />
    <ChatPanel />
    <HostControls />
  </aside>
</div>

// Desktop Single
<div className="grid grid-cols-12 gap-4">
  <aside className="col-span-4"><CluesPanel /></aside>
  <main className="col-span-8"><PuzzleArea /></main>
</div>

// Mobile (both modes)
<div className="flex flex-col h-screen">
  <header className="flex-shrink-0">Header</header>
  <main className="flex-shrink-0"><PuzzleArea /></main>
  <div className="flex-1 overflow-hidden">
    <Tabs>{/* Content tabs */}</Tabs>
  </div>
</div>
```

#### 6.3 Responsive Utilities

```tsx
const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 768) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else setDeviceType('desktop');
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return deviceType;
};

const useGameMode = (room: Room) => {
  return room.participants.length > 1 ? 'multiplayer' : 'single';
};
```

### 7. API Endpoints

#### 7.1 Auto-Save Endpoints

```
POST /api/puzzles/[id]/save
Body: { gridState, progress, hintsUsed }
Response: { success: true, savedAt: Date }

POST /api/multiplayer/rooms/[roomCode]/save
Body: { gridState, progress }
Response: { success: true, savedAt: Date, participantCount: number }

GET /api/puzzles/[id]/progress
Response: { gridState, progress, hintsUsed, lastSaved: Date }
```

#### 7.2 State Management Endpoints

```
GET /api/multiplayer/rooms/[roomCode]/state
Response: { gridState, participants, lastUpdated: Date }

POST /api/multiplayer/rooms/[roomCode]/restore
Body: { timestamp }
Response: { gridState, version: number }
```

### 8. Database Schema

#### 8.1 UserProgress Enhancement

```prisma
model UserProgress {
  id                    String    @id @default(cuid())
  userId                String
  puzzleId              Int
  completedCells        String?   @db.Text // JSON: gridState
  hintsUsed             Int       @default(0)
  isCompleted           Boolean   @default(false)
  lastPlayedAt          DateTime  @default(now())
  completedAt           DateTime?
  completionTimeSeconds Int?
  score                 Int       @default(0)
  startedAt             DateTime  @default(now())
  
  // Enhanced fields
  accuracy              Float?    @default(100.0) // Percentage
  autoSaveCount         Int       @default(0)     // Number of auto-saves
  lastAutoSave          DateTime? // Last auto-save time
  saveHistory           String?   @db.Text        // JSON array of save timestamps
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, puzzleId])
  @@index([lastPlayedAt])
  @@index([lastAutoSave])
  @@map("user_progress")
}
```

#### 8.2 MultiplayerRoom Enhancement

```prisma
model MultiplayerRoom {
  id              String     @id @default(cuid())
  roomCode        String     @unique @db.Char(6)
  gridState       String?    @db.Text // JSON: shared grid state
  lastActivityAt  DateTime   @default(now())
  
  // Enhanced fields
  lastSyncedAt    DateTime?  // Last successful sync
  autoSaveEnabled Boolean    @default(true)
  saveInterval    Int        @default(30) // Seconds
  
  @@index([lastActivityAt])
  @@index([lastSyncedAt])
  @@map("multiplayer_rooms")
}
```

## Success Metrics

### 9. Key Performance Indicators

#### 9.1 Performance Metrics
- **Layout Switch Time**: < 100ms between device/mode changes
- **Auto-Save Latency**: < 200ms from cell update to save
- **Iframe Load Time**: < 1 second
- **State Restoration**: < 500ms to load saved state
- **Message Latency**: < 50ms for iframe ↔ parent communication

#### 9.2 User Experience Metrics
- **Completion Rate**: > 80% of started puzzles
- **Save Failure Rate**: < 0.1% of auto-save attempts
- **Layout Satisfaction**: > 90% positive feedback
- **Mobile Usability**: > 85% task completion on mobile
- **Multiplayer Sync**: 100% state consistency

#### 9.3 Technical Metrics
- **Memory Usage**: < 100MB for typical puzzle
- **CPU Usage**: < 5% during idle
- **Network Bandwidth**: < 1KB per state sync
- **State Conflicts**: < 0.01% of multiplayer updates

## Implementation Timeline

### 10. Development Phases

#### Phase 1: Layout System (1 week)
- [ ] Implement device detection
- [ ] Create layout container components
- [ ] Build responsive grid system
- [ ] Add mode switching logic
- [ ] Hide iframe clue panels
- [ ] Test layout switching

#### Phase 2: Enhanced Communication (1 week)
- [ ] Implement all iframe → parent events
- [ ] Implement all parent → iframe commands
- [ ] Add message validation and error handling
- [ ] Create event logging system
- [ ] Test message reliability
- [ ] Add fallback mechanisms

#### Phase 3: Auto-Save System (1 week)
- [ ] Build auto-save hook
- [ ] Implement debouncing logic
- [ ] Add save indicators
- [ ] Create retry mechanism
- [ ] Test save reliability
- [ ] Add offline support

#### Phase 4: Visual Enhancements (1 week)
- [ ] Style clue panels
- [ ] Add progress indicators
- [ ] Enhance hint UI
- [ ] Add animations and transitions
- [ ] Implement dark mode
- [ ] Polish mobile experience

#### Phase 5: Testing & Optimization (1 week)
- [ ] Cross-browser testing
- [ ] Mobile device testing
- [ ] Performance optimization
- [ ] A/B testing layouts
- [ ] User feedback collection
- [ ] Bug fixes and refinements

## Acceptance Criteria

### 11. Functional Requirements

#### 11.1 Layout System
- [ ] Layout automatically switches based on device width
- [ ] Layout automatically switches based on player count
- [ ] All layouts are fully functional and responsive
- [ ] No horizontal scrolling on any device
- [ ] Puzzle iframe has no internal scrolling
- [ ] All panels scroll independently

#### 11.2 Communication System
- [ ] All iframe → parent events are captured
- [ ] All parent → iframe commands work reliably
- [ ] Event validation prevents malformed messages
- [ ] State loading confirmation received
- [ ] No message loss or duplication
- [ ] Origin validation enforced

#### 11.3 Auto-Save System
- [ ] Auto-save triggers every 30 seconds
- [ ] Save indicator shows current status
- [ ] Failed saves trigger retry mechanism
- [ ] State persists across page reloads
- [ ] Multiplayer sync maintains consistency
- [ ] Offline changes queued for sync

#### 11.4 Visual Requirements
- [ ] Clues styled with hover effects
- [ ] Progress bar shows accurate percentage
- [ ] Save indicator updates in real-time
- [ ] Hints accessible on all layouts
- [ ] Dark mode works correctly
- [ ] Animations are smooth (60fps)

### 12. Non-Functional Requirements

#### 12.1 Performance
- [ ] Layout switch < 100ms
- [ ] Auto-save < 200ms
- [ ] State load < 500ms
- [ ] Message latency < 50ms
- [ ] Memory < 100MB

#### 12.2 Reliability
- [ ] 99.9% auto-save success rate
- [ ] 100% state consistency in multiplayer
- [ ] Zero data loss events
- [ ] Graceful degradation on errors

#### 12.3 Usability
- [ ] Intuitive navigation on all devices
- [ ] Accessible keyboard controls
- [ ] Screen reader compatible
- [ ] Touch-friendly on mobile
- [ ] No learning curve for new layouts

## Risk Assessment

### 13. Potential Risks

#### 13.1 Technical Risks
- **Layout Shifts**: Unexpected layout changes during gameplay
- **State Conflicts**: Race conditions in multiplayer saves
- **Message Loss**: Communication failures between iframe and parent
- **Performance**: Excessive re-renders on state updates

#### 13.2 Mitigation Strategies
- **Layout Stability**: Use CSS containment and will-change
- **Conflict Resolution**: Implement last-write-wins with timestamps
- **Message Reliability**: Add acknowledgment and retry logic
- **Performance**: Memoization, debouncing, and virtualization

## Testing & Tooling Requirements

### 14. Testing Strategy

#### 14.1 Jest Framework Testing

**Unit Tests:**
```typescript
// Component tests
import { render, screen } from '@testing-library/react';
import { CluesPanel } from '@/components/CluesPanel';

describe('CluesPanel', () => {
  it('renders across and down clues', () => {
    const clues = { across: [...], down: [...] };
    render(<CluesPanel clues={clues} />);
    expect(screen.getByText('Across')).toBeInTheDocument();
  });
});
```

**Integration Tests:**
```typescript
// Layout switching tests
import { useDeviceType, useGameMode } from '@/hooks/useLayoutDetection';

describe('Adaptive Layout', () => {
  it('switches to mobile layout when width < 768px', () => {
    global.innerWidth = 500;
    const { result } = renderHook(() => useDeviceType());
    expect(result.current).toBe('mobile');
  });
});
```

**Auto-Save Tests:**
```typescript
import { useAutoSave } from '@/hooks/useAutoSave';

describe('Auto-Save System', () => {
  it('debounces save calls within 150ms', async () => {
    const mockSave = jest.fn();
    const { result } = renderHook(() => useAutoSave(1, mockSave));
    
    act(() => result.current.save());
    act(() => result.current.save());
    
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  });
});
```

#### 14.2 Chrome DevTools Testing

**Performance Profiling:**
- Use Performance tab to measure layout shift times
- Record auto-save latency with Network throttling
- Measure iframe ↔ parent message latency
- Check memory usage during long sessions

**Device Emulation:**
```javascript
// Test responsive layouts in DevTools
// Mobile: iPhone 12 (390x844)
// Tablet: iPad (768x1024)
// Desktop: 1920x1080
```

**Network Testing:**
- Throttle to Slow 3G to test auto-save resilience
- Offline mode to test queue mechanism
- Monitor WebSocket connections in multiplayer

**Console Monitoring:**
```typescript
// Monitor postMessage communication
window.addEventListener('message', (event) => {
  console.log('[DevTools] Message:', event.data);
});
```

#### 14.3 TypeScript Documentation Access

**Using HTTP Fetch MCP Tool:**
```typescript
// Fetch TypeScript docs for specific APIs
const docs = await fetch('https://www.typescriptlang.org/docs/handbook/...');

// Reference for:
// - useEffect hooks for layout detection
// - postMessage API typing
// - Event handler types
// - React.memo for performance
```

**Key TypeScript Patterns:**
- Strict typing for postMessage events
- Discriminated unions for layout types
- Type guards for device detection
- Generic hooks for reusability

#### 14.4 MariaDB Testing

**Using MariaDB MCP Tool:**
```sql
-- Test auto-save performance
EXPLAIN SELECT * FROM user_progress 
WHERE userId = ? AND puzzleId = ?;

-- Verify indexes
SHOW INDEX FROM user_progress;
SHOW INDEX FROM multiplayer_rooms;

-- Test concurrent updates (multiplayer)
START TRANSACTION;
UPDATE multiplayer_rooms 
SET gridState = ?, lastSyncedAt = NOW() 
WHERE roomCode = ?;
COMMIT;

-- Monitor save history
SELECT 
  userId,
  puzzleId,
  autoSaveCount,
  lastAutoSave,
  TIMESTAMPDIFF(SECOND, lastPlayedAt, lastAutoSave) as save_delay
FROM user_progress
WHERE lastAutoSave > DATE_SUB(NOW(), INTERVAL 1 HOUR);
```

**Database Testing Checklist:**
- [ ] Verify save query performance (< 200ms)
- [ ] Test concurrent update handling
- [ ] Validate index usage with EXPLAIN
- [ ] Test save history JSON parsing
- [ ] Verify transaction isolation

### 15. Development Tools Setup

#### 15.1 Required MCP Tools

**HTTP Fetch Tool:**
- Access TypeScript documentation
- Fetch React hooks best practices
- Reference postMessage API specs

**MariaDB Tool:**
- Query performance analysis
- Database schema validation
- Save operation monitoring

**Browser Tool:**
- Chrome DevTools automation
- Screenshot capture for visual regression
- Network condition simulation

#### 15.2 Test Environment

```bash
# Jest configuration
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev jest-environment-jsdom

# Run tests
npx jest                    # All tests
npx jest --watch            # Watch mode
npx jest CluesPanel.test.tsx # Specific test
npx jest --coverage         # Coverage report
```

**Test Files Structure:**
```
src/
├── components/
│   ├── CluesPanel.tsx
│   ├── CluesPanel.test.tsx
│   ├── PuzzleArea.tsx
│   └── PuzzleArea.test.tsx
├── hooks/
│   ├── useAutoSave.ts
│   ├── useAutoSave.test.ts
│   ├── useDeviceType.ts
│   └── useDeviceType.test.ts
└── lib/
    ├── layoutDetection.ts
    └── layoutDetection.test.ts
```

#### 15.3 Documentation References

**TypeScript Docs (via HTTP Fetch):**
- https://www.typescriptlang.org/docs/handbook/react.html
- https://www.typescriptlang.org/docs/handbook/utility-types.html
- https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage

**Testing Resources:**
- Jest: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/docs/react-testing-library/intro
- Chrome DevTools Protocol: https://chromedevtools.github.io/devtools-protocol/

## Conclusion

This adaptive puzzle layout and communication system will provide Crossword.Network with a best-in-class solving experience across all devices and gameplay modes. The implementation prioritizes performance, reliability, and user experience while maintaining clean architecture and maintainable code.

The phased approach allows for iterative testing and refinement, ensuring each component works flawlessly before integration. Success metrics will guide optimization efforts and validate that the system meets user needs effectively.

**Testing Strategy:** Comprehensive unit tests with Jest, integration testing with React Testing Library, performance profiling with Chrome DevTools, and database optimization with MariaDB MCP tools ensure quality and reliability at every layer.
