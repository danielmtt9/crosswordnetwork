# Puzzle Bridge Module

Type-safe, bidirectional communication layer between the parent page and puzzle iframe.

## Overview

The Puzzle Bridge provides a robust messaging protocol with:
- **Type Safety**: Discriminated unions and branded types
- **Reliability**: Message queuing until ready
- **Security**: Origin and channel validation
- **Debug Support**: Optional detailed logging
- **React Integration**: Hooks with proper lifecycle management

## Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│   Parent Page   │                    │  Puzzle Iframe  │
│                 │                    │                 │
│  useIframeBridge│◄──────────────────►│  (To be impl)   │
│                 │   postMessage      │                 │
│  - send()       │                    │                 │
│  - on()         │                    │                 │
│  - isReady      │                    │                 │
└─────────────────┘                    └─────────────────┘
```

## Message Types

### Parent → Iframe (10 types)
- `SET_PUZZLE_ID` - Initialize puzzle
- `INJECT_CSS` - Dynamic styling
- `SET_THEME` - Theme switching
- `GET_STATE` - Request current state
- `LOAD_STATE` - Restore saved state
- `REVEAL_LETTER` - Show letter hint
- `REVEAL_WORD` - Show word hint
- `FOCUS_CLUE` - Navigate to clue
- `HIGHLIGHT_CELLS` - Visual feedback
- `CLEAR_HIGHLIGHT` - Remove highlights

### Iframe → Parent (10 types)
- `IFRAME_READY` - Initial handshake
- `STATE_LOADED` - State restored
- `PROGRESS_UPDATE` - Progress tracking
- `PUZZLE_COMPLETE` - Completion event
- `HINT_USED` - Hint tracking
- `LETTER_VALIDATED` - Real-time validation
- `SUGGEST_HINT` - AI suggestions
- `DIMENSIONS_CHANGED` - Responsive updates
- `WORDLIST_AVAILABLE` - Clue data
- `WORD_REVEALED` - Reveal tracking

## Usage

### Basic Setup

```tsx
import { useIframeBridge, createPuzzleId } from '@/lib/puzzleBridge';

function PuzzleComponent({ puzzleId }: { puzzleId: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const bridge = useIframeBridge({
    iframeRef,
    debug: process.env.NODE_ENV === 'development',
    onReady: () => {
      console.log('Puzzle iframe ready!');
      // Send initial setup
      bridge.send({
        type: 'SET_PUZZLE_ID',
        payload: { puzzleId: createPuzzleId(puzzleId) }
      });
    },
    onError: (error) => {
      console.error('Bridge error:', error);
    }
  });

  return (
    <iframe 
      ref={iframeRef} 
      src={`/api/puzzles/${puzzleId}/content?mode=iframe`}
    />
  );
}
```

### Sending Messages

```tsx
// Type-safe message sending
bridge.send({
  type: 'SET_THEME',
  payload: {
    theme: 'dark',
    variables: {
      '--cw-cell-bg': '#1a1a1a',
      '--cw-cell-text': '#ffffff'
    }
  }
});

// Or use the convenience hook
const setTheme = useIframeBridgeSender(bridge, 'SET_THEME');
setTheme({
  theme: 'dark',
  variables: { /* ... */ }
});
```

### Receiving Messages

```tsx
// Manual listener
useEffect(() => {
  const unsubscribe = bridge.on('PROGRESS_UPDATE', (message) => {
    console.log('Progress:', message.payload.percentComplete);
    setProgress(message.payload.percentComplete);
  });
  
  return unsubscribe;
}, [bridge]);

// Or use the convenience hook
useIframeBridgeListener(
  bridge,
  'PROGRESS_UPDATE',
  (message) => {
    setProgress(message.payload.percentComplete);
  },
  [setProgress]
);
```

### State Management

```tsx
// Save state
const handleSave = useCallback(() => {
  bridge.send({
    type: 'GET_STATE',
    payload: {}
  });
}, [bridge]);

// Listen for state response
useIframeBridgeListener(
  bridge,
  'STATE_LOADED',
  (message) => {
    if (message.payload.success) {
      console.log('Cells filled:', message.payload.cellsFilled);
    }
  }
);

// Load saved state
const handleLoad = useCallback((gridState: Record<string, string>) => {
  bridge.send({
    type: 'LOAD_STATE',
    payload: {
      gridState,
      timestamp: Date.now()
    }
  });
}, [bridge]);
```

## Type Safety

The bridge uses TypeScript discriminated unions for exhaustive type checking:

```tsx
bridge.on('PROGRESS_UPDATE', (message) => {
  // TypeScript knows the exact payload shape
  const { totalCells, filledCells, percentComplete } = message.payload;
});
```

## Security

- **Origin Validation**: Only accepts messages from same origin
- **Channel ID**: Prevents cross-talk between multiple iframes
- **Version Check**: Ensures protocol compatibility
- **Message Structure**: Validates all required fields

## Performance

- **Message Queuing**: Prevents message loss before ready
- **Efficient Handlers**: Map-based handler registry
- **Automatic Cleanup**: Removes listeners on unmount
- **Minimal Re-renders**: Uses refs for stable values

## Debugging

Enable debug mode to see detailed logs:

```tsx
const bridge = useIframeBridge({
  iframeRef,
  debug: true, // Logs all messages
});
```

Logs format: `[IframeBridge:bridge-123456789] Message description`

## Next Steps

1. Implement iframe-side bridge handler
2. Add CSS injection manager
3. Integrate with puzzle components
4. Add unit tests

## Files

- `types.ts` - Type definitions (294 lines)
- `useIframeBridge.ts` - React hook (325 lines)
- `index.ts` - Module exports (64 lines)
- `README.md` - This file

## Testing

```bash
# Type check
npx tsc --noEmit src/lib/puzzleBridge/*.ts

# Run tests (when implemented)
npm test -- puzzleBridge
```

## License

Internal use - Crossword Network
