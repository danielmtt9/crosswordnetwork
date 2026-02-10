# Quick Reference Guide
## Clue Highlight System

**TL;DR:** Hover over clues to highlight cells in the puzzle grid. Database-first loading with automatic fallback.

---

## 🚀 Quick Start

### Use the Clue Provider

```typescript
import { useClueProvider } from '@/hooks/useClueProvider';
import { useIframeBridge, useClueHighlight } from '@/lib/puzzleBridge';

function PuzzlePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Load clues (database-first)
  const { clues, isLoading, source } = useClueProvider({
    puzzleId: puzzle.id,
    iframeRef,
    debug: true,
  });
  
  // Setup iframe bridge
  const bridge = useIframeBridge({ iframeRef, debug: true });
  
  // Setup hover highlights
  const { handleClueHover, handleClueClick } = useClueHighlight({
    bridge,
    acrossClues: clues.across,
    downClues: clues.down,
  });
  
  return (
    <>
      <PuzzleArea puzzleUrl={puzzle.file_path} iframeRef={iframeRef} />
      <CluesPanel
        acrossClues={clues.across}
        downClues={clues.down}
        onClueHover={handleClueHover}
        onClueClick={handleClueClick}
      />
    </>
  );
}
```

---

## 📦 Available Hooks

### `useClueProvider`

Database-first clue loading with iframe fallback.

```typescript
const {
  clues,      // { across: Clue[], down: Clue[] }
  isLoading,  // boolean
  error,      // string | null
  source,     // 'database' | 'iframe' | 'none'
  refetch,    // () => Promise<void>
} = useClueProvider({
  puzzleId: number | string,
  iframeRef: React.RefObject<HTMLIFrameElement>,
  enableFallback?: boolean,     // default: true
  enablePersistence?: boolean,  // default: true
  debug?: boolean,              // default: false
});
```

### `useClueHighlight`

Bridges clue hover events to iframe highlights.

```typescript
const {
  handleClueHover,  // (clue | null) => void
  handleClueClick,  // (clue) => void
} = useClueHighlight({
  bridge: IframeBridge,
  acrossClues: Clue[],
  downClues: Clue[],
  debug?: boolean,
});
```

### `useIframeBridge`

Type-safe iframe communication.

```typescript
const bridge = useIframeBridge({
  iframeRef: React.RefObject<HTMLIFrameElement>,
  channelId?: string,
  debug?: boolean,
  onReady?: () => void,
  onError?: (error: Error) => void,
});

// Send messages
bridge.send({
  type: 'HIGHLIGHT_CELLS',
  payload: { cells, direction },
});

// Listen for messages
useEffect(() => {
  return bridge.on('PROGRESS_UPDATE', (msg) => {
    console.log(msg.payload);
  });
}, [bridge]);
```

---

## 🗂️ Data Types

### Clue

```typescript
interface Clue {
  number: number;
  text: string;
  length?: number;
  cells?: Array<{ row: number; col: number }>;
}
```

### CluesData

```typescript
interface CluesData {
  across: Clue[];
  down: Clue[];
}
```

---

## 🎨 Styling

### CSS Variables

```css
--cw-highlight-across: rgba(59, 130, 246, 0.15);  /* Blue */
--cw-highlight-down: rgba(168, 85, 247, 0.15);    /* Purple */
--cw-focus-ring: #2563eb;
```

### Custom Colors

```typescript
// In PuzzleArea or via CSS injection
const customColors = {
  '--cw-highlight-across': 'rgba(255, 0, 0, 0.2)',
  '--cw-highlight-down': 'rgba(0, 255, 0, 0.2)',
};
```

---

## 🐛 Debugging

### Enable Debug Mode

```typescript
const { clues, source } = useClueProvider({
  puzzleId,
  iframeRef,
  debug: true, // ← Enable logging
});
```

### Console Output

```
[ClueProvider] Fetching clues from database for puzzle 123...
[ClueProvider] ✓ Loaded from database: 23 across, 25 down (with cell coordinates)
```

### Check Clue Source

```typescript
if (source === 'database') {
  console.log('Using cached clues'); // Fast!
} else if (source === 'iframe') {
  console.log('Extracted from iframe'); // Slower, but working
} else {
  console.error('No clues available'); // Problem!
}
```

### Manual Testing

```javascript
// In browser console (inside iframe):
window.CrosswordBridge.highlightCells([
  { row: 0, col: 0 },
  { row: 0, col: 1 },
], 'across');

window.CrosswordBridge.clearHighlights();
```

