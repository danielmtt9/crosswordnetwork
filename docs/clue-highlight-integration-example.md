# Clue Highlight Integration Example

This document demonstrates how to integrate the clue hover highlight system into puzzle pages.

## Overview

The clue highlight system provides visual feedback when users hover over clues:
- Highlights corresponding cells in the puzzle grid
- Distinct colors for across (blue) and down (purple) clues
- Smooth transitions with requestAnimationFrame
- Works with existing iframe architecture

## Components Created

### 1. **CluesPanel** (Enhanced)
- Added `onClueHover` callback prop
- Throttled hover events (50ms) to prevent message flooding
- Safe defaults for clues arrays

### 2. **useClueHighlight** Hook
- Bridges CluesPanel events to iframe messages
- Manages clue-to-cell mapping
- Handles `HIGHLIGHT_CELLS` and `CLEAR_HIGHLIGHT` messages

### 3. **iframeHighlightHandler**
- Runs inside the puzzle iframe
- Finds cells using multiple selector strategies
- Applies smooth color transitions
- Manages highlight state

### 4. **iframe-bridge.js**
- Standalone script for legacy puzzle HTML files
- Handles all parent-to-iframe messages
- No external dependencies

## Integration Steps

### Step 1: Add useIframeBridge and useClueHighlight

```tsx
import { useIframeBridge, useClueHighlight } from '@/lib/puzzleBridge';

function PuzzlePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Initialize iframe bridge
  const bridge = useIframeBridge({
    iframeRef,
    debug: process.env.NODE_ENV === 'development',
    onReady: () => {
      console.log('Iframe ready for communication');
    },
  });
  
  // Initialize clue highlight system
  const { handleClueHover, handleClueClick } = useClueHighlight({
    bridge,
    acrossClues, // Your across clues with cell coordinates
    downClues,   // Your down clues with cell coordinates
    debug: process.env.NODE_ENV === 'development',
  });
  
  // ... rest of component
}
```

### Step 2: Update CluesPanel

```tsx
<CluesPanel
  acrossClues={clues.across}
  downClues={clues.down}
  onClueHover={handleClueHover}  // NEW: Add hover handler
  onClueClick={handleClueClick}  // NEW: Use centralized click handler
/>
```

### Step 3: Ensure Clues Have Cell Coordinates

The clues must include cell coordinate data:

```typescript
interface Clue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  answer: string;
  cells: Array<{ row: number; col: number }>;
}
```

If your clues don't have cells yet, extract them during clue parsing or puzzle upload.

## Full Example (puzzles/[id]/page.tsx)

```tsx
import { useIframeBridge, useClueHighlight } from '@/lib/puzzleBridge';

export default function PuzzlePage({ params }: PuzzlePageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [clues, setClues] = useState({ across: [], down: [] });
  
  // Initialize bridge
  const bridge = useIframeBridge({
    iframeRef,
    debug: process.env.NODE_ENV === 'development',
  });
  
  // Initialize highlight system
  const { handleClueHover, handleClueClick } = useClueHighlight({
    bridge,
    acrossClues: clues.across,
    downClues: clues.down,
  });
  
  return (
    <AdaptiveLayout
      puzzleArea={
        <PuzzleArea
          puzzleUrl={puzzle.file_path}
          iframeRef={iframeRef}
        />
      }
      cluesPanel={
        <CluesPanel
          acrossClues={clues.across}
          downClues={clues.down}
          onClueHover={handleClueHover}
          onClueClick={handleClueClick}
        />
      }
    />
  );
}
```

## How It Works

### Message Flow

1. **User hovers over clue** → CluesPanel fires `onClueHover`
2. **useClueHighlight** → Maps clue to cell coordinates
3. **useClueHighlight** → Sends `HIGHLIGHT_CELLS` message via bridge
4. **iframe-bridge.js** → Receives message in puzzle iframe
5. **iframe-bridge.js** → Finds cell elements, applies highlighting
6. **User moves mouse away** → `CLEAR_HIGHLIGHT` message sent
7. **iframe-bridge.js** → Removes highlights with smooth transition

### Cell Detection

The system tries multiple strategies to find cell elements:
1. `[data-row="X"][data-col="Y"]` - Primary selector
2. `[data-cell="X-Y"]` - Alternative format
3. `#cell-X-Y` - ID-based selector
4. Fallback: Search all `.cell` elements

### Styling

Highlights are applied via:
- **Inline styles** for immediate visual feedback
- **CSS classes** (data-highlighted attribute) for theming
- **CSS variables** for customization:
  - `--cw-highlight-across`: Across clue color
  - `--cw-highlight-down`: Down clue color
  - `--cw-focus-ring`: Focus outline color

### Performance

- **Throttled** hover events (50ms)
- **requestAnimationFrame** for smooth rendering
- **Minimal reflows** by batching DOM updates
- **Respects** `prefers-reduced-motion`

## Testing

### Manual Testing

1. **Hover Test**: Hover over clues, verify cells highlight
2. **Color Test**: Verify across (blue) vs down (purple) colors
3. **Clear Test**: Move mouse away, verify highlights clear
4. **Click Test**: Click clue, verify focus behavior
5. **Performance**: Rapidly hover multiple clues, verify no lag

### Browser DevTools

```javascript
// Check if bridge is initialized
window.CrosswordBridge

// Manually trigger highlight
window.CrosswordBridge.highlightCells([
  { row: 0, col: 0 },
  { row: 0, col: 1 },
], 'across');

// Clear highlights
window.CrosswordBridge.clearHighlights();
```

## Troubleshooting

### Highlights Don't Appear

1. Check iframe is loaded: Look for "Bridge script loaded" in console
2. Verify clues have `cells` array populated
3. Check cell selectors match your puzzle HTML structure
4. Enable debug mode to see message flow

### Cells Not Found

If cells aren't highlighting, the selectors may not match your puzzle structure.

**Solution**: Update `findCellElement` in `iframe-bridge.js`:

```javascript
function findCellElement(row, col) {
  // Add your puzzle's specific selectors
  const selectors = [
    `[data-row="${row}"][data-col="${col}"]`,
    `.cell-${row}-${col}`,  // Add custom selector
    // ... more selectors
  ];
  // ...
}
```

### Performance Issues

If highlighting feels sluggish:

1. Increase throttle interval in CluesPanel
2. Reduce transition duration in CSS
3. Check for heavy DOM manipulations during highlight

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires:
- `requestAnimationFrame`
- `postMessage` API
- CSS transitions
- Dataset API

## Accessibility

- Respects `prefers-reduced-motion`
- Focus indicators for keyboard navigation
- Screen reader friendly (aria labels preserved)

## Next Steps

1. **Add to multiplayer rooms** (room/[roomCode]/page.tsx)
2. **Add clue navigation** with arrow keys
3. **Add cell-to-clue reverse lookup** (click cell → highlight clue)
4. **Add animation system** for correct/incorrect feedback

## Related Files

- `src/components/puzzle/CluesPanel.tsx` - Enhanced clues panel
- `src/lib/puzzleBridge/useClueHighlight.ts` - React hook
- `src/lib/puzzleBridge/iframeHighlightHandler.ts` - Iframe-side logic
- `public/scripts/iframe-bridge.js` - Standalone iframe script
- `src/components/puzzle/PuzzleArea.tsx` - Injection point