---

## 🔧 Common Tasks

### Add Cell Coordinates to Existing Puzzles

```bash
# Test first
npx tsx scripts/backfill-clue-cells.ts --dry-run --limit=5

# Run for all puzzles
npx tsx scripts/backfill-clue-cells.ts
```

### Force Clue Refresh

```typescript
const { refetch } = useClueProvider({ ... });

// Later...
await refetch(); // Clears cache and re-loads
```

### Persist Clues Manually

```typescript
const response = await fetch(`/api/puzzles/${puzzleId}/clues`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ clues }),
});
```

---

## ⚠️ Troubleshooting

### Highlights Don't Appear

**Check:**
1. Clues have `cells` array populated
2. Bridge script loaded (check console)
3. Cell selectors match puzzle HTML structure

**Fix:**
```typescript
// Verify clues have cells
console.log('First clue:', clues.across[0]);
// Should show: { number: 1, text: "...", cells: [...] }

// Check bridge
console.log('Bridge ready:', bridge.isReady);
console.log('Bridge in iframe:', window.CrosswordBridge);
```

### Clues Load Slowly

**Check source:**
```typescript
if (source === 'iframe') {
  // Run backfill script to populate database
  console.warn('Using slow iframe extraction');
}
```

**Fix:**
```bash
npx tsx scripts/backfill-clue-cells.ts
```

### Persistence Fails

**Check:**
- Database connection
- Puzzle exists
- Clues format is valid

```bash
# Test API directly
curl -X POST http://localhost:3004/api/puzzles/123/clues \
  -H "Content-Type: application/json" \
  -d '{"clues":{"across":[],"down":[]}}'
```

---

## 📊 Performance Tips

### Optimize Loading

```typescript
// Preload clues while puzzle loads
useEffect(() => {
  // Clues load automatically, just ensure iframe ready
  if (bridge.isReady) {
    console.log('Clues and bridge ready');
  }
}, [bridge.isReady]);
```

### Reduce Re-renders

```typescript
// Memoize handlers
const handleClueHover = useMemo(
  () => (clue) => { /* ... */ },
  [dependencies]
);
```

### Monitor Performance

```javascript
// In browser DevTools → Performance tab
performance.mark('clue-load-start');
// ... load clues ...
performance.mark('clue-load-end');
performance.measure('clue-load', 'clue-load-start', 'clue-load-end');
```

---

## 🔗 Related Documentation

- **[Integration Guide](./clue-highlight-integration-example.md)** - Detailed setup
- **[Testing Guide](./TESTING-CLUE-HIGHLIGHTS.md)** - Test procedures
- **[Session Summary](./SESSION-SUMMARY.md)** - Complete overview
- **[Scripts README](../scripts/README.md)** - Backfill script usage

---

## 💡 Best Practices

### ✅ DO

- Use `useClueProvider` for all clue loading
- Enable debug mode in development
- Run backfill script after clue extraction changes
- Check `source` to understand clue origin
- Use the provided hooks instead of custom logic

### ❌ DON'T

- Manually parse clues from iframe (use provider)
- Ignore `isLoading` state
- Skip validation of clue structure
- Hard-code cell coordinates
- Block UI while persisting clues (it's background)

---

## 🎯 Quick Commands

```bash
# Development
npm run dev

# Run backfill (dry run)
npx tsx scripts/backfill-clue-cells.ts --dry-run --limit=5

# Run backfill (live)
npx tsx scripts/backfill-clue-cells.ts

# Type check
npm run type-check

# Test (when available)
npm test
```

---

## 🆘 Getting Help

**Console Logs:**
- `[ClueProvider]` - Clue loading
- `[IframeBridge]` - Communication
- `[useClueHighlight]` - Hover interactions

**Enable All Debug Logs:**
```typescript
const debugMode = process.env.NODE_ENV === 'development';

useClueProvider({ ..., debug: debugMode });
useClueHighlight({ ..., debug: debugMode });
useIframeBridge({ ..., debug: debugMode });
```

**Check Status:**
```typescript
console.log({
  clues: clues.across.length + clues.down.length,
  source,
  isLoading,
  bridgeReady: bridge.isReady,
  hasCells: clues.across[0]?.cells !== undefined,
});
```

---

*For complete details, see [SESSION-SUMMARY.md](./SESSION-SUMMARY.md)*
